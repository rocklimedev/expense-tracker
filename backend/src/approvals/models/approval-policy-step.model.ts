import {
  AllowNull, BelongsTo, Column, DataType, ForeignKey, Model, Table, Unique,
} from 'sequelize-typescript';
import { ApprovalPolicy } from './approval-policy.model';

@Table({ tableName: 'approval_policy_steps', timestamps: false })
export class ApprovalPolicyStep extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @ForeignKey(() => ApprovalPolicy)
  @Unique({ name: 'uq_policy_step', msg: 'Duplicate step order in policy' })
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  policyId!: number;

  @BelongsTo(() => ApprovalPolicy)
  policy!: ApprovalPolicy;

  @Unique({ name: 'uq_policy_step', msg: 'Duplicate step order in policy' })
  @AllowNull(false)
  @Column(DataType.INTEGER.UNSIGNED)
  stepOrder!: number;

  @AllowNull(false)
  @Column(DataType.STRING(100))
  label!: string;

  @AllowNull(false)
  @Column(DataType.STRING(60))
  requiredPermission!: string;
}
