import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Permissions } from '../common/permissions';
import { ApprovalPolicy } from './models/approval-policy.model';
import { ApprovalPolicyStep } from './models/approval-policy-step.model';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';

export interface ResolvedStep {
  stepOrder: number;
  label: string;
  requiredPermission: string;
}

// Used when no policy matches, so every expense always has at least one approver
const DEFAULT_STEPS: ResolvedStep[] = [
  { stepOrder: 1, label: 'Approval', requiredPermission: Permissions.EXPENSE_APPROVE },
];

@Injectable()
export class ApprovalPoliciesService {
  constructor(@InjectConnection() private sequelize: Sequelize) {}

  async create(dto: CreateApprovalPolicyDto) {
    const id = await this.sequelize.transaction(async (t) => {
      const policy = await ApprovalPolicy.create(
        {
          name: dto.name,
          category: dto.category ?? null,
          minAmount: dto.minAmount,
          priority: dto.priority ?? 0,
        },
        { transaction: t },
      );
      // stepOrder comes from array position, so clients cannot create gaps or duplicates
      await ApprovalPolicyStep.bulkCreate(
        dto.steps.map((s, i) => ({
          policyId: policy.id,
          stepOrder: i + 1,
          label: s.label,
          requiredPermission: s.requiredPermission,
        })),
        { transaction: t },
      );
      return policy.id;
    });
    return this.findOne(id);
  }

  list() {
    const steps = ApprovalPolicy.associations.steps;
    return ApprovalPolicy.findAll({
      include: [steps],
      order: [
        ['priority', 'DESC'],
        ['minAmount', 'DESC'],
        [steps, 'stepOrder', 'ASC'],
      ],
    });
  }

  async findOne(id: string) {
    const steps = ApprovalPolicy.associations.steps;
    const policy = await ApprovalPolicy.findByPk(id, {
      include: [steps],
      order: [[steps, 'stepOrder', 'ASC']],
    });
    if (!policy) throw new NotFoundException('Policy not found');
    return policy;
  }

  async deactivate(id: string) {
    const policy = await this.findOne(id);
    await policy.update({ isActive: false });
    return policy;
  }

  /**
   * Returns the approval chain that applies to an expense of this amount and category.
   * Used at submit time and by the preview endpoint.
   */
  async resolveSteps(amount: number, category: string): Promise<ResolvedStep[]> {
    const policy = await ApprovalPolicy.findOne({
      where: {
        isActive: true,
        minAmount: { [Op.lte]: amount },
        [Op.or]: [{ category: null }, { category }],
      },
      order: [['priority', 'DESC'], ['minAmount', 'DESC'], ['createdAt', 'ASC'], ['id', 'ASC']],
    });
    if (!policy) return DEFAULT_STEPS;

    const steps = await ApprovalPolicyStep.findAll({
      where: { policyId: policy.id },
      order: [['stepOrder', 'ASC']],
    });
    if (!steps.length) return DEFAULT_STEPS;

    return steps.map((s) => ({
      stepOrder: s.stepOrder,
      label: s.label,
      requiredPermission: s.requiredPermission,
    }));
  }
}
