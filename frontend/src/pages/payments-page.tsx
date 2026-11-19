import { useMemo, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { money, formatDate, todayIso, label } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

export default function PaymentsPage() {
  const approved = useFetch<Expense[]>('/expenses?status=APPROVED');
  const partial = useFetch<Expense[]>('/expenses?status=PARTIALLY_PAID');
  const open = useMemo(
    () => [...(approved.data ?? []), ...(partial.data ?? [])],
    [approved.data, partial.data],
  );

  const [expenseId, setExpenseId] = useState('');
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(todayIso());
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const selected = open.find((e) => e.id === expenseId);
  const remaining = selected ? Number(selected.amount) - Number(selected.paidAmount) : 0;

  const reloadAll = () => { approved.reload(); partial.reload(); };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await api<{ expenseStatus: string; paidAmount: number }>(`/expenses/${expenseId}/payments`, {
        method: 'POST',
        json: { amount: Number(amount), paidOn, reference: reference || undefined },
      });
      setMessage({ kind: 'ok', text: `Payment recorded. Status: ${label(res.expenseStatus)}.` });
      setAmount('');
      setReference('');
      reloadAll();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const error = approved.error || partial.error;

  return (
    <>
      <PageHeader title="Payments" description="Record payments against approved claims. Partial payments are supported." />

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {message && <div className="mb-4"><Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Record payment</CardTitle>
            <CardDescription>{selected ? `Outstanding: ${money(remaining, selected.currency)}` : 'Choose a claim'}</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <Field label="Claim">
                <Select required value={expenseId} onChange={(e) => { setExpenseId(e.target.value); setAmount(''); }}>
                  <option value="">Select…</option>
                  {open.map((e) => (
                    <option key={e.id} value={e.id}>#{e.id} · {label(e.category)} · {money(Number(e.amount) - Number(e.paidAmount))}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Amount">
                <Input type="number" step="0.01" min="0.01" max={remaining || undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Paid on">
                <Input type="date" required value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
              </Field>
              <Field label="Reference (optional)">
                <Input maxLength={100} placeholder="e.g. NEFT-1001" value={reference} onChange={(e) => setReference(e.target.value)} />
              </Field>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={busy || !expenseId}>
                {busy ? 'Saving…' : 'Record payment'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Open claims</CardTitle>
            <CardDescription>Approved and partly paid, oldest first</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {open.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-muted-foreground">No open claims.</TableCell></TableRow>
                )}
                {open.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>#{e.id}</TableCell>
                    <TableCell>{e.employee?.name ?? '—'}</TableCell>
                    <TableCell>{formatDate(e.expenseDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(e.amount, e.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(Number(e.amount) - Number(e.paidAmount), e.currency)}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
