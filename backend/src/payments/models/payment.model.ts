import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Expense } from '../../expenses/models/expense.model';
import { User } from '../../users/models/user.model';

@Table({ tableName: 'payments' })
export class Payment extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Expense)
  @AllowNull(false)
  @Column(DataType.UUID)
  expenseId!: string;

  @BelongsTo(() => Expense)
  expense!: Expense;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  amount!: number;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  paidOn!: string;

  @Column(DataType.STRING(100))
  reference!: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  recordedById!: string;

  @BelongsTo(() => User, 'recordedById')
  recordedBy!: User;
}
