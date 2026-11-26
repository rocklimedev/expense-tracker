import type { KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { paginateTransactions, TransactionPagination } from '@/components/common/transaction-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiQuery } from '@/lib/api-query';
import { formatDate, label, money } from '@/lib/format';
import type { TransactionExpense } from '@/lib/types';

const tabs = [
  { id: 'expenses', label: 'Expenses', query: 'expense' },
  { id: 'reimbursements', label: 'Reimbursements', query: 'reimburse' },
] as const;
type TransactionTab = (typeof tabs)[number];

export default function TransactionsPage() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const activeTab = params.has(tabs[1].query) ? tabs[1] : tabs[0];
  const requestedPage = Number(params.get('page') ?? '1');
  const { data: expenses, error, reload } = useApiQuery<TransactionExpense[]>('/expenses/transactions');
  const reimbursements = (expenses ?? []).flatMap((expense) =>
    expense.payments.map((payment) => ({ expense, payment })),
  ).sort((a, b) => b.payment.paidOn.localeCompare(a.payment.paidOn) || b.payment.id.localeCompare(a.payment.id));
  const expensePage = paginateTransactions(expenses ?? [], requestedPage);
  const reimbursementPage = paginateTransactions(reimbursements, requestedPage);

  function selectTab(tab: TransactionTab) {
    if (tab !== activeTab || !params.has(tab.query)) {
      navigate({ search: `?${tab.query}` }, { preventScrollReset: true });
    }
  }

  function changePage(page: number) {
    const nextSearch = `?${activeTab.query}${page === 1 ? '' : `&page=${page}`}`;
    navigate({ search: nextSearch }, { preventScrollReset: true });
  }

  function moveTab(event: KeyboardEvent<HTMLDivElement>) {
    const next = event.key === 'Home' ? tabs[0]
      : event.key === 'End' ? tabs[1]
      : event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? tabs.find((tab) => tab.id !== activeTab.id)
        : undefined;
    if (!next) return;
    event.preventDefault();
    selectTab(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#${next.id}-tab`)?.focus();
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Expense claims and recorded reimbursements for the whole team."
      />
      {error ? (
        <div className="space-y-3">
          <Notice kind="error">{error}</Notice>
          <Button variant="outline" onClick={reload}>Retry</Button>
        </div>
      ) : !expenses ? (
        <p role="status" className="text-sm text-muted-foreground">Loading transactions…</p>
      ) : (
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="Transaction type"
            className="inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1"
            onKeyDown={moveTab}
          >
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                id={`${tab.id}-tab`}
                type="button"
                variant="ghost"
                role="tab"
                aria-selected={activeTab.id === tab.id}
                aria-controls={`${tab.id}-panel`}
                tabIndex={activeTab.id === tab.id ? 0 : -1}
                className="px-3 aria-selected:bg-card aria-selected:text-primary aria-selected:shadow-sm"
                onClick={() => selectTab(tab)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <Card id="expenses-panel" role="tabpanel" aria-labelledby="expenses-tab" hidden={activeTab.id !== 'expenses'} className="scroll-mt-16">
            <CardHeader><h2 className="font-semibold">All expenses</h2></CardHeader>
            <Table aria-label="All expenses">
              <TableHeader className="border-t">
                <TableRow>
                  <TableHead scope="col">Expense date</TableHead>
                  <TableHead scope="col">Employee</TableHead>
                  <TableHead scope="col">Claim</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 && (
                  <TableRow><TableCell colSpan={6}>No expenses found.</TableCell></TableRow>
                )}
                {expensePage.rows.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="[overflow-wrap:anywhere]">{expense.employee?.name ?? '—'}</TableCell>
                    <TableCell className="min-w-36"><ClaimLink expense={expense} /></TableCell>
                    <TableCell>{label(expense.category)}</TableCell>
                    <TableCell><StatusBadge status={expense.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">{money(expense.amount, expense.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TransactionPagination pagination={expensePage} onPageChange={changePage} scrollTarget="expenses-panel" />
          </Card>

          <section id="reimbursements-panel" role="tabpanel" aria-labelledby="reimbursements-tab" hidden={activeTab.id !== 'reimbursements'} className="scroll-mt-16">
            <Card>
              <CardHeader><h2 id="reimbursements-heading" className="font-semibold">Reimbursements</h2></CardHeader>
              <Table aria-label="Recorded reimbursements">
                <TableHeader className="border-t">
                  <TableRow>
                    <TableHead scope="col">Paid on</TableHead>
                    <TableHead scope="col">Employee</TableHead>
                    <TableHead scope="col">Claim</TableHead>
                    <TableHead scope="col">Reference</TableHead>
                    <TableHead scope="col" className="text-right">Amount paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.length === 0 && (
                    <TableRow><TableCell colSpan={5}>No reimbursements recorded.</TableCell></TableRow>
                  )}
                  {reimbursementPage.rows.map(({ expense, payment }) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(payment.paidOn)}</TableCell>
                      <TableCell className="[overflow-wrap:anywhere]">{expense.employee?.name ?? '—'}</TableCell>
                      <TableCell className="min-w-36"><ClaimLink expense={expense} /></TableCell>
                      <TableCell className="[overflow-wrap:anywhere]">{payment.reference || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{money(payment.amount, expense.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TransactionPagination pagination={reimbursementPage} onPageChange={changePage} scrollTarget="reimbursements-panel" />
            </Card>
          </section>
        </div>
      )}
    </>
  );
}

function ClaimLink({ expense }: { expense: TransactionExpense }) {
  return (
    <Link to={`/expenses/${expense.id}`} className="font-medium text-primary underline underline-offset-2 [overflow-wrap:anywhere]">
      {expense.description || label(expense.category)}
    </Link>
  );
}
