import {
  Body, Controller, Get, Param, ParseFloatPipe, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { ApprovalPoliciesService } from './approval-policies.service';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';

@Controller('approval-policies')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ApprovalPoliciesController {
  constructor(private readonly policies: ApprovalPoliciesService) {}

  @Post()
  @RequirePermissions(Permissions.APPROVAL_POLICY_MANAGE)
  create(@Body() dto: CreateApprovalPolicyDto) {
    return this.policies.create(dto);
  }

  @Get()
  @RequirePermissions(Permissions.APPROVAL_POLICY_MANAGE)
  list() {
    return this.policies.list();
  }

  // Declared before ":id" routes; any signed-in user can preview the chain before submitting
  @Get('preview')
  preview(
    @Query('amount', ParseFloatPipe) amount: number,
    @Query('category') category: string,
  ) {
    return this.policies.resolveSteps(amount, category);
  }

  @Post(':id/deactivate')
  @RequirePermissions(Permissions.APPROVAL_POLICY_MANAGE)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.policies.deactivate(id);
  }
}
