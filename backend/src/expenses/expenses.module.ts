import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApprovalsModule } from '../approvals/approvals.module';
import { Expense } from './models/expense.model';
import { ExpenseHistory } from './models/expense-history.model';
import { ExpenseApproval } from './models/expense-approval.model';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Expense, ExpenseHistory, ExpenseApproval]),
    ApprovalsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
