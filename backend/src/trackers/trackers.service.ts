import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op, fn, col } from 'sequelize';
import { Permissions } from '../common/permissions';
import { AuthUser } from '../common/types';
import { User } from '../users/models/user.model';
import { Expense } from '../expenses/models/expense.model';
import { ExpenseStatus } from '../expenses/expense-workflow';
import { ExpensesService } from '../expenses/expenses.service';
import { ExpenseCategoriesService } from '../expense-categories/expense-categories.service';
import { CreateExpenseDto } from '../expenses/dto/create-expense.dto';
import { Tracker, TrackerStatus } from './models/tracker.model';
import { TrackerSchedule } from './models/tracker-schedule.model';
import { CreateTrackerDto } from './dto/create-tracker.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { SubmitDraftsDto } from './dto/submit-drafts.dto';
import { addDays, occurrencesBetween } from './recurrence';

const MAX_BULK_SUBMIT = 200; // matches the batch approval limit

/** Today's date in the app's timezone, as YYYY-MM-DD. */
function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE ?? 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class TrackersService {
  private readonly logger = new Logger(TrackersService.name);

  constructor(
    @InjectConnection() private sequelize: Sequelize,
    private readonly expenses: ExpensesService,
    private readonly categories: ExpenseCategoriesService,
  ) {}

  // ---------- Trackers ----------

  create(actor: AuthUser, dto: CreateTrackerDto) {
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
    return Tracker.create({ ...dto, employeeId: actor.id });
  }

  async list(actor: AuthUser) {
    const canViewAll = actor.permissions.includes(Permissions.EXPENSE_VIEW_ALL);
    if (!canViewAll && !actor.permissions.includes(Permissions.EXPENSE_VIEW_OWN)) {
      throw new ForbiddenException('You do not have access to trackers');
    }
    return Tracker.findAll({
      where: canViewAll ? {} : { employeeId: actor.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: User, attributes: ['id', 'name'] }],
    });
  }

  async findVisible(actor: AuthUser, id: string) {
    const tracker = await Tracker.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'name'] }],
    });
    if (!tracker) throw new NotFoundException('Tracker not found');

    const canViewAll = actor.permissions.includes(Permissions.EXPENSE_VIEW_ALL);
    const canViewOwn =
      actor.permissions.includes(Permissions.EXPENSE_VIEW_OWN) && tracker.employeeId === actor.id;
    if (!canViewAll && !canViewOwn) {
      throw new ForbiddenException('You do not have access to this tracker');
    }
    return tracker;
  }

  async close(actor: AuthUser, id: string) {
    const tracker = await this.findVisible(actor, id);
    this.assertOwner(actor, tracker);

    return this.sequelize.transaction(async (t) => {
      await tracker.update(
        { status: TrackerStatus.CLOSED, closedAt: new Date() },
        { transaction: t },
      );
      // Stop recurring generation for a closed tracker
      await TrackerSchedule.update(
        { active: false },
        { where: { trackerId: tracker.id }, transaction: t },
      );
      return tracker;
    });
  }

  // ---------- Expenses inside a tracker ----------

  async addExpense(actor: AuthUser, id: string, dto: CreateExpenseDto) {
    const tracker = await this.findVisible(actor, id);
    this.assertOwner(actor, tracker);
    this.assertOpen(tracker);
    this.assertInRange(tracker, dto.expenseDate);

    const category = await this.categories.requireCode(dto.category);
    return Expense.create({ ...dto, category, employeeId: actor.id, trackerId: tracker.id });
  }

  async listExpenses(
    actor: AuthUser,
    id: string,
    filters: { from?: string; to?: string; status?: ExpenseStatus },
  ) {
    const tracker = await this.findVisible(actor, id);

    const where: Record<string, unknown> = { trackerId: tracker.id };
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.expenseDate = {
        [Op.between]: [filters.from ?? '0000-01-01', filters.to ?? '9999-12-31'],
      };
    }

    return Expense.findAll({ where, order: [['expenseDate', 'ASC']] });
  }

  /**
   * Totals and breakdowns for a tracker. Rejected expenses are excluded from money
   * totals, since they will never be paid.
   */
  async summary(actor: AuthUser, id: string) {
    const tracker = await this.findVisible(actor, id);

    const byStatus = (await Expense.findAll({
      where: { trackerId: tracker.id },
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('amount')), 'total'],
        [fn('SUM', col('paidAmount')), 'paid'],
      ],
      group: ['status'],
      raw: true,
    })) as unknown as Array<{ status: ExpenseStatus; count: number; total: string; paid: string }>;

    const byMonth = (await Expense.findAll({
      where: { trackerId: tracker.id, status: { [Op.ne]: ExpenseStatus.REJECTED } },
      attributes: [
        [fn('DATE_FORMAT', col('expenseDate'), '%Y-%m'), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['month'],
      order: [['month', 'ASC']],
      raw: true,
    })) as unknown as Array<{ month: string; total: string }>;

    const counted = byStatus.filter((r) => r.status !== ExpenseStatus.REJECTED);
    const committed = sum(counted.map((r) => Number(r.total)));
    const paid = sum(byStatus.map((r) => Number(r.paid)));
    const outstanding = sum(
      byStatus
        .filter((r) => [ExpenseStatus.APPROVED, ExpenseStatus.PARTIALLY_PAID].includes(r.status))
        .map((r) => Number(r.total) - Number(r.paid)),
    );
    const budget = tracker.budgetAmount !== null ? Number(tracker.budgetAmount) : null;

    return {
      tracker: {
        id: tracker.id,
        title: tracker.title,
        startDate: tracker.startDate,
        endDate: tracker.endDate,
        status: tracker.status,
      },
      totals: {
        committed: round2(committed),
        paid: round2(paid),
        outstanding: round2(outstanding),
        budget,
        budgetRemaining: budget === null ? null : round2(budget - committed),
      },
      byStatus: byStatus.map((r) => ({ ...r, total: Number(r.total), paid: Number(r.paid) })),
      byMonth: byMonth.map((r) => ({ month: r.month, total: Number(r.total) })),
    };
  }

  // ---------- Recurring schedules ----------

  async createSchedule(actor: AuthUser, id: string, dto: CreateScheduleDto) {
    const tracker = await this.findVisible(actor, id);
    this.assertOwner(actor, tracker);
    this.assertOpen(tracker);
    this.assertInRange(tracker, dto.startDate);
    if (dto.endDate && dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    const category = await this.categories.requireCode(dto.category);
    const schedule = await TrackerSchedule.create({ ...dto, category, trackerId: tracker.id });

    // Backfill: generate occurrences from startDate up to today right away
    const generated = await this.generateForTracker(tracker);
    return {
      schedule,
      generated: generated.find((g) => g.scheduleId === schedule.id)?.occurrences ?? [],
    };
  }

  async listSchedules(actor: AuthUser, id: string) {
    const tracker = await this.findVisible(actor, id);
    return TrackerSchedule.findAll({
      where: { trackerId: tracker.id },
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
  }

  async stopSchedule(actor: AuthUser, trackerId: string, scheduleId: string) {
    const tracker = await this.findVisible(actor, trackerId);
    this.assertOwner(actor, tracker);

    const schedule = await TrackerSchedule.findOne({ where: { id: scheduleId, trackerId } });
    if (!schedule) throw new NotFoundException('Schedule not found');

    await schedule.update({ active: false });
    return schedule;
  }

  /** Owner triggers generation manually, for example "generate what is due now". */
  async generate(actor: AuthUser, id: string) {
    const tracker = await this.findVisible(actor, id);
    this.assertOwner(actor, tracker);
    return this.generateForTracker(tracker);
  }

  /**
   * Creates DRAFT expenses for every due occurrence, up to today (or the tracker's
   * endDate if that is earlier). Each schedule resumes from generatedThrough + 1, and
   * the unique index on (scheduleId, occurrenceDate) prevents duplicates.
   */
  async generateForTracker(tracker: Tracker) {
    if (tracker.status === TrackerStatus.CLOSED) return [];

    const today = todayIso();
    const limit = tracker.endDate && tracker.endDate < today ? tracker.endDate : today;

    const schedules = await TrackerSchedule.findAll({
      where: { trackerId: tracker.id, active: true },
    });

    const results: { scheduleId: string; occurrences: string[] }[] = [];

    for (const schedule of schedules) {
      const from = schedule.generatedThrough
        ? addDays(schedule.generatedThrough, 1)
        : schedule.startDate;

      if (from > limit) {
        results.push({ scheduleId: schedule.id, occurrences: [] });
        continue;
      }

      const dates = occurrencesBetween(schedule, from, limit);

      await this.sequelize.transaction(async (t) => {
        if (dates.length) {
          await Expense.bulkCreate(
            dates.map((date) => ({
              employeeId: tracker.employeeId,
              trackerId: tracker.id,
              scheduleId: schedule.id,
              occurrenceDate: date,
              expenseDate: date,
              amount: schedule.amount,
              category: schedule.category,
              description: schedule.description,
              status: ExpenseStatus.DRAFT,
            })),
            { transaction: t, ignoreDuplicates: true },
          );
        }
        await schedule.update({ generatedThrough: limit }, { transaction: t });
      });

      results.push({ scheduleId: schedule.id, occurrences: dates });
    }

    return results;
  }

  /** Used by the daily cron job. Processes every active tracker that has an active schedule. */
  async runDueForAll() {
    const trackers = await Tracker.findAll({
      where: { status: TrackerStatus.ACTIVE },
      include: [{ model: TrackerSchedule, where: { active: true }, required: true }],
    });

    for (const tracker of trackers) {
      try {
        await this.generateForTracker(tracker);
      } catch (err) {
        this.logger.error(`Generation failed for tracker ${tracker.id}: ${(err as Error).message}`);
      }
    }
    return { processed: trackers.length };
  }

  // ---------- Bulk submit ----------

  /**
   * Submits the owner's DRAFT expenses for this tracker, optionally filtered by date
   * range or schedule. Use dryRun to preview first. Processes up to 200 per call;
   * if hasMore is true, call again.
   */
  async submitDrafts(actor: AuthUser, trackerId: string, dto: SubmitDraftsDto) {
    const tracker = await this.findVisible(actor, trackerId);
    this.assertOwner(actor, tracker);

    if (dto.from && dto.to && dto.to < dto.from) {
      throw new BadRequestException('to cannot be before from');
    }

    const where: Record<string, unknown> = {
      trackerId: tracker.id,
      employeeId: actor.id,
      status: ExpenseStatus.DRAFT,
    };
    if (dto.scheduleId) where.scheduleId = dto.scheduleId;
    if (dto.from || dto.to) {
      where.expenseDate = {
        [Op.between]: [dto.from ?? '0000-01-01', dto.to ?? '9999-12-31'],
      };
    }

    // Fetch one extra row to know whether more drafts remain after this batch
    const rows = await Expense.findAll({
      where,
      attributes: ['id', 'expenseDate', 'amount', 'category', 'scheduleId'],
      order: [
        ['expenseDate', 'ASC'],
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: MAX_BULK_SUBMIT + 1,
    });
    const hasMore = rows.length > MAX_BULK_SUBMIT;
    const items = rows.slice(0, MAX_BULK_SUBMIT).map((e) => ({
      id: e.id,
      expenseDate: e.expenseDate,
      amount: Number(e.amount),
      category: e.category,
      scheduleId: e.scheduleId,
    }));

    if (dto.dryRun) {
      return {
        dryRun: true,
        count: items.length,
        total: round2(sum(items.map((i) => i.amount))),
        hasMore,
        items,
      };
    }

    const outcome = await this.expenses.submitMany(
      actor,
      items.map((i) => i.id),
    );
    return { dryRun: false, hasMore, ...outcome };
  }

  // ---------- helpers ----------

  private assertOwner(actor: AuthUser, tracker: Tracker) {
    if (tracker.employeeId !== actor.id) {
      throw new ForbiddenException('Only the tracker owner can do this');
    }
  }

  private assertOpen(tracker: Tracker) {
    if (tracker.status === TrackerStatus.CLOSED) {
      throw new BadRequestException('This tracker is closed');
    }
  }

  private assertInRange(tracker: Tracker, date: string) {
    if (date < tracker.startDate || (tracker.endDate && date > tracker.endDate)) {
      throw new BadRequestException(
        `Date must be between ${tracker.startDate} and ${tracker.endDate ?? 'open-ended'}`,
      );
    }
  }
}
