import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApprovalPolicy } from './models/approval-policy.model';
import { ApprovalPolicyStep } from './models/approval-policy-step.model';
import { ApprovalPoliciesController } from './approval-policies.controller';
import { ApprovalPoliciesService } from './approval-policies.service';

@Module({
  imports: [SequelizeModule.forFeature([ApprovalPolicy, ApprovalPolicyStep])],
  controllers: [ApprovalPoliciesController],
  providers: [ApprovalPoliciesService],
  exports: [ApprovalPoliciesService],
})
export class ApprovalsModule {}
