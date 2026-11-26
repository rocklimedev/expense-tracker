import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { paginateTransactions, TransactionPagination } from '@/components/common/transaction-pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiQuery } from '@/lib/api-query';
import { formatDate, label, money } from '@/lib/format';
import type { TransactionExpense } from '@/lib/types';

interface UserTransactions {
  employee: { id: string; name: string; isActive: boolean };
  expenses: TransactionExpense[];
}

export default function UserTransactionsPage() {
  const { employeeId } = useParams();
  const { data, error, reload } = useApiQuery<UserTransactions>(
    employeeId ? `/expenses/transactions/${encodeURIComponent(employeeId)}` : null,
  );
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const rows = (data?.expenses ?? []).flatMap((expense) => {
    const claim = expense.description || label(expense.category);
    const common = { expenseId: expense.id, claim, currency: expense.currency };
    return [
      {
        ...common, id: expense.id, date: expense.expenseDate, type: 'Expense',
        detail: label(expense.category), amount: expense.amount, status: expense.status,
      },
      ...expense.payments.map((payment) => ({
        ...common, id: payment.id, date: payment.paidOn, type: 'Reimbursement',
        detail: payment.reference || '—', amount: payment.amount, status: undefined,
      })),
    ];
  }).filter((row) => filter === 'all' || row.type === filter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const pagination = paginateTransactions(rows, page);

  return (
    <>
      <PageHeader
        title="Transactions"
        description={data ? data.employee.name + (data.employee.isActive ? '' : ' · Closed account') : undefined}
        actions={<Link to="/users" className="text-sm font-medium text-primary underline">Back to Team</Link>}
      />
      {error ? (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <Button variant="outline" onClick={reload}>Retry</Button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-muted-foreground">Loading transactions…</p>
      ) : (
        <Card id="user-transaction-history" className="scroll-mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <h2 className="font-semibold">Transaction history</h2>
            <Select aria-label="Transaction type" className="w-full sm:w-44" value={filter} onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}>
              <option value="all">All transactions</option>
              <option value="Expense">Expenses</option>
              <option value="Reimbursement">Reimbursements</option>
            </Select>
          </div>
          <Table aria-label="Transaction history">
            <TableHeader className="border-t">
              <TableRow>
                <TableHead scope="col">Date</TableHead>
                <TableHead scope="col">Type</TableHead>
                <TableHead scope="col">Claim</TableHead>
                <TableHead scope="col">Category or reference</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6}>No transactions found.</TableCell></TableRow>
              )}
              {pagination.rows.map((row) => (
                <TableRow key={`${row.type}-${row.id}`}>
                  <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell className="min-w-36 [overflow-wrap:anywhere]">
                    <Link to={`/expenses/${row.expenseId}`} className="font-medium text-primary underline underline-offset-2">
                      {row.claim}
                    </Link>
                  </TableCell>
                  <TableCell className="[overflow-wrap:anywhere]">{row.detail}</TableCell>
                  <TableCell>{row.status ? <StatusBadge status={row.status} /> : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{money(row.amount, row.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TransactionPagination pagination={pagination} onPageChange={setPage} scrollTarget="user-transaction-history" />
        </Card>
      )}
    </>
  );
}
