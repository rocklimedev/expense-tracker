import { useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { money, label } from '@/lib/format';
import { APPROVAL_PERMISSIONS } from '@/lib/constants';
import type { ApprovalPolicy, ExpenseCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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

interface StepDraft {
  label: string;
  requiredPermission: string;
}

export default function PoliciesPage() {
  const { data, error } = useApiQuery<ApprovalPolicy[]>('/approval-policies');
  const categories = useApiQuery<ExpenseCategory[]>('/expense-categories');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [minAmount, setMinAmount] = useState('0');
  const [priority, setPriority] = useState('0');
  const [steps, setSteps] = useState<StepDraft[]>([
    { label: 'CA review', requiredPermission: 'expense.approve' },
  ]);
  const [busy, setBusy] = useState(false);
  const policyDialog = useRef<HTMLDialogElement>(null);
  const [createError, setCreateError] = useState<string>();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const updateStep = (i: number, patch: Partial<StepDraft>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    setCreateError(undefined);
    try {
      await writeApi('/approval-policies', {
        method: 'POST',
        json: {
          name,
          category: category || undefined,
          minAmount: Number(minAmount),
          priority: Number(priority),
          steps,
        },
      });
      setMessage({
        kind: 'ok',
        text: 'Policy created. It applies to claims submitted from now on.',
      });
      setName('');
      setCategory('');
      setMinAmount('0');
      setPriority('0');
      setSteps([{ label: 'CA review', requiredPermission: 'expense.approve' }]);
      policyDialog.current?.close();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: string) {
    setMessage(null);
    try {
      await writeApi(`/approval-policies/${id}/deactivate`, { method: 'POST' });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    }
  }

  return (
    <>
      <PageHeader
        title="Approval rules"
        description="Decide which approval chain a claim needs, based on amount and category. The highest priority match wins."
        actions={
          <Button type="button" onClick={() => policyDialog.current?.showModal()}>
            <Plus className="h-4 w-4" /> Add Policy
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <Notice kind="error">{error}</Notice>
        </div>
      )}
      {message && (
        <div className="mb-4">
          <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>
        </div>
      )}

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
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
                {data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No policies. Claims use the default single approval step.
                    </TableCell>
                  </TableRow>
                )}
                {data?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      {p.category ? label(p.category) : 'All categories'} · from{' '}
                      {money(p.minAmount)}
                    </TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell className="text-sm">
                      {p.steps.map((s) => s.label).join(' → ')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.isActive ? 'ACTIVE' : 'CLOSED'} />
                    </TableCell>
                    <TableCell className="text-right">
                      {p.isActive && (
                        <Button size="sm" variant="ghost" onClick={() => deactivate(p.id)}>
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <dialog
          ref={policyDialog}
          aria-labelledby="new-policy-title"
          className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl border bg-card text-card-foreground shadow-xl backdrop:bg-black/60"
          onCancel={(e) => { if (busy) e.preventDefault(); }}
          onClose={() => setCreateError(undefined)}
        >
          <form onSubmit={onCreate}>
            <CardHeader>
              <CardTitle id="new-policy-title">New policy</CardTitle>
              <CardDescription>Steps run in the order listed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Name">
                <Input
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Category (optional)">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.data?.map(({ code }) => (
                    <option key={code} value={code}>
                      {label(code)}
                    </option>
                  ))}
                </Select>
                {categories.error && (
                  <>
                    <Notice kind="error">{categories.error}</Notice>
                    <Button type="button" size="sm" variant="outline" onClick={categories.reload}>
                      Retry categories
                    </Button>
                  </>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min amount">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </Field>
                <Field label="Priority">
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  />
                </Field>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Approval steps</div>
                {steps.map((s, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <Input
                      required
                      placeholder="Step label"
                      aria-label={`Step ${i + 1} label`}
                      className="col-span-2 sm:col-span-1"
                      value={s.label}
                      onChange={(e) => updateStep(i, { label: e.target.value })}
                    />
                    <Select
                      aria-label={`Step ${i + 1} permission`}
                      value={s.requiredPermission}
                      onChange={(e) => updateStep(i, { requiredPermission: e.target.value })}
                    >
                      {APPROVAL_PERMISSIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove step ${i + 1}`}
                      disabled={steps.length === 1}
                      onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={steps.length >= 5}
                  onClick={() =>
                    setSteps((prev) => [
                      ...prev,
                      { label: 'Admin sign-off', requiredPermission: 'expense.approve.high' },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> Add step
                </Button>
              </div>
              {createError && <Notice kind="error">{createError}</Notice>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" variant="outline" disabled={busy} onClick={() => policyDialog.current?.close()}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !categories.data}>
                {busy ? 'Saving…' : 'Create policy'}
              </Button>
            </CardFooter>
          </form>
        </dialog>
      </div>
    </>
  );
}
