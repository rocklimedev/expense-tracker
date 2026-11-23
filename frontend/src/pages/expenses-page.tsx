import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useFetch } from '@/lib/use-fetch';
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
} from '@/lib/spend';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { CategoryTile } from '@/components/common/category-tile';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';
import { MonthlyBars, CategoryBreakdown } from '@/components/common/spend-chart';

type Filter = 'ALL' | 'PENDING' | 'TO_REIMBURSE' | 'PAID' | 'DRAFT' | 'REJECTED';

const FILTERS: { value: Filter; label: string; match: ExpenseStatus[] }[] = [
  {
    value: 'ALL',
    label: 'All',
    match: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID'],
  },
  { value: 'PENDING', label: 'Pending approval', match: ['SUBMITTED'] },
  { value: 'TO_REIMBURSE', label: 'To reimburse', match: ['APPROVED', 'PARTIALLY_PAID'] },
  { value: 'PAID', label: 'Paid', match: ['PAID'] },
  { value: 'DRAFT', label: 'Drafts', match: ['DRAFT'] },
  { value: 'REJECTED', label: 'Rejected', match: ['REJECTED'] },
];

function searchText(e: Expense) {
  return [label(e.category), e.description ?? '', e.employee?.name ?? '', String(e.amount)]
    .join(' ')
    .toLowerCase();
}

function Metric({
  label: text,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="text-xs font-medium text-muted-foreground">{text}</div>
      <div className={cn('mt-1.5 text-xl font-semibold tabular-nums', tone)}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

export default function ExpensesPage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useFetch<Expense[]>('/expenses');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

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
          .reduce((s, e) => s + num(e.amount), 0),
      })),
    [all, months],
  );

  const monthClaims = useMemo(
    () => all.filter((e) => isSpend(e) && monthKey(e.expenseDate) === thisMonth),
    [all, thisMonth],
  );
  const monthTotal = monthClaims.reduce((s, e) => s + num(e.amount), 0);
  const lastMonthTotal = spendByMonth[spendByMonth.length - 2]?.total ?? 0;
  const change =
    lastMonthTotal > 0 ? Math.round(((monthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null;
  const categories = useMemo(() => categoryTotals(monthClaims), [monthClaims]);

  const awaiting = all.filter((e) => e.status === 'SUBMITTED');
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
  const groups = useMemo(() => groupByDay(rows), [rows]);

  const newButton = can('expense.create') && (
    <Button onClick={() => navigate('/expenses/new')}>
      <Plus className="h-4 w-4" /> New expense
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        description={
          firstName
            ? `Hi ${firstName}, here is where your money has gone.`
            : 'Where your money has gone.'
        }
        actions={newButton}
      />

      {/* Headline: what was spent this month, and the trend. */}
      <Card className="overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">
              Spent in {monthName(thisMonth, true)}
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">
              {data ? money(monthTotal) : '—'}
            </p>
            {change !== null && (
              <p
                className={cn(
                  'mt-3 inline-flex items-center gap-1.5 text-sm font-medium',
                  change > 0 ? 'text-rose-600' : 'text-emerald-700',
                )}
              >
                {change > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {Math.abs(change)}% {change > 0 ? 'more' : 'less'} than {monthName(lastMonth, true)}
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric
                label="Awaiting approval"
                value={data ? money(awaiting.reduce((s, e) => s + num(e.amount), 0)) : '—'}
                sub={`${awaiting.length} ${awaiting.length === 1 ? 'claim' : 'claims'}`}
                tone="text-amber-700"
              />
              <Metric
                label="To reimburse"
                value={data ? money(toReimburseTotal) : '—'}
                sub="Approved, not yet paid"
                tone="text-sky-700"
              />
            </div>
          </div>
          <div className="lg:col-span-3">
            <p className="mb-5 text-sm font-medium">Last six months</p>
            <MonthlyBars data={spendByMonth} />
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="p-6 sm:p-8 lg:col-span-2">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-semibold tracking-tight">Where it went</h2>
            <span className="text-sm text-muted-foreground">{monthName(thisMonth, true)}</span>
          </div>
          {categories.length > 0 ? (
            <CategoryBreakdown rows={categories} total={monthTotal} />
          ) : (
            <p className="text-sm text-muted-foreground">No spending recorded this month yet.</p>
          )}
        </Card>

        {/* Transaction feed, grouped by day. */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="flex flex-col gap-3 border-b p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="px-1 font-semibold tracking-tight">Transactions</h2>
              <div className="relative sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pl-9"
                  placeholder="Search spending"
                  aria-label="Search spending"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
            <div
              className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1"
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
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-4">
              <Notice kind="error">{error}</Notice>
            </div>
          )}

          {groups.map((g) => {
            const dayTotal = g.items.filter(isSpend).reduce((s, e) => s + num(e.amount), 0);
            return (
              <section key={g.date} aria-label={dayHeading(g.date)}>
                <div className="flex items-baseline justify-between bg-muted/40 px-5 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {dayHeading(g.date)}
                  </h3>
                  {dayTotal > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
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
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
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
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Loading your transactions…
            </p>
          )}

          {!loading &&
            data &&
            rows.length === 0 &&
            (all.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No expenses yet"
                description="Add your first expense. Saving as a draft is quick, and you can attach receipts later."
                action={can('expense.create') ? newButton : undefined}
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
                    }}
                  >
                    Show all transactions
                  </Button>
                }
              />
            ))}
        </Card>
      </div>

      {/* On phones the header button scrolls out of view, so keep the main action reachable above the tab bar. */}
      {can('expense.create') && (
        <button
          type="button"
          onClick={() => navigate('/expenses/new')}
          className="fixed bottom-24 right-5 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
        >
          <Plus className="h-5 w-5" /> New expense
        </button>
      )}
    </>
  );
}
