import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Send, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api, openAttachment } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { money, formatDate, formatDateTime, label } from '@/lib/format';
import type { ApprovalStep, Attachment, Expense, Payment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { Notice } from '@/components/common/notice';
import { Field } from '@/components/common/field';

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

export default function ExpenseDetailPage() {
  const { id } = useParams();
  const expenseId = Number(id);
  const { user, can } = useAuth();

  const { data: expense, error, reload } = useFetch<Expense>(`/expenses/${expenseId}`, [expenseId]);
  const { data: attachments, reload: reloadAttachments } = useFetch<Attachment[]>(
    `/expenses/${expenseId}/attachments`,
    [expenseId],
  );
  const { data: payments, reload: reloadPayments } = useFetch<Payment[]>(
    can('payment.record') ? `/expenses/${expenseId}/payments` : null,
    [expenseId],
  );
  const canPreview = expense && (expense.status === 'DRAFT' || expense.status === 'REJECTED');
  const { data: preview } = useFetch<ApprovalStep[]>(
    canPreview
      ? `/approval-policies/preview?amount=${Number(expense.amount)}&category=${encodeURIComponent(expense.category)}`
      : null,
    [expense?.status, expense?.amount],
  );

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!expense) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const isOwner = expense.employeeId === user?.id;
  const editable = isOwner && (expense.status === 'DRAFT' || expense.status === 'REJECTED');
  const canApprove = can('expense.approve') && !isOwner && expense.status === 'SUBMITTED';
  const canReject = can('expense.reject') && !isOwner && expense.status === 'SUBMITTED';
  const outstanding = Number(expense.amount) - Number(expense.paidAmount);

  async function run(action: () => Promise<unknown>, successText: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: 'ok', text: successText });
      reload();
      reloadAttachments();
      reloadPayments();
    } catch (err) {
      setFeedback({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const submit = () => run(() => api(`/expenses/${expense.id}/submit`, { method: 'POST' }), 'Submitted for approval');

  const approve = () =>
    run(
      () => api(`/expenses/${expense.id}/approve`, { method: 'POST', json: { comment: comment || undefined } }),
      'Step approved',
    );

  const reject = (e: FormEvent) => {
    e.preventDefault();
    run(
      () => api(`/expenses/${expense.id}/reject`, { method: 'POST', json: { reason: rejectReason } }),
      'Expense rejected',
    ).then(() => { setShowReject(false); setRejectReason(''); });
  };

  const upload = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    run(() => api(`/expenses/${expense.id}/attachments`, { method: 'POST', body: form }), 'Receipt uploaded');
    ev.target.value = '';
  };

  return (
    <>
      <PageHeader
        title={`Expense #${expense.id}`}
        description={`${label(expense.category)} · ${formatDate(expense.expenseDate)}${expense.employee ? ` · ${expense.employee.name}` : ''}`}
        actions={<StatusBadge status={expense.status} />}
      />

      {feedback && <div className="mb-4"><Notice kind={feedback.kind === 'ok' ? 'ok' : 'error'}>{feedback.text}</Notice></div>}
      {expense.status === 'REJECTED' && expense.rejectionReason && (
        <div className="mb-4"><Notice kind="error">Rejected: {expense.rejectionReason}</Notice></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Info label="Amount" value={money(expense.amount, expense.currency)} />
              <Info label="Paid" value={money(expense.paidAmount, expense.currency)} />
              <Info label="Outstanding" value={money(outstanding, expense.currency)} />
              <Info label="Submitted" value={formatDateTime(expense.submittedAt)} />
              <div className="col-span-2">
                <Info label="Description" value={expense.description || '—'} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval chain</CardTitle>
              <CardDescription>Each step must be approved in order.</CardDescription>
            </CardHeader>
            <CardContent>
              {!expense.approvals?.length && canPreview && preview && (
                <p className="mb-3 text-sm text-muted-foreground">
                  Will require: {preview.map((s) => s.label).join(' → ')}
                </p>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expense.approvals?.map((s) => (
                    <TableRow key={s.stepOrder}>
                      <TableCell>{s.stepOrder}. {s.label}</TableCell>
                      <TableCell className="text-muted-foreground">{s.requiredPermission}</TableCell>
                      <TableCell><StatusBadge status={s.status ?? 'PENDING'} /></TableCell>
                      <TableCell>{s.actedAt ? formatDateTime(s.actedAt) : '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!expense.approvals?.length && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">Not submitted yet.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {attachments?.length === 0 && <p className="text-sm text-muted-foreground">No receipts attached.</p>}
              {attachments?.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span className="truncate">{a.originalName} <span className="text-muted-foreground">({Math.round(a.sizeBytes / 1024)} KB)</span></span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openAttachment(a.id).catch((err) => setFeedback({ kind: 'error', text: err.message }))}>
                      <Download className="h-3.5 w-3.5" /> Open
                    </Button>
                    {editable && (
                      <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(() => api(`/attachments/${a.id}`, { method: 'DELETE' }), 'Receipt removed')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {editable && (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary">
                  <Upload className="h-4 w-4" /> Upload receipt (JPEG, PNG, WEBP or PDF, max 5 MB)
                  <Input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={upload} disabled={busy} />
                </label>
              )}
            </CardContent>
          </Card>

          {payments && (
            <Card>
              <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paid on</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.paidOn)}</TableCell>
                        <TableCell>{p.reference || '—'}</TableCell>
                        <TableCell className="text-right">{money(p.amount, expense.currency)}</TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">No payments yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {expense.history?.map((h) => (
                  <li key={h.id} className="border-l-2 border-muted pl-4">
                    <div className="font-medium">
                      {h.fromStatus ? `${label(h.fromStatus)} → ` : ''}{label(h.toStatus)}
                    </div>
                    <div className="text-muted-foreground">{formatDateTime(h.createdAt)}{h.comment ? ` · ${h.comment}` : ''}</div>
                  </li>
                ))}
                {!expense.history?.length && <li className="text-muted-foreground">No activity yet.</li>}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {editable && (
                <Button className="w-full" disabled={busy} onClick={submit}>
                  <Send className="h-4 w-4" /> Submit for approval
                </Button>
              )}
              {canApprove && (
                <div className="space-y-2">
                  <Textarea placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Button className="w-full" disabled={busy} onClick={approve}>Approve current step</Button>
                </div>
              )}
              {canReject && !showReject && (
                <Button variant="outline" className="w-full" onClick={() => setShowReject(true)}>Reject…</Button>
              )}
              {canReject && showReject && (
                <form onSubmit={reject} className="space-y-2">
                  <Textarea required minLength={3} maxLength={500} placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowReject(false)}>Cancel</Button>
                    <Button type="submit" variant="destructive" className="flex-1" disabled={busy}>Reject</Button>
                  </div>
                </form>
              )}
              {!editable && !canApprove && !canReject && (
                <p className="text-sm text-muted-foreground">No actions available for your role at this stage.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
