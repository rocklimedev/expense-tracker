import {
  AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table, Unique,
} from 'sequelize-typescript';
import { Expense } from './expense.model';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** One step in the approval chain for one expense. Created at submit time. */
@Table({ tableName: 'expense_approvals' })
export class ExpenseApproval extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @ForeignKey(() => Expense)
  @Unique({ name: 'uq_expense_step', msg: 'Step already exists for this expense' })
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  expenseId!: number;

  @BelongsTo(() => Expense)
  expense!: Expense;

  @Unique({ name: 'uq_expense_step', msg: 'Step already exists for this expense' })
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  stepOrder!: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  label!: string;

  @AllowNull(false)
  @Column(DataType.STRING(60))
  requiredPermission!: string;

  @Default(ApprovalStatus.PENDING)
  @Column(DataType.ENUM(...Object.values(ApprovalStatus)))
  status!: ApprovalStatus;

  @Column(DataType.INTEGER.UNSIGNED)
  actedById!: number | null;

  @Column(DataType.DATE)
  actedAt!: Date | null;

  @Column(DataType.STRING(500))
  comment!: string | null;
}
