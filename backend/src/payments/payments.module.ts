import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Expense } from '../expenses/models/expense.model';
import { ExpenseHistory } from '../expenses/models/expense-history.model';
import { Payment } from './models/payment.model';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [SequelizeModule.forFeature([Payment, Expense, ExpenseHistory])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
