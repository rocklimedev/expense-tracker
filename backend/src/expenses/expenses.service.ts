import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, Transaction } from 'sequelize';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { User } from '../users/models/user.model';
import { Payment } from '../payments/models/payment.model';
import { ApprovalPoliciesService } from '../approvals/approval-policies.service';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { Expense } from './models/expense.model';
import { ExpenseHistory } from './models/expense-history.model';
import { ExpenseApproval, ApprovalStatus } from './models/expense-approval.model';
import { ALLOWED_TRANSITIONS, ExpenseStatus } from './expense-workflow';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';
import { Tracker } from '../trackers/models/tracker.model';

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const editDeadline = (expense: Expense) => new Date(expense.createdAt.getTime() + EDIT_WINDOW_MS);

function isEditable(expense: Expense, approvals: ExpenseApproval[]) {
  return expense.status === ExpenseStatus.DRAFT
    || expense.status === ExpenseStatus.REJECTED
    || (expense.status === ExpenseStatus.SUBMITTED
      && approvals.length > 0
      && approvals.every((step) => step.status === ApprovalStatus.PENDING));
}

const hasPermission = (actor: AuthUser, permission: string) =>
  (actor.permissions as string[]).includes(permission);

const errorMessage = (err: unknown) =>
  err instanceof HttpException ? err.message : 'Unexpected error';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectConnection() private sequelize: Sequelize,
    private readonly policies: ApprovalPoliciesService,
    private readonly categories: ExpenseCategoriesService,
  ) {}

  // ---------- Shared state-change helper ----------
  private async transition(
    expense: Expense,
    to: ExpenseStatus,
    actor: AuthUser,
    t: Transaction,
    changes: Record<string, unknown> = {},
    comment?: string,
  ) {
    const from = expense.status;
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(`Cannot move expense from ${from} to ${to}`);
    }
    await expense.update({ ...changes, status: to }, { transaction: t });
    await ExpenseHistory.create(
      { expenseId: expense.id, fromStatus: from, toStatus: to, actorId: actor.id, comment },
      { transaction: t },
    );
    return expense;
  }

  private async findLocked(id: string, t: Transaction) {
    const expense = await Expense.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  /**
   * Locks the expense, finds the step waiting for action, and checks that the actor
   * may act on it. Shared by approve() and reject().
   */
  private async loadCurrentStep(actor: AuthUser, id: string, t: Transaction) {
    const expense = await this.findLocked(id, t);

    if (expense.status !== ExpenseStatus.SUBMITTED) {
      throw new BadRequestException(`Expense is ${expense.status}, not awaiting approval`);
    }
    if (expense.employeeId === actor.id) {
      throw new ForbiddenException('You cannot act on your own expense');
    }

    const steps = await ExpenseApproval.findAll({
      where: { expenseId: id },
      order: [['stepOrder', 'ASC']],
      transaction: t,
    });

    const current = steps.find((s) => s.status === ApprovalStatus.PENDING);
    if (!current) throw new BadRequestException('No pending approval step');

    if (!hasPermission(actor, current.requiredPermission)) {
      throw new ForbiddenException(`This step requires: ${current.label}`);
    }

    // Segregation of duties: one person cannot approve two steps of the same claim
    const alreadyActed = steps.some(
      (s) => s.status === ApprovalStatus.APPROVED && s.actedById === actor.id,
    );
    if (alreadyActed) {
      throw new ForbiddenException('You already approved an earlier step of this expense');
    }

    return { expense, steps, current };
  }

  // ---------- Employee actions ----------
  async create(actor: AuthUser, dto: CreateExpenseDto) {
    const category = await this.categories.requireCode(dto.category);
    return Expense.create({ ...dto, category, employeeId: actor.id });
  }

  async createBatch(actor: AuthUser, expenses: CreateExpenseDto[]) {
    const categories = new Map<string, string>();
    for (const [index, expense] of expenses.entries()) {
      if (categories.has(expense.category)) continue;
      try {
        categories.set(expense.category, await this.categories.requireCode(expense.category));
      } catch (error) {
        if (!(error instanceof BadRequestException)) throw error;
        throw new BadRequestException(`Expense ${index + 1}: ${error.message}`);
      }
    }
    const created = await this.sequelize.transaction((transaction) =>
      Expense.bulkCreate(
        expenses.map((dto) => ({
          ...dto,
          category: categories.get(dto.category),
          employeeId: actor.id,
        })),
        { transaction },
      ),
    );
    return created.map(({ id }) => ({ id }));
  }

  async update(actor: AuthUser, id: string, dto: CreateExpenseDto) {
    return this.sequelize.transaction(async (transaction) => {
      const expense = await this.findLocked(id, transaction);
      if (expense.employeeId !== actor.id) throw new ForbiddenException('Only the expense owner can edit it');
      const assertWindowOpen = () => {
        if (Date.now() >= editDeadline(expense).getTime()) {
          throw new BadRequestException('The 15-minute edit window has closed.');
        }
      };
      assertWindowOpen();

      const approvals = expense.status === ExpenseStatus.SUBMITTED
        ? await ExpenseApproval.findAll({ where: { expenseId: id }, transaction })
        : [];
      if (!isEditable(expense, approvals)) {
        throw new BadRequestException('This expense is no longer editable in its approval workflow.');
      }

      const expenseDate = dto.expenseDate.slice(0, 10);
      if (expenseDate !== expense.expenseDate) {
        if (expense.scheduleId) throw new BadRequestException('The date of a recurring expense is fixed.');
        if (expense.trackerId) {
          const tracker = await Tracker.findByPk(expense.trackerId, { transaction });
          if (!tracker || expenseDate < tracker.startDate || (tracker.endDate && expenseDate > tracker.endDate)) {
            throw new BadRequestException('Select a date within the budget period.');
          }
        }
      }

      const category = await this.categories.requireCode(dto.category);
      if (expense.status === ExpenseStatus.SUBMITTED
        && (category !== expense.category || dto.amount !== Number(expense.amount))) {
        await this.replaceApprovalSteps(expense.id, dto.amount, category, transaction);
      }
      assertWindowOpen();
      await expense.update({
        category,
        amount: dto.amount,
        expenseDate,
        description: dto.description ?? null,
        toldBy: dto.toldBy ?? null,
        reason: dto.reason ?? null,
        paidTo: dto.paidTo ?? null,
      }, { transaction });
      await ExpenseHistory.create({
        expenseId: expense.id,
        fromStatus: expense.status,
        toStatus: expense.status,
        actorId: actor.id,
        comment: 'Expense details edited',
      }, { transaction });
      return { id: expense.id };
    });
  }

  async cancelReimbursement(actor: AuthUser, id: string, reason: string) {
    return this.sequelize.transaction(async (transaction) => {
      const expense = await this.findLocked(id, transaction);
      return this.transition(
        expense,
        ExpenseStatus.REIMBURSEMENT_CANCELLED,
        actor,
        transaction,
        { reimbursementCancellationReason: reason },
        reason,
      );
    });
  }

  /**
   * Resolves the approval chain and snapshots it into expense_approvals.
   * Later policy changes do not affect this expense. Resubmitting replaces the chain.
   */
  async submit(actor: AuthUser, id: string) {
    return this.sequelize.transaction(async (t) => {
      const expense = await this.findLocked(id, t);
      if (expense.employeeId !== actor.id) throw new ForbiddenException();

      await this.replaceApprovalSteps(expense.id, Number(expense.amount), expense.category, t);

      return this.transition(expense, ExpenseStatus.SUBMITTED, actor, t, {
        submittedAt: new Date(),
        rejectionReason: null,
        approvedById: null,
        approvedAt: null,
      });
    });
  }

  private async replaceApprovalSteps(expenseId: string, amount: number, category: string, transaction: Transaction) {
    const steps = await this.policies.resolveSteps(amount, category);
    await ExpenseApproval.destroy({ where: { expenseId }, transaction });
    await ExpenseApproval.bulkCreate(
      steps.map((step) => ({ ...step, expenseId, status: ApprovalStatus.PENDING })),
      { transaction },
    );
  }

  /** Same rules as submit(), applied per item. One failure does not stop the others. */
  async submitMany(actor: AuthUser, ids: string[]) {
    const result = {
      submitted: [] as string[],
      failed: [] as { id: string; error: string }[],
    };
    for (const id of ids) {
      try {
        await this.submit(actor, id);
        result.submitted.push(id);
      } catch (err) {
        result.failed.push({ id, error: errorMessage(err) });
      }
    }
    return result;
  }

  // ---------- Queries (scoped by permission) ----------
  approvedForMe(actor: AuthUser) {
    if (
      !hasPermission(actor, Permissions.EXPENSE_VIEW_OWN) &&
      !hasPermission(actor, Permissions.EXPENSE_VIEW_ALL)
    ) {
      throw new ForbiddenException('Your role does not have permission to view expenses');
    }

    return Expense.findAll({
      where: {
        employeeId: actor.id,
        status: {
          [Op.in]: [ExpenseStatus.APPROVED, ExpenseStatus.PARTIALLY_PAID, ExpenseStatus.PAID, ExpenseStatus.REIMBURSEMENT_CANCELLED],
        },
      },
      attributes: [
        'id',
        'category',
        'description',
        'expenseDate',
        'currency',
        'amount',
        'paidAmount',
        'status',
      ],
      include: [{ model: Payment, attributes: ['id', 'amount', 'paidOn', 'reference'] }],
      order: [
        ['expenseDate', 'DESC'],
        ['createdAt', 'DESC'],
        ['id', 'ASC'],
      ],
    });
  }

  async list(actor: AuthUser, filters: { status?: ExpenseStatus; employeeId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;

    if (hasPermission(actor, Permissions.EXPENSE_VIEW_ALL)) {
      if (filters.employeeId) where.employeeId = filters.employeeId;
    } else if (hasPermission(actor, Permissions.EXPENSE_VIEW_OWN)) {
      where.employeeId = actor.id;
    } else {
      throw new ForbiddenException();
    }

    return Expense.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['id', 'name'] }],
    });
  }

  async findOne(actor: AuthUser, id: string) {
    const expense = await Expense.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: ExpenseApproval, order: [['stepOrder', 'ASC']] },
        { model: ExpenseHistory, order: [['createdAt', 'ASC']] },
      ],
    });
    if (!expense) throw new NotFoundException('Expense not found');

    const canViewOwn =
      hasPermission(actor, Permissions.EXPENSE_VIEW_OWN) && expense.employeeId === actor.id;
    if (!hasPermission(actor, Permissions.EXPENSE_VIEW_ALL) && !canViewOwn) {
      throw new ForbiddenException();
    }
    const deadline = editDeadline(expense);
    const editableUntil = expense.employeeId === actor.id
      && hasPermission(actor, Permissions.EXPENSE_CREATE)
      && Date.now() < deadline.getTime()
      && isEditable(expense, expense.approvals)
      ? deadline.toISOString()
      : null;
    return { ...expense.toJSON(), editableUntil };
  }

  /**
   * Expenses waiting for the actor's current step. Excludes the actor's own claims
   * and claims where the actor already approved an earlier step.
   */
  async pendingForMe(actor: AuthUser) {
    const expenses = await Expense.findAll({
      where: { status: ExpenseStatus.SUBMITTED },
      include: [{ model: User, attributes: ['id', 'name'] }, { model: ExpenseApproval }],
      order: [['submittedAt', 'ASC']],
      limit: 500,
    });

    const queue: object[] = [];
    for (const e of expenses) {
      if (e.employeeId === actor.id) continue;

      const steps = [...(e.approvals ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
      if (steps.some((s) => s.status === ApprovalStatus.APPROVED && s.actedById === actor.id))
        continue;

      const current = steps.find((s) => s.status === ApprovalStatus.PENDING);
      if (!current || !hasPermission(actor, current.requiredPermission)) continue;

      queue.push({
        id: e.id,
        employee: e.employee,
        category: e.category,
        amount: Number(e.amount),
        expenseDate: e.expenseDate,
        submittedAt: e.submittedAt,
        currentStep: { stepOrder: current.stepOrder, label: current.label },
        totalSteps: steps.length,
      });
    }
    return queue;
  }

  // ---------- Approver actions ----------

  /**
   * Approves the current step. If it was the last pending step, the expense becomes
   * APPROVED. Otherwise it stays SUBMITTED and waits for the next step.
   */
  async approve(actor: AuthUser, id: string, comment?: string) {
    return this.sequelize.transaction(async (t) => {
      const { expense, steps, current } = await this.loadCurrentStep(actor, id, t);

      await current.update(
        {
          status: ApprovalStatus.APPROVED,
          actedById: actor.id,
          actedAt: new Date(),
          comment: comment ?? null,
        },
        { transaction: t },
      );

      const next = steps.find(
        (s) => s.stepOrder > current.stepOrder && s.status === ApprovalStatus.PENDING,
      );
      if (!next) {
        return this.transition(
          expense,
          ExpenseStatus.APPROVED,
          actor,
          t,
          { approvedById: actor.id, approvedAt: new Date() },
          comment,
        );
      }

      await ExpenseHistory.create(
        {
          expenseId: expense.id,
          fromStatus: ExpenseStatus.SUBMITTED,
          toStatus: ExpenseStatus.SUBMITTED,
          actorId: actor.id,
          comment: `Step ${current.stepOrder} (${current.label}) approved. Awaiting ${next.label}.`,
        },
        { transaction: t },
      );

      return {
        id: expense.id,
        status: ExpenseStatus.SUBMITTED,
        approvedStep: { stepOrder: current.stepOrder, label: current.label },
        nextStep: { stepOrder: next.stepOrder, label: next.label },
      };
    });
  }

  /** Rejecting at any step ends the chain. The employee can resubmit. */
  async reject(actor: AuthUser, id: string, reason: string) {
    return this.sequelize.transaction(async (t) => {
      const { expense, current } = await this.loadCurrentStep(actor, id, t);

      await current.update(
        {
          status: ApprovalStatus.REJECTED,
          actedById: actor.id,
          actedAt: new Date(),
          comment: reason,
        },
        { transaction: t },
      );

      return this.transition(
        expense,
        ExpenseStatus.REJECTED,
        actor,
        t,
        { rejectionReason: reason },
        reason,
      );
    });
  }

  /** Approves each expense on its own. Partial success is returned per item. */
  async batchApprove(actor: AuthUser, dto: BatchApproveDto) {
    const result = {
      approved: [] as string[],
      failed: [] as { id: string; error: string }[],
    };
    for (const id of dto.ids) {
      try {
        await this.approve(actor, id, dto.comment);
        result.approved.push(id);
      } catch (err) {
        result.failed.push({ id, error: errorMessage(err) });
      }
    }
    return result;
  }
}
