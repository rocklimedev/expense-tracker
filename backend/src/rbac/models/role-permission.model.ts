import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Role } from './role.model';
import { RbacPermission } from './permission.model';

@Table({ tableName: 'role_permissions', timestamps: false })
export class RolePermission extends Model {
  @ForeignKey(() => Role)
  @Column({ type: DataType.UUID, primaryKey: true })
  roleId!: string;

  @ForeignKey(() => RbacPermission)
  @Column({ type: DataType.STRING(100).BINARY, primaryKey: true })
  permissionCode!: string;

  @BelongsTo(() => Role, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  role!: Role;

  @BelongsTo(() => RbacPermission, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  permission!: RbacPermission;
}
