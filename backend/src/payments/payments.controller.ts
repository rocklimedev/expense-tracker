import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permissions } from '../common/permissions';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Controller('expenses/:expenseId/payments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @RequirePermissions(Permissions.PAYMENT_RECORD)
  record(
    @Req() req,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.payments.record(req.user, expenseId, dto);
  }

  @Get()
  @RequirePermissions(Permissions.PAYMENT_RECORD)
  list(@Param('expenseId', ParseUUIDPipe) expenseId: string) {
    return this.payments.listForExpense(expenseId);
  }
}
