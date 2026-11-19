import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, FilePen, Plus, Receipt, Search, Wallet } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useFetch } from '@/lib/use-fetch';
import { money, formatDate, label } from '@/lib/format';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { CategoryTile } from '@/components/common/category-tile';
import { StatCard } from '@/components/common/stat-card';
import { EmptyState } from '@/components/common/empty-state';
import { Notice } from '@/components/common/notice';

type Tab = 'ALL' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

// Each tab groups the raw statuses a person actually thinks of together.
const TABS: { value: Tab; label: string; match: ExpenseStatus[] }[] = [
  { value: 'ALL', label: 'All', match: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID'] },
  { value: 'DRAFT', label: 'Drafts', match: ['DRAFT'] },
  { value: 'PENDING', label: 'Pending', match: ['SUBMITTED'] },
  { value: 'APPROVED', label: 'Approved', match: ['APPROVED', 'PARTIALLY_PAID'] },
  { value: 'PAID', label: 'Paid', match: ['PAID'] },
  { value: 'REJECTED', label: 'Rejected', match: ['REJECTED'] },
];

function searchText(e: Expense) {
  return [label(e.category), e.description ?? '', e.employee?.name ?? '', String(e.amount)].join(' ').toLowerCase();
}

export default function ExpensesPage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading } = useFetch<Expense[]>('/expenses');
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');

  const all = useMemo(() => data ?? [], [data]);
  const showEmployee = can('expense.view.all');
  const firstName = user?.name?.split(' ')[0];

  const stats = useMemo(() => {
    const pending = all.filter((e) => e.status === 'SUBMITTED');
    const unpaid = all.filter((e) => e.status === 'APPROVED' || e.status === 'PARTIALLY_PAID');
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((sum, e) => sum + Number(e.amount), 0),
      unpaidTotal: unpaid.reduce((sum, e) => sum + Number(e.amount) - Number(e.paidAmount), 0),
      paidTotal: all.reduce((sum, e) => sum + Number(e.paidAmount), 0),
      drafts: all.filter((e) => e.status === 'DRAFT').length,
    };
  }, [all]);

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0];
  const counts = TABS.map((t) => all.filter((e) => t.match.includes(e.status)).length);

  const q = query.trim().toLowerCase();
  const rows = all
    .filter((e) => activeTab.match.includes(e.status) && (!q || searchText(e).includes(q)))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  const newButton = can('expense.create') && (
    <Button onClick={() => navigate('/expenses/new')}>
      <Plus className="h-4 w-4" /> New expense
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        description={firstName ? `Hi ${firstName}, here is where your claims stand.` : 'Claims and where they stand.'}
        actions={newButton}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Awaiting approval"
          value={data ? money(stats.pendingTotal) : '—'}
          hint={`${stats.pendingCount} ${stats.pendingCount === 1 ? 'claim' : 'claims'} in review`}
          icon={Clock}
          tone="bg-amber-50 text-amber-700"
        />
        <StatCard
          label="Approved, unpaid"
          value={data ? money(stats.unpaidTotal) : '—'}
          hint="Waiting for payment"
          icon={CheckCircle2}
          tone="bg-sky-50 text-sky-700"
        />
        <StatCard
          label="Paid out"
          value={data ? money(stats.paidTotal) : '—'}
          hint="Total received so far"
          icon={Wallet}
          tone="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          label="Drafts"
          value={data ? String(stats.drafts) : '—'}
          hint="Saved, not submitted"
          icon={FilePen}
          tone="bg-slate-100 text-slate-700"
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map((t, i) => {
              const active = t.value === tab;
              return (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {t.label}
                  <span
                    className={cn(
                      'min-w-[1.25rem] rounded-full px-1.5 text-center text-xs tabular-nums',
                      active ? 'bg-background/20' : 'bg-muted',
                    )}
                  >
                    {counts[i]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Search claims"
              aria-label="Search claims"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="p-4"><Notice kind="error">{error}</Notice></div>}

        {/* Desktop: table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-5">Category</TableHead>
                {showEmployee && <TableHead>Employee</TableHead>}
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-5">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/expenses/${e.id}`)}
                >
                  <TableCell className="px-5">
                    <div className="flex items-center gap-3">
                      <CategoryTile category={e.category} />
                      <div className="min-w-0">
                        <div className="font-medium">{label(e.category)}</div>
                        <div className="max-w-xs truncate text-xs text-muted-foreground">{e.description || 'No description'}</div>
                      </div>
                    </div>
                  </TableCell>
                  {showEmployee && <TableCell className="text-muted-foreground">{e.employee?.name ?? '—'}</TableCell>}
                  <TableCell className="text-muted-foreground">{formatDate(e.expenseDate)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(e.amount, e.currency)}</TableCell>
                  <TableCell className="pr-5"><StatusBadge status={e.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: stacked cards */}
        <ul className="divide-y md:hidden">
          {rows.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => navigate(`/expenses/${e.id}`)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/60"
              >
                <CategoryTile category={e.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{label(e.category)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{money(e.amount, e.currency)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-muted-foreground">
                      {formatDate(e.expenseDate)}
                      {e.description ? ` · ${e.description}` : ''}
                    </span>
                    <StatusBadge status={e.status} />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {loading && !data && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Loading your claims…</p>}

        {!loading && data && rows.length === 0 && (
          all.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No expenses yet"
              description="Add your first claim. Saving as a draft is quick, and you can attach receipts later."
              action={can('expense.create') ? newButton : undefined}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Nothing matches"
              description={query ? 'Try a different search, or clear it to see everything.' : 'No claims in this view.'}
              action={
                <Button variant="outline" onClick={() => { setQuery(''); setTab('ALL'); }}>
                  Show all claims
                </Button>
              }
            />
          )
        )}
      </Card>
    </>
  );
}
