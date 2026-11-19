import {
  AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table,
} from 'sequelize-typescript';
import { Tracker } from './tracker.model';
import { Frequency } from '../recurrence';

@Table({ tableName: 'tracker_schedules' })
export class TrackerSchedule extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @ForeignKey(() => Tracker)
  @AllowNull(false)
  @Column(DataType.UUID)
  trackerId!: string;

  @BelongsTo(() => Tracker)
  tracker!: Tracker;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(Frequency)))
  frequency!: Frequency;

  // Every N days / weeks / months
  @Default(1)
  @Column(DataType.INTEGER.UNSIGNED)
  interval!: number;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  amount!: number;

  @AllowNull(false)
  @Column(DataType.STRING(60))
  category!: string;

  @Column(DataType.STRING(500))
  description!: string;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  startDate!: string;

  @Column(DataType.DATEONLY)
  endDate!: string | null;

  // Everything up to and including this date has been generated.
  // Generation resumes the next day, so old work is never recomputed.
  @Column(DataType.DATEONLY)
  generatedThrough!: string | null;

  @Default(true)
  @Column(DataType.BOOLEAN)
  active!: boolean;
}
