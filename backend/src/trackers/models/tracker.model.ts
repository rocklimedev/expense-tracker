import {
  AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, HasMany, Model, Table,
} from 'sequelize-typescript';
import { User } from '../../users/models/user.model';
import { Expense } from '../../expenses/models/expense.model';
import { TrackerSchedule } from './tracker-schedule.model';

export enum TrackerStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

@Table({ tableName: 'trackers' })
export class Tracker extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  employeeId!: string;

  @BelongsTo(() => User, 'employeeId')
  employee!: User;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  title!: string;

  @Column(DataType.STRING(500))
  description!: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  startDate!: string;

  // Null means open-ended (common for recurring costs like subscriptions)
  @Column(DataType.DATEONLY)
  endDate!: string | null;

  @Column(DataType.DECIMAL(12, 2))
  budgetAmount!: number | null;

  @Default(TrackerStatus.ACTIVE)
  @Column(DataType.ENUM(...Object.values(TrackerStatus)))
  status!: TrackerStatus;

  @Column(DataType.DATE)
  closedAt!: Date | null;

  @HasMany(() => Expense)
  expenses!: Expense[];

  @HasMany(() => TrackerSchedule)
  schedules!: TrackerSchedule[];
}
