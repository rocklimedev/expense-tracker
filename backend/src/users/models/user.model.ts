import {
  AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table, Unique,
} from 'sequelize-typescript';
import { Role } from './role.model';

@Table({ tableName: 'users' })
export class User extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  name!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING(190))
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(255))
  passwordHash!: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  roleId!: number;

  @BelongsTo(() => Role)
  role!: Role;
}
