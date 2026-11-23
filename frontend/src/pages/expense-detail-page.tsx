import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Send, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { api, openAttachment } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { money, formatDate, formatDateTime, label } from '@/lib/format';
import type { ApprovalStep, Attachment, Expense, Payment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Notice } from '@/components/common/notice';
import { Receipt } from '@/components/common/receipt';
import { StatusBadge } from '@/components/common/status-badge';
import { CategoryTile } from '@/components/common/category-tile';
import { ApprovalStepper } from '@/components/common/approval-stepper';
import { cn } from '@/lib/utils';

type Feedback = { kind: 'ok' | 'error'; text: string } | null;

const WAITING_TEXT: Partial<Record<Expense['status'], string>> = {
  DRAFT: 'Only the person who created this draft can submit it.',
  SUBMITTED: 'Waiting for the approver to act on the current step.',
  APPROVED: 'Approved. Waiting for finance to record payment.',
  PARTIALLY_PAID: 'Partly paid. Waiting for the balance.',
  PAID: 'Fully paid. Nothing left to do.',
  REJECTED: 'Rejected. The employee can revise it and resubmit.',
};

export default function ExpenseDetailPage() {
  const { id: expenseId } = useParams();
  const location = useLocation();
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

  // A notice can arrive from the new-expense page when a draft saved but could not be submitted.
  const [feedback, setFeedback] = useState<Feedback>(() => {
    const notice = (location.state as { notice?: string } | null)?.notice;
    return notice ? { kind: 'error', text: notice } : null;
  });
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
  const showDecision = canApprove || canReject;

  const amount = Number(expense.amount);
  const paid = Number(expense.paidAmount);
  const outstanding = amount - paid;

  const planned = !expense.approvals?.length;
  const steps: ApprovalStep[] = expense.approvals?.length
    ? expense.approvals
    : canPreview && preview
      ? preview
      : [];

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

  const submit = () =>
    run(() => api(`/expenses/${expense.id}/submit`, { method: 'POST' }), 'Submitted for approval');

  const approve = () =>
    run(
      () =>
        api(`/expenses/${expense.id}/approve`, {
          method: 'POST',
          json: { comment: comment || undefined },
        }),
      'Step approved',
    ).then(() => setComment(''));

  const reject = (e: FormEvent) => {
    e.preventDefault();
    run(
      () =>
        api(`/expenses/${expense.id}/reject`, { method: 'POST', json: { reason: rejectReason } }),
      'Expense rejected',
    ).then(() => {
      setShowReject(false);
      setRejectReason('');
    });
  };

  const upload = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    run(
      () => api(`/expenses/${expense.id}/attachments`, { method: 'POST', body: form }),
      'Receipt uploaded',
    );
    ev.target.value = '';
  };

  const actionHint = editable
    ? expense.status === 'REJECTED'
      ? 'Address the reason below, then resubmit.'
      : 'Add receipts if you have them, then submit.'
    : showDecision
      ? 'Review the claim, then approve or reject this step.'
      : (WAITING_TEXT[expense.status] ?? 'No action needed from you right now.');

  return (
    <div className="space-y-6">
      <Link
        to="/expenses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All expenses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <CategoryTile category={expense.category} className="h-12 w-12 rounded-2xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {expense.description || `${label(expense.category)} expense`}
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {label(expense.category)} · {formatDate(expense.expenseDate)}
              {expense.employee ? ` · ${expense.employee.name}` : ''}
            </p>
          </div>
        </div>
        <StatusBadge status={expense.status} />
      </div>

      {feedback && <Notice kind={feedback.kind === 'ok' ? 'ok' : 'error'}>{feedback.text}</Notice>}
      {expense.status === 'REJECTED' && expense.rejectionReason && (
        <Notice kind="error">Rejected: {expense.rejectionReason}</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next-step panel comes first on mobile, last-in-column on desktop. */}
        <aside className="order-first space-y-6 lg:order-last">
          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Next step</CardTitle>
              <CardDescription>{actionHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {editable && (
                <Button className="h-10 w-full" disabled={busy} onClick={submit}>
                  <Send className="h-4 w-4" />{' '}
                  {expense.status === 'REJECTED' ? 'Resubmit for approval' : 'Submit for approval'}
                </Button>
              )}

              {showDecision && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Comment for the record (optional)"
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  {canApprove && (
                    <Button className="h-10 w-full" disabled={busy} onClick={approve}>
                      Approve this step
                    </Button>
                  )}
                  {canReject && !showReject && (
                    <Button
                      variant="outline"
                      className="h-10 w-full"
                      onClick={() => setShowReject(true)}
                    >
                      Reject…
                    </Button>
                  )}
                  {canReject && showReject && (
                    <form
                      onSubmit={reject}
                      className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3"
                    >
                      <Textarea
                        required
                        minLength={3}
                        maxLength={500}
                        placeholder="Tell the employee what needs to change"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowReject(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="destructive"
                          className="flex-1"
                          disabled={busy}
                        >
                          Reject claim
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-6 lg:col-span-2">
          <Receipt
            reference={expense.id.slice(0, 8).toUpperCase()}
            amount={amount}
            paid={paid}
            outstanding={outstanding}
            currency={expense.currency}
            lines={[
              { label: 'Category', value: label(expense.category) },
              { label: 'Expense date', value: formatDate(expense.expenseDate) },
              {
                label: 'Submitted',
                value: expense.submittedAt ? formatDateTime(expense.submittedAt) : 'Not yet',
              },
              ...(expense.employee ? [{ label: 'Employee', value: expense.employee.name }] : []),
              { label: 'Note', value: expense.description || '—' },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle>Approval chain</CardTitle>
              <CardDescription>
                {planned
                  ? 'Who will need to approve this, based on the amount.'
                  : 'Each step must be approved in order.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {steps.length > 0 ? (
                <ApprovalStepper steps={steps} planned={planned} />
              ) : (
                <p className="text-sm text-muted-foreground">Not submitted yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
              <CardDescription>Keep a copy of every receipt with the claim.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attachments?.length === 0 && !editable && (
                <p className="text-sm text-muted-foreground">No receipts attached.</p>
              )}
              {attachments?.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.originalName}</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round(a.sizeBytes / 1024))} KB
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openAttachment(a.id).catch((err) =>
                        setFeedback({ kind: 'error', text: err.message }),
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5" /> Open
                  </Button>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${a.originalName}`}
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove "${a.originalName}" from this claim? This cannot be undone.`,
                          )
                        ) {
                          run(
                            () => api(`/attachments/${a.id}`, { method: 'DELETE' }),
                            'Receipt removed',
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              {editable && (
                <label
                  className={cn(
                    'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed p-6 text-center transition-colors hover:border-primary hover:bg-accent/40 focus-within:ring-2 focus-within:ring-ring',
                    busy && 'pointer-events-none opacity-60',
                  )}
                >
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Add a receipt</span>
                  <span className="text-xs text-muted-foreground">
                    JPEG, PNG, WEBP or PDF · up to 5 MB
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={upload}
                    disabled={busy}
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {payments && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6">Paid on</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="px-6 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="px-6">{formatDate(p.paidOn)}</TableCell>
                        <TableCell>{p.reference || '—'}</TableCell>
                        <TableCell className="px-6 text-right font-medium tabular-nums">
                          {money(p.amount, expense.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="px-6 text-muted-foreground">
                          No payments yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {expense.history?.length ? (
                <ol className="ml-2 space-y-5 border-l pl-6">
                  {expense.history.map((h) => (
                    <li key={h.id} className="relative">
                      <span
                        className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card"
                        aria-hidden
                      />
                      <div className="text-sm font-medium">
                        {h.fromStatus ? `${label(h.fromStatus)} → ` : ''}
                        {label(h.toStatus)}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(h.createdAt)}
                        {h.comment ? ` · ${h.comment}` : ''}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
