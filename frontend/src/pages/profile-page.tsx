import { Link } from 'react-router-dom';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { formatDate, label, money } from '@/lib/format';
import type { Expense, Payment } from '@/lib/types';
import { useFetch } from '@/lib/use-fetch';

type ApprovedExpense = Pick<
  Expense,
  | 'id'
  | 'category'
  | 'description'
  | 'expenseDate'
  | 'currency'
  | 'amount'
  | 'paidAmount'
  | 'status'
> & {
  payments: Pick<Payment, 'id' | 'amount' | 'paidOn' | 'reference'>[];
};

export default function ProfilePage() {
  const { user, can } = useAuth();
  const canViewExpenses = can('expense.view.own') || can('expense.view.all');
  const {
    data: expenses,
    error,
    reload,
  } = useFetch<ApprovedExpense[]>(canViewExpenses ? '/expenses/mine/approved' : null);
  const payments = (expenses ?? [])
    .flatMap((expense) => expense.payments.map((payment) => ({ expense, payment })))
    .sort(
      (a, b) =>
        b.payment.paidOn.localeCompare(a.payment.paidOn) ||
        a.payment.id.localeCompare(b.payment.id),
    );

  return (
    <>
      <PageHeader
        title="Profile"
        description={user ? `${user.name} · ${label(user.role)}` : undefined}
      />
      {!canViewExpenses ? (
        <Notice kind="info">Your role does not have access to expense history.</Notice>
      ) : error ? (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <Button variant="outline" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : !expenses ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading expense history…
        </p>
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="px-4 py-4 font-semibold">Approved expenses</h2>
            {expenses.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                You have no approved expenses yet.
              </p>
            ) : (
              <Table aria-label="Approved expenses">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Expense</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">
                      Approved amount
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Reimbursed
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Link
                          to={`/expenses/${expense.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {expense.description || label(expense.category)}
                        </Link>
                        {expense.description && (
                          <p className="text-xs text-muted-foreground">{label(expense.category)}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(expense.expenseDate)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={expense.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(expense.paidAmount, expense.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card>
            <h2 className="px-4 py-4 font-semibold">Reimbursement payments</h2>
            {payments.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                You have no reimbursement payments yet.
              </p>
            ) : (
              <Table aria-label="Reimbursement payments">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Paid on</TableHead>
                    <TableHead scope="col">Expense</TableHead>
                    <TableHead scope="col">Reference</TableHead>
                    <TableHead scope="col" className="text-right">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(({ expense, payment }) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(payment.paidOn)}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/expenses/${expense.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {expense.description || label(expense.category)}
                        </Link>
                      </TableCell>
                      <TableCell>{payment.reference || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(payment.amount, expense.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
