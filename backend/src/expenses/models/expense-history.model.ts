import { AllowNull, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Expense } from './expense.model';

@Table({ tableName: 'expense_history', updatedAt: false })
export class ExpenseHistory extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Expense)
  @AllowNull(false)
  @Column(DataType.UUID)
  expenseId!: string;

  @Column(DataType.STRING(20))
  fromStatus!: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  toStatus!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  actorId!: string;

  @Column(DataType.STRING(500))
  comment!: string;
}
