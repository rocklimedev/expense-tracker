import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { money, label } from '@/lib/format';
import { APPROVAL_PERMISSIONS, CATEGORIES } from '@/lib/constants';
import type { ApprovalPolicy } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

interface StepDraft { label: string; requiredPermission: string }

export default function PoliciesPage() {
  const { data, error, reload } = useFetch<ApprovalPolicy[]>('/approval-policies');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [priority, setPriority] = useState('0');
  const [steps, setSteps] = useState<StepDraft[]>([{ label: 'CA review', requiredPermission: 'expense.approve' }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const updateStep = (i: number, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api('/approval-policies', {
        method: 'POST',
        json: {
          name,
          category: category || undefined,
          minAmount: Number(minAmount),
          priority: Number(priority),
          steps,
        },
      });
      setMessage({ kind: 'ok', text: 'Policy created. It applies to claims submitted from now on.' });
      setName('');
      setSteps([{ label: 'CA review', requiredPermission: 'expense.approve' }]);
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    setMessage(null);
    try {
      await api(`/approval-policies/${id}/deactivate`, { method: 'POST' });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <>
      <PageHeader title="Approval policies" description="Decide which approval chain a claim needs, based on amount and category. The highest priority match wins." />

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {message && <div className="mb-4"><Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Applies to</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">No policies. Claims use the default single approval step.</TableCell></TableRow>}
                {data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.category ? label(p.category) : 'All categories'} · from {money(p.minAmount)}
                    </TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell className="text-sm">{p.steps.map((s) => s.label).join(' → ')}</TableCell>
                    <TableCell><StatusBadge status={p.isActive ? 'ACTIVE' : 'CLOSED'} /></TableCell>
                    <TableCell className="text-right">
                      {p.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => deactivate(p.id)}>Deactivate</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={onCreate}>
            <CardHeader>
              <CardTitle>New policy</CardTitle>
              <CardDescription>Steps run in the order listed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Name">
                <Input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Category (optional)">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min amount">
                  <Input type="number" min="0" step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                </Field>
                <Field label="Priority">
                  <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
                </Field>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Approval steps</div>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input required placeholder="Step label" value={s.label} onChange={(e) => updateStep(i, { label: e.target.value })} />
                    <Select value={s.requiredPermission} onChange={(e) => updateStep(i, { requiredPermission: e.target.value })}>
                      {APPROVAL_PERMISSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </Select>
                    <Button type="button" variant="ghost" size="icon" disabled={steps.length === 1} onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" disabled={steps.length >= 5} onClick={() => setSteps((prev) => [...prev, { label: 'Admin sign-off', requiredPermission: 'expense.approve.high' }])}>
                  <Plus className="h-3.5 w-3.5" /> Add step
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Create policy'}</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
