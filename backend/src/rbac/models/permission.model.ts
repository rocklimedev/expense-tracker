import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'permissions', timestamps: false })
export class RbacPermission extends Model {
  @Column({ type: DataType.STRING(100).BINARY, primaryKey: true })
  code!: string;
}
