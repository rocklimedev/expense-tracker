import { AllowNull, Column, DataType, Default, HasMany, Model, Table } from 'sequelize-typescript';
import { ApprovalPolicyStep } from './approval-policy-step.model';

/**
 * Chooses the approval chain for an expense. The matching active policy with the
 * highest priority wins; ties go to the higher minAmount, then the lower id.
 * category null means the policy applies to every category.
 */
@Table({ tableName: 'approval_policies' })
export class ApprovalPolicy extends Model {
  @Column({ type: DataType.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true })
  id!: number;

  @AllowNull(false)
  @Column(DataType.STRING(120))
  name!: string;

  @Column(DataType.STRING(60))
  category!: string | null;

  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  minAmount!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  priority!: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive!: boolean;

  @HasMany(() => ApprovalPolicyStep)
  steps!: ApprovalPolicyStep[];
}
