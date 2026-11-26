import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useApiQuery } from '@/lib/api-query';
import { money, label } from '@/lib/format';
import {
  categoryTotals,
  dayHeading,
  groupByDay,
  isSpend,
  lastMonths,
  monthKey,
  monthName,
  num,
  spendAmount,
} from '@/lib/spend';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/status-badge';
import { paginateTransactions, TransactionPagination } from '@/components/common/transaction-pagination';
import { CategoryTile } from '@/components/common/category-tile';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';
import { MonthlyBars, CategoryBreakdown } from '@/components/common/spend-chart';

type Filter = 'ALL' | 'ATTENTION' | 'PAID';

// Three filters only. Drafts and rejected claims show under "All".
const FILTERS: { value: Filter; label: string; match: ExpenseStatus[] }[] = [
  {
    value: 'ALL',
    label: 'All',
    match: [
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'PARTIALLY_PAID',
      'PAID',
      'REIMBURSEMENT_CANCELLED',
    ],
  },
  { value: 'ATTENTION', label: 'Needs attention', match: ['SUBMITTED', 'APPROVED', 'PARTIALLY_PAID'] },
  { value: 'PAID', label: 'Paid', match: ['PAID'] },
];

function searchText(e: Expense) {
  return [
    label(e.category),
    e.description,
    e.employee?.name,
    e.toldBy,
    e.reason,
    e.paidTo,
    String(e.amount),
  ]
    .join(' ')
    .toLowerCase();
}

export default function ExpensesPage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useApiQuery<Expense[]>('/expenses');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const all = useMemo(() => data ?? [], [data]);
  const showEmployee = can('expense.view.all');
  const firstName = user?.name?.split(' ')[0];

  const months = useMemo(() => lastMonths(6), []);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];

  const spendByMonth = useMemo(
    () =>
      months.map((key) => ({
        key,
        total: all
          .filter((e) => isSpend(e) && monthKey(e.expenseDate) === key)
          .reduce((s, e) => s + spendAmount(e), 0),
      })),
    [all, months],
  );

  const monthClaims = useMemo(
    () => all.filter((e) => isSpend(e) && monthKey(e.expenseDate) === thisMonth),
    [all, thisMonth],
  );
  const monthTotal = monthClaims.reduce((s, e) => s + spendAmount(e), 0);
  const lastMonthTotal = spendByMonth[spendByMonth.length - 2]?.total ?? 0;
  const change =
    lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null;
  const categories = useMemo(() => categoryTotals(monthClaims), [monthClaims]);

  const awaiting = all.filter((e) => e.status === 'SUBMITTED');
  const awaitingTotal = awaiting.reduce((s, e) => s + num(e.amount), 0);
  const toReimburse = all.filter((e) => e.status === 'APPROVED' || e.status === 'PARTIALLY_PAID');
  const toReimburseTotal = toReimburse.reduce((s, e) => s + num(e.amount) - num(e.paidAmount), 0);

  const activeFilter = FILTERS.find((f) => f.value === filter) ?? FILTERS[0];
  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      all
        .filter((e) => activeFilter.match.includes(e.status) && (!q || searchText(e).includes(q)))
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate)),
    [all, activeFilter, q],
  );
  const pagination = paginateTransactions(rows, page);
  const groups = groupByDay(pagination.rows);
  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of rows) {
      if (isSpend(expense)) {
        totals.set(expense.expenseDate, (totals.get(expense.expenseDate) ?? 0) + num(expense.amount));
      }
    }
    return totals;
  }, [rows]);

  const newButton = can('expense.create') && (
    <Button onClick={() => navigate('/expenses/new')}>
      <Plus className="h-4 w-4" /> New expense
    </Button>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {firstName ? `Hi ${firstName}.` : 'Welcome back.'}
          </p>
        </div>
      </header>

      {error && <Notice kind="error">{error}</Notice>}

      {/* One clear number, then only what needs a decision. */}
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">
          Spent in {monthName(thisMonth, true)}
        </p>
        <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
          {data ? money(monthTotal) : '—'}
        </p>
        {change !== null && (
          <p
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 text-sm font-medium',
              change > 0 ? 'text-rose-600' : 'text-emerald-700',
            )}
          >
            {change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(change)}% {change > 0 ? 'more' : 'less'} than {monthName(lastMonth, true)}
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFilter('ATTENTION')}
            className="rounded-xl bg-amber-50/70 p-4 text-left transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="text-xs font-medium text-amber-800">Awaiting approval</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {data ? money(awaitingTotal) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {awaiting.length} {awaiting.length === 1 ? 'claim' : 'claims'}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilter('ATTENTION')}
            className="rounded-xl bg-sky-50/70 p-4 text-left transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="text-xs font-medium text-sky-800">To be reimbursed</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {data ? money(toReimburseTotal) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Approved, not yet paid</div>
          </button>
        </div>
      </Card>

      {/* Breakdown is secondary, so it stays closed until asked for. */}
      <details className="group rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.03]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Where it went
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-8 border-t p-5 sm:p-6 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-medium text-muted-foreground">Last six months</p>
            <MonthlyBars data={spendByMonth} />
          </div>
          <div>
            <p className="mb-4 text-sm font-medium text-muted-foreground">
              {monthName(thisMonth, true)} by category
            </p>
            {categories.length > 0 ? (
              <CategoryBreakdown rows={categories} total={monthTotal} />
            ) : (
              <p className="text-sm text-muted-foreground">No spending recorded this month yet.</p>
            )}
          </div>
        </div>
      </details>

      {/* Transactions: search, three filters, then the list grouped by day. */}
      <Card id="expense-transactions" className="scroll-mt-16 overflow-hidden">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="px-1 font-semibold tracking-tight">Transactions</h2>
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 rounded-full bg-background pl-9 sm:h-9"
                placeholder="Search spending"
                aria-label="Search spending"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div
            className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-muted p-1 no-scrollbar"
            role="group"
            aria-label="Filter by status"
          >
            {FILTERS.map((f) => {
              const active = f.value === filter;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(f.value);
                    setPage(1);
                  }}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {groups.map((g) => {
          const dayTotal = dayTotals.get(g.date) ?? 0;
          return (
            <section key={g.date} aria-label={dayHeading(g.date)}>
              <div className="flex items-baseline justify-between px-5 pb-1 pt-4">
                <h3 className="text-sm font-medium text-muted-foreground">{dayHeading(g.date)}</h3>
                {dayTotal > 0 && (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {money(dayTotal)}
                  </span>
                )}
              </div>
              <ul className="divide-y">
                {g.items.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/expenses/${e.id}`)}
                      className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none active:bg-muted/60"
                    >
                      <CategoryTile category={e.category} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {e.description || label(e.category)}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {label(e.category)}
                          {showEmployee && e.employee ? ` · ${e.employee.name}` : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="font-semibold tabular-nums">
                          {money(e.amount, e.currency)}
                        </span>
                        <StatusBadge status={e.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {loading && !data && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        )}

        {!loading &&
          data &&
          rows.length === 0 &&
          (all.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No expenses yet"
              description="Add your first expense. Saving as a draft is quick, and you can attach receipts later."
              action={newButton || undefined}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Nothing matches"
              description={
                query
                  ? 'Try a different search, or clear it to see everything.'
                  : 'No transactions with this status.'
              }
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setFilter('ALL');
                    setPage(1);
                  }}
                >
                  Show all transactions
                </Button>
              }
            />
          ))}
        <TransactionPagination pagination={pagination} onPageChange={setPage} scrollTarget="expense-transactions" />
      </Card>

      {/* On phones, the main action stays reachable above the tab bar. */}
      {can('expense.create') && (
        <button
          type="button"
          onClick={() => navigate('/expenses/new')}
          className="fixed bottom-[calc(6rem_+_env(safe-area-inset-bottom))] right-4 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        >
          <Plus className="h-5 w-5" /> New expense
        </button>
      )}
    </div>
  );
}
