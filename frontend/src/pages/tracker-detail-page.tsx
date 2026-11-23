import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, RefreshCw, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { useAuth } from '@/context/auth-context';
import { money, formatDate, todayIso, label } from '@/lib/format';
import { FREQUENCIES } from '@/lib/constants';
import type {
  Expense,
  ExpenseCategory,
  Tracker,
  TrackerSchedule,
  TrackerSummary,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

type Feedback = { kind: 'ok' | 'error' | 'info'; text: string } | null;

export default function TrackerDetailPage() {
  const { id: trackerId } = useParams();
  const { user } = useAuth();

  const tracker = useFetch<Tracker>(`/trackers/${trackerId}`, [trackerId]);
  const summary = useFetch<TrackerSummary>(`/trackers/${trackerId}/summary`, [trackerId]);
  const schedules = useFetch<TrackerSchedule[]>(`/trackers/${trackerId}/schedules`, [trackerId]);
  const expenses = useFetch<Expense[]>(`/trackers/${trackerId}/expenses`, [trackerId]);
  const categories = useFetch<ExpenseCategory[]>('/expense-categories');
  const defaultCategory =
    categories.data?.find(({ code }) => code === 'TRAVEL')?.code ??
    categories.data?.[0]?.code ??
    '';

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  // schedule form
  const [frequency, setFrequency] = useState<string>('MONTHLY');
  const [intervalCount, setInterval] = useState('1');
  const [schedAmount, setSchedAmount] = useState('');
  const [selectedSchedCategory, setSchedCategory] = useState('');
  const schedCategory = selectedSchedCategory || defaultCategory;
  const [schedStart, setSchedStart] = useState(todayIso());
  const [schedEnd, setSchedEnd] = useState('');
  const [schedDesc, setSchedDesc] = useState('');

  // one-off expense form
  const [selectedExpCategory, setExpCategory] = useState('');
  const expCategory = selectedExpCategory || defaultCategory;
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(todayIso());
  const [expDesc, setExpDesc] = useState('');

  if (tracker.error) return <Notice kind="error">{tracker.error}</Notice>;
  if (!tracker.data) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const t = tracker.data;
  const isOwner = t.employee?.id === user?.id;
  const closed = t.status === 'CLOSED';
  const s = summary.data;

  const refreshAll = () => {
    tracker.reload();
    summary.reload();
    schedules.reload();
    expenses.reload();
  };

  async function run(action: () => Promise<unknown>, successText: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: 'ok', text: successText });
      refreshAll();
    } catch (err) {
      setFeedback({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function addSchedule(e: FormEvent) {
    e.preventDefault();
    await run(
      () =>
        api(`/trackers/${trackerId}/schedules`, {
          method: 'POST',
          json: {
            frequency,
            intervalCount: Number(intervalCount) || 1,
            amount: Number(schedAmount),
            category: schedCategory,
            startDate: schedStart,
            endDate: schedEnd || undefined,
            description: schedDesc || undefined,
          },
        }),
      'Recurring schedule added. Due drafts were generated.',
    );
    setSchedAmount('');
    setSchedDesc('');
    setSchedEnd('');
  }

  async function addExpense(e: FormEvent) {
    e.preventDefault();
    await run(
      () =>
        api(`/trackers/${trackerId}/expenses`, {
          method: 'POST',
          json: {
            category: expCategory,
            amount: Number(expAmount),
            expenseDate: expDate,
            description: expDesc || undefined,
          },
        }),
      'Expense added as a draft',
    );
    setExpAmount('');
    setExpDesc('');
  }

  async function previewDrafts() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await api<{ count: number; total: number; hasMore: boolean }>(
        `/trackers/${trackerId}/submit-drafts`,
        { method: 'POST', json: { dryRun: true } },
      );
      setFeedback({
        kind: 'info',
        text: `${res.count} draft(s) worth ${money(res.total)} would be submitted${res.hasMore ? ' (first 200 shown; more remain)' : ''}.`,
      });
    } catch (err) {
      setFeedback({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t.title}
        description={`${formatDate(t.startDate)} – ${t.endDate ? formatDate(t.endDate) : 'open-ended'}${t.employee ? ` · Owner: ${t.employee.name}` : ''}`}
        actions={
          <>
            <StatusBadge status={t.status} />
            {isOwner && !closed && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => api(`/trackers/${trackerId}/generate`, { method: 'POST' }),
                      'Due drafts generated',
                    )
                  }
                >
                  <RefreshCw className="h-4 w-4" /> Generate due
                </Button>
                <Button variant="outline" disabled={busy} onClick={previewDrafts}>
                  <Eye className="h-4 w-4" /> Preview drafts
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        api(`/trackers/${trackerId}/submit-drafts`, { method: 'POST', json: {} }),
                      'Drafts submitted for approval',
                    )
                  }
                >
                  <Send className="h-4 w-4" /> Submit drafts
                </Button>
              </>
            )}
          </>
        }
      />

      {feedback && (
        <div className="mb-4">
          <Notice
            kind={feedback.kind === 'error' ? 'error' : feedback.kind === 'info' ? 'info' : 'ok'}
          >
            {feedback.text}
          </Notice>
        </div>
      )}

      {s && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Committed" value={money(s.totals.committed)} />
          <Stat title="Paid" value={money(s.totals.paid)} />
          <Stat title="Outstanding" value={money(s.totals.outstanding)} />
          <Stat
            title="Budget remaining"
            value={s.totals.budgetRemaining === null ? '—' : money(s.totals.budgetRemaining)}
            warn={s.totals.budgetRemaining !== null && s.totals.budgetRemaining < 0}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Expenses in this tracker</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No expenses yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {expenses.data?.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link to={`/expenses/${e.id}`} className="text-primary hover:underline">
                          #{e.id}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(e.expenseDate)}</TableCell>
                      <TableCell>{label(e.category)}</TableCell>
                      <TableCell>{e.scheduleId ? 'Recurring' : 'Manual'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(e.amount, e.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring schedules</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Every</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Generated through</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.data?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No schedules.
                      </TableCell>
                    </TableRow>
                  )}
                  {schedules.data?.map((sch) => (
                    <TableRow key={sch.id}>
                      <TableCell>
                        {sch.interval > 1 ? `${sch.interval} ` : ''}
                        {label(sch.frequency)}
                      </TableCell>
                      <TableCell>{label(sch.category)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(sch.amount)}</TableCell>
                      <TableCell>
                        {sch.generatedThrough ? formatDate(sch.generatedThrough) : '—'}
                      </TableCell>
                      <TableCell>
                        {sch.active ? (
                          isOwner && !closed ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  () =>
                                    api(`/trackers/${trackerId}/schedules/${sch.id}/stop`, {
                                      method: 'POST',
                                    }),
                                  'Schedule stopped',
                                )
                              }
                            >
                              Stop
                            </Button>
                          ) : (
                            <StatusBadge status="ACTIVE" />
                          )
                        ) : (
                          <StatusBadge status="CLOSED" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {s && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly spend</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.byMonth.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-muted-foreground">
                          No spend yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {s.byMonth.map((m) => (
                      <TableRow key={m.month}>
                        <TableCell>{m.month}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(m.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {isOwner && !closed && (
          <div className="space-y-6">
            {categories.error && (
              <div className="space-y-2">
                <Notice kind="error">{categories.error}</Notice>
                <Button variant="outline" size="sm" onClick={categories.reload}>
                  Retry categories
                </Button>
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Add recurring cost</CardTitle>
              </CardHeader>
              <form onSubmit={addSchedule}>
                <CardContent className="space-y-3">
                  <Field label="Frequency">
                    <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                      {FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {label(f)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Every (intervalCount)">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={intervalCount}
                      onChange={(e) => setInterval(e.target.value)}
                    />
                  </Field>
                  <Field label="Amount">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={schedAmount}
                      onChange={(e) => setSchedAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Category">
                    <Select
                      required
                      value={schedCategory}
                      onChange={(e) => setSchedCategory(e.target.value)}
                    >
                      {categories.data?.map(({ code }) => (
                        <option key={code} value={code}>
                          {label(code)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Start date">
                    <Input
                      type="date"
                      required
                      value={schedStart}
                      onChange={(e) => setSchedStart(e.target.value)}
                    />
                  </Field>
                  <Field label="End date (optional)">
                    <Input
                      type="date"
                      value={schedEnd}
                      onChange={(e) => setSchedEnd(e.target.value)}
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <Input
                      maxLength={500}
                      value={schedDesc}
                      onChange={(e) => setSchedDesc(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy || !schedCategory}>
                    Add schedule
                  </Button>
                </CardContent>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add one-off expense</CardTitle>
              </CardHeader>
              <form onSubmit={addExpense}>
                <CardContent className="space-y-3">
                  <Field label="Category">
                    <Select
                      required
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value)}
                    >
                      {categories.data?.map(({ code }) => (
                        <option key={code} value={code}>
                          {label(code)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                    />
                  </Field>
                  <Field label="Date">
                    <Input
                      type="date"
                      required
                      min={t.startDate}
                      max={t.endDate ?? undefined}
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Description (optional)">
                    <Input
                      maxLength={500}
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    disabled={busy || !expCategory}
                  >
                    Add expense
                  </Button>
                </CardContent>
              </form>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ title, value, warn }: { title: string; value: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className={`mt-2 text-xl font-semibold tabular-nums ${warn ? 'text-red-600' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
