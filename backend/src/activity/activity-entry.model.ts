import { AllowNull, Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'activity_entries', updatedAt: false })
export class ActivityEntry extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Column(DataType.UUID)
  actorId!: string | null;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  actorName!: string;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  action!: string;

  @AllowNull(false)
  @Column(DataType.STRING(6))
  method!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  resource!: string;
}
