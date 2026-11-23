import { AllowNull, Column, DataType, Model, Table, Unique } from 'sequelize-typescript';

@Table({ tableName: 'roles' })
export class Role extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(50))
  name!: string;
}
