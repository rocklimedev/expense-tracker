import {
  AllowNull, BelongsTo, Column, DataType, Default, ForeignKey, Model, Table, Unique,
} from 'sequelize-typescript';
import { Role } from '../../rbac/models/role.model';

@Table({ tableName: 'users' })
export class User extends Model {
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id!: string;

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

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER.UNSIGNED)
  passwordVersion!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Column(DataType.UUID)
  roleId!: string;

  @BelongsTo(() => Role)
  role!: Role;
}
