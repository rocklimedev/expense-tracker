import { useState } from 'react';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { label, money } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { useApiQuery } from '@/lib/api-query';

type ReportRow = {
  id: string;
  name: string;
  currency: string;
  count: number;
  claimed: number;
  paid: number;
  outstanding: number;
};

function summarize(
  expenses: Expense[],
  group: (expense: Expense) => { id: string; name: string },
) {
  const rows = new Map<string, ReportRow>();
  for (const expense of expenses) {
    const { id, name } = group(expense);
    const key = `${id}/${expense.currency}`;
    let row = rows.get(key);
    if (!row) {
      row = { id: key, name, currency: expense.currency, count: 0, claimed: 0, paid: 0, outstanding: 0 };
      rows.set(key, row);
    }
    const claimed = Math.round(Number(expense.amount) * 100);
    const paid = Math.round(Number(expense.paidAmount) * 100);
    row.count++;
    row.claimed += claimed;
    row.paid += paid;
    if (expense.status === 'APPROVED' || expense.status === 'PARTIALLY_PAID') {
      row.outstanding += Math.max(0, claimed - paid);
    }
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name) || a.currency.localeCompare(b.currency));
}

function ReportTable({ title, groupLabel, rows }: { title: string; groupLabel: string; rows: ReportRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{groupLabel}</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Approved outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}{groupLabel !== 'Currency' && <span className="ml-2 text-xs text-muted-foreground">{row.currency}</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.claimed / 100, row.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.paid / 100, row.currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(row.outstanding / 100, row.currency)}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={5}>No matching expenses.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const member = (expense: Expense) => ({
  id: expense.employeeId,
  name: expense.employee?.name ?? expense.employeeId,
});
const category = (expense: Expense) => ({ id: expense.category, name: label(expense.category) });
const statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID'];

export default function ReportsPage() {
  const { data: expenses, error } = useApiQuery<Expense[]>('/expenses');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [memberId, setMemberId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const all = expenses ?? [];
  const members = [...new Map(all.map((expense) => [expense.employeeId, member(expense)])).values()];
  const categories = [...new Set(all.map((expense) => expense.category))].sort();
  const invalidRange = Boolean(from && to && from > to);
  const filtered = all.filter((expense) =>
    (!from || expense.expenseDate >= from) && (!to || expense.expenseDate <= to)
    && (!memberId || expense.employeeId === memberId)
    && (!categoryId || expense.category === categoryId)
    && (!status || expense.status === status),
  );

  return (
    <>
      <PageHeader title="Reports" description="Review expense totals across categories and team members." />
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <Field htmlFor="report-from" label="Expense date from"><Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field htmlFor="report-to" label="Expense date to"><Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
            <Field htmlFor="report-category" label="Category">
              <Select id="report-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((id) => <option key={id} value={id}>{label(id)}</option>)}
              </Select>
            </Field>
            <Field htmlFor="report-member" label="Team member">
              <Select id="report-member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">All team members</option>
                {members.sort((a, b) => a.name.localeCompare(b.name)).map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </Select>
            </Field>
            <Field htmlFor="report-status" label="Status">
              <Select id="report-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {statuses.map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </Select>
            </Field>
          </CardContent>
        </Card>
        {error && <Notice kind="error">{error}</Notice>}
        {!expenses && !error && <p role="status" className="text-sm text-muted-foreground">Loading report…</p>}
        {invalidRange && <Notice kind="error">Start date must be on or before the end date.</Notice>}
        {expenses && !error && !invalidRange && (
          <>
            <ReportTable title="Overall totals" groupLabel="Currency" rows={summarize(filtered, (expense) => ({ id: expense.currency, name: expense.currency }))} />
            <ReportTable title="By category" groupLabel="Category" rows={summarize(filtered, category)} />
            <ReportTable title="By team member" groupLabel="Team member" rows={summarize(filtered, member)} />
          </>
        )}
      </div>
    </>
  );
}
