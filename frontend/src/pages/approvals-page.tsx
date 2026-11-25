import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { useAuth } from '@/context/auth-context';
import { money, formatDate, label } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/common/page-header';
import { Notice } from '@/components/common/notice';

interface QueueItem {
  id: string;
  employee: { id: string; name: string };
  category: string;
  amount: number;
  expenseDate: string;
  submittedAt: string;
  currentStep: { stepOrder: number; label: string };
  totalSteps: number;
}

interface BatchResult {
  approved: string[];
  failed: { id: string; error: string }[];
}

export default function ApprovalsPage() {
  const { can } = useAuth();
  const { data, error, loading } = useApiQuery<QueueItem[]>('/expenses/queue/pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const items = useMemo(() => data ?? [], [data]);
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const canBatch = can('expense.batch_approve');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  async function approveOne(id: string) {
    await run(
      () =>
        writeApi(`/expenses/${id}/approve`, { method: 'POST', json: { comment: comment || undefined } }),
      'Approved',
    );
  }

  async function rejectOne(e: FormEvent) {
    e.preventDefault();
    if (rejectingId === null) return;
    await run(
      () =>
        writeApi(`/expenses/${rejectingId}/reject`, { method: 'POST', json: { reason: rejectReason } }),
      'Rejected',
    );
    setRejectingId(null);
    setRejectReason('');
  }

  async function approveBatch() {
    setBusy(true);
    setMessage(null);
    setBatchResult(null);
    try {
      const result = await writeApi<BatchResult>('/expenses/batch/approve', {
        method: 'POST',
        json: { ids: [...selected], comment: comment || undefined },
      });
      setBatchResult(result);
      setSelected(new Set());
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<unknown>, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: 'ok', text: okText });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="To approve"
        description="Claims waiting for your approval step."
        actions={
          canBatch && (
            <Button disabled={busy || selected.size === 0} onClick={approveBatch}>
              <Check className="h-4 w-4" /> Approve selected ({selected.size})
            </Button>
          )
        }
      />

      {error && <Notice kind="error">{error}</Notice>}
      {message && (
        <div className="mb-4">
          <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>
        </div>
      )}

      {batchResult && (
        <div className="mb-4">
          <Notice kind={batchResult.failed.length ? 'info' : 'ok'}>
            Approved {batchResult.approved.length} claim(s).
            {batchResult.failed.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {batchResult.failed.map((f) => (
                  <li key={f.id}>
                    #{f.id}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </Notice>
        </div>
      )}

      <div className="mb-4 max-w-md">
        <Input
          placeholder="Optional comment for approvals"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending</CardTitle>
          <CardDescription>{items.length} claim(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {canBatch && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  </TableHead>
                )}
                <TableHead>Claim</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Current step</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow>
                  <TableCell colSpan={8}>Loading…</TableCell>
                </TableRow>
              )}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Nothing waiting for you.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item) => (
                <Fragment key={item.id}>
                  <TableRow>
                    {canBatch && (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select #${item.id}`}
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        to={`/expenses/${item.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{item.id}
                      </Link>
                    </TableCell>
                    <TableCell>{item.employee?.name}</TableCell>
                    <TableCell>{label(item.category)}</TableCell>
                    <TableCell>{formatDate(item.expenseDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(item.amount)}</TableCell>
                    <TableCell>
                      {item.currentStep.stepOrder}/{item.totalSteps} · {item.currentStep.label}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setRejectingId(item.id)}
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" disabled={busy} onClick={() => approveOne(item.id)}>
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {rejectingId === item.id && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <form onSubmit={rejectOne} className="flex items-start gap-2">
                          <Textarea
                            required
                            minLength={3}
                            maxLength={500}
                            placeholder="Reason for rejecting this claim"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRejectingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" variant="destructive" disabled={busy}>
                            Confirm reject
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
