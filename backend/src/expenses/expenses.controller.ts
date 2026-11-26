import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseBatchDto } from './dto/create-expense-batch.dto';
import { CancelReimbursementDto } from '../payments/dto/cancel-reimbursement.dto';
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

  @Post('batch')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  createBatch(@Req() req, @Body() dto: CreateExpenseBatchDto) {
    return this.expenses.createBatch(req.user, dto.expenses);
  }

  @Get()
  list(
    @Req() req,
    @Query('status') status?: ExpenseStatus,
    @Query('employeeId', new ParseUUIDPipe({ optional: true })) employeeId?: string,
  ) {
    return this.expenses.list(req.user, { status, employeeId });
  }

  @Get('queue/pending')
  @RequirePermissions(Permissions.EXPENSE_APPROVE)
  pendingForMe(@Req() req) {
    return this.expenses.pendingForMe(req.user);
  }

  @Get('mine/approved')
  approvedForMe(@Req() req) {
    return this.expenses.approvedForMe(req.user);
  }

  @Get('transactions')
  @RequirePermissions(Permissions.EXPENSE_VIEW_ALL)
  allTransactions() {
    return this.expenses.transactionExpenses();
  }

  @Get('transactions/:employeeId')
  @RequirePermissions(Permissions.USER_MANAGE, Permissions.EXPENSE_VIEW_ALL)
  userTransactions(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.expenses.userTransactions(employeeId);
  }

  @Post('batch/approve')
  @RequirePermissions(Permissions.EXPENSE_BATCH_APPROVE, Permissions.EXPENSE_APPROVE)
  batchApprove(@Req() req, @Body() dto: BatchApproveDto) {
    return this.expenses.batchApprove(req.user, dto);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.findOne(req.user, id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.EXPENSE_CREATE)
  update(@Req() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateExpenseDto) {
    return this.expenses.update(req.user, id, dto);
  }

  @Post(':id/submit')
  submit(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.submit(req.user, id);
  }

  @Post(':id/approve')
  @RequirePermissions(Permissions.EXPENSE_APPROVE)
  approve(@Req() req, @Param('id', ParseUUIDPipe) id: string, @Body('comment') comment?: string) {
    return this.expenses.approve(req.user, id, comment);
  }

  @Post(':id/cancel-reimbursement')
  @RequirePermissions(Permissions.PAYMENT_RECORD)
  cancelReimbursement(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReimbursementDto,
  ) {
    return this.expenses.cancelReimbursement(req.user, id, dto.reason);
  }

  @Post(':id/reject')
  @RequirePermissions(Permissions.EXPENSE_REJECT)
  reject(@Req() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectExpenseDto) {
    return this.expenses.reject(req.user, id, dto.reason);
  }
}
