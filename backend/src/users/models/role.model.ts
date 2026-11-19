import { AllowNull, Column, DataType, Model, Table, Unique } from 'sequelize-typescript';

@Table({ tableName: 'roles' })
export class Role extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(50))
  name!: string;

  @Column(DataType.JSON)
  permissions!: string[];
}
