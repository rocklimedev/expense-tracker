import {
  BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { User } from '../users/models/user.model';
import { ApprovalPoliciesService } from '../approvals/approval-policies.service';
import { Expense } from './models/expense.model';
import { ExpenseHistory } from './models/expense-history.model';
import { ExpenseApproval, ApprovalStatus } from './models/expense-approval.model';
import { ALLOWED_TRANSITIONS, ExpenseStatus } from './expense-workflow';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';

const hasPermission = (actor: AuthUser, permission: string) =>
  (actor.permissions as string[]).includes(permission);

const errorMessage = (err: unknown) =>
  err instanceof HttpException ? err.message : 'Unexpected error';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectConnection() private sequelize: Sequelize,
    private readonly policies: ApprovalPoliciesService,
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

  private async findLocked(id: number, t: Transaction) {
    const expense = await Expense.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  /**
   * Locks the expense, finds the step waiting for action, and checks that the actor
   * may act on it. Shared by approve() and reject().
   */
  private async loadCurrentStep(actor: AuthUser, id: number, t: Transaction) {
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
  create(actor: AuthUser, dto: CreateExpenseDto) {
    return Expense.create({ ...dto, employeeId: actor.id });
  }

  /**
   * Resolves the approval chain and snapshots it into expense_approvals.
   * Later policy changes do not affect this expense. Resubmitting replaces the chain.
   */
  async submit(actor: AuthUser, id: number) {
    return this.sequelize.transaction(async (t) => {
      const expense = await this.findLocked(id, t);
      if (expense.employeeId !== actor.id) throw new ForbiddenException();

      const steps = await this.policies.resolveSteps(Number(expense.amount), expense.category);

      await ExpenseApproval.destroy({ where: { expenseId: expense.id }, transaction: t });
      await ExpenseApproval.bulkCreate(
        steps.map((s) => ({
          expenseId: expense.id,
          stepOrder: s.stepOrder,
          label: s.label,
          requiredPermission: s.requiredPermission,
          status: ApprovalStatus.PENDING,
        })),
        { transaction: t },
      );

      return this.transition(expense, ExpenseStatus.SUBMITTED, actor, t, {
        submittedAt: new Date(),
        rejectionReason: null,
        approvedById: null,
        approvedAt: null,
      });
    });
  }

  /** Same rules as submit(), applied per item. One failure does not stop the others. */
  async submitMany(actor: AuthUser, ids: number[]) {
    const result = {
      submitted: [] as number[],
      failed: [] as { id: number; error: string }[],
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
  async list(actor: AuthUser, filters: { status?: ExpenseStatus; employeeId?: number }) {
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

  async findOne(actor: AuthUser, id: number) {
    const expense = await Expense.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: ExpenseApproval, order: [['stepOrder', 'ASC']] },
        { model: ExpenseHistory, order: [['createdAt', 'ASC']] },
      ],
    });
    if (!expense) throw new NotFoundException('Expense not found');

    if (!hasPermission(actor, Permissions.EXPENSE_VIEW_ALL) && expense.employeeId !== actor.id) {
      throw new ForbiddenException();
    }
    return expense;
  }

  /**
   * Expenses waiting for the actor's current step. Excludes the actor's own claims
   * and claims where the actor already approved an earlier step.
   */
  async pendingForMe(actor: AuthUser) {
    const expenses = await Expense.findAll({
      where: { status: ExpenseStatus.SUBMITTED },
      include: [
        { model: User, attributes: ['id', 'name'] },
        { model: ExpenseApproval },
      ],
      order: [['submittedAt', 'ASC']],
      limit: 500,
    });

    const queue: object[] = [];
    for (const e of expenses) {
      if (e.employeeId === actor.id) continue;

      const steps = [...(e.approvals ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
      if (steps.some((s) => s.status === ApprovalStatus.APPROVED && s.actedById === actor.id)) continue;

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
  async approve(actor: AuthUser, id: number, comment?: string) {
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
          expense, ExpenseStatus.APPROVED, actor, t,
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
  async reject(actor: AuthUser, id: number, reason: string) {
    return this.sequelize.transaction(async (t) => {
      const { expense, current } = await this.loadCurrentStep(actor, id, t);

      await current.update(
        { status: ApprovalStatus.REJECTED, actedById: actor.id, actedAt: new Date(), comment: reason },
        { transaction: t },
      );

      return this.transition(
        expense, ExpenseStatus.REJECTED, actor, t,
        { rejectionReason: reason },
        reason,
      );
    });
  }

  /** Approves each expense on its own. Partial success is returned per item. */
  async batchApprove(actor: AuthUser, dto: BatchApproveDto) {
    const result = {
      approved: [] as number[],
      failed: [] as { id: number; error: string }[],
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
