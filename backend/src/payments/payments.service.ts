import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { AuthUser } from '../common/types';
import { Expense } from '../expenses/models/expense.model';
import { ExpenseHistory } from '../expenses/models/expense-history.model';
import { ExpenseStatus } from '../expenses/expense-workflow';
import { Payment } from './models/payment.model';
import { RecordPaymentDto } from './dto/record-payment.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PaymentsService {
  constructor(@InjectConnection() private sequelize: Sequelize) {}

  async record(actor: AuthUser, expenseId: string, dto: RecordPaymentDto) {
    return this.sequelize.transaction(async (t) => {
      // Row lock so two finance users cannot overpay the same claim
      const expense = await Expense.findByPk(expenseId, { lock: t.LOCK.UPDATE, transaction: t });
      if (!expense) throw new NotFoundException('Expense not found');

      if (![ExpenseStatus.APPROVED, ExpenseStatus.PARTIALLY_PAID].includes(expense.status)) {
        throw new BadRequestException(
          `Payments can only be recorded on approved expenses (current: ${expense.status})`,
        );
      }

      const approvedTotal = Number(expense.amount);
      const totalPaid = round2(Number(expense.paidAmount) + dto.amount);
      if (totalPaid > approvedTotal) {
        throw new BadRequestException(
          `Payment exceeds the remaining balance of ${round2(approvedTotal - Number(expense.paidAmount))}`,
        );
      }

      const payment = await Payment.create(
        {
          expenseId: expense.id,
          amount: dto.amount,
          paidOn: dto.paidOn,
          reference: dto.reference,
          recordedById: actor.id,
        },
        { transaction: t },
      );

      const from = expense.status;
      const to = totalPaid === approvedTotal ? ExpenseStatus.PAID : ExpenseStatus.PARTIALLY_PAID;

      await expense.update({ paidAmount: totalPaid, status: to }, { transaction: t });
      await ExpenseHistory.create(
        {
          expenseId: expense.id,
          fromStatus: from,
          toStatus: to,
          actorId: actor.id,
          comment: `Payment of ${dto.amount} recorded${dto.reference ? ` (ref: ${dto.reference})` : ''}`,
        },
        { transaction: t },
      );

      return { payment, expenseStatus: to, paidAmount: totalPaid };
    });
  }

  listForExpense(expenseId: string) {
    return Payment.findAll({ where: { expenseId }, order: [['paidOn', 'ASC']] });
  }
}
