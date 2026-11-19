import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { BatchApproveDto } from './dto/batch-approve.dto';
import { ExpenseStatus } from './expense-workflow';

// Static routes (queue, batch) are declared before ":id" routes so they are not read as ids.
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Post()
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  create(@Req() req, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(req.user, dto);
  }

  @Get()
  list(
    @Req() req,
    @Query('status') status?: ExpenseStatus,
    @Query('employeeId') employeeId?: number,
  ) {
    return this.expenses.list(req.user, { status, employeeId });
  }

  @Get('queue/pending')
  @RequirePermissions(Permissions.EXPENSE_APPROVE)
  pendingForMe(@Req() req) {
    return this.expenses.pendingForMe(req.user);
  }

  @Post('batch/approve')
  @RequirePermissions(Permissions.EXPENSE_BATCH_APPROVE, Permissions.EXPENSE_APPROVE)
  batchApprove(@Req() req, @Body() dto: BatchApproveDto) {
    return this.expenses.batchApprove(req.user, dto);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.findOne(req.user, id);
  }

  @Post(':id/submit')
  submit(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.expenses.submit(req.user, id);
  }

  @Post(':id/approve')
  @RequirePermissions(Permissions.EXPENSE_APPROVE)
  approve(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('comment') comment?: string,
  ) {
    return this.expenses.approve(req.user, id, comment);
  }

  @Post(':id/reject')
  @RequirePermissions(Permissions.EXPENSE_REJECT)
  reject(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectExpenseDto,
  ) {
    return this.expenses.reject(req.user, id, dto.reason);
  }
}
