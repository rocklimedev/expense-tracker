import { AllowNull, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Expense } from './expense.model';

@Table({ tableName: 'expense_history', updatedAt: false })
export class ExpenseHistory extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @ForeignKey(() => Expense)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  expenseId!: number;

  @Column(DataType.STRING(20))
  fromStatus!: string;

  @AllowNull(false)
  @Column(DataType.STRING(20))
  toStatus!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  actorId!: number;

  @Column(DataType.STRING(500))
  comment!: string;
}
