import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';

export interface StepView {
  label: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  actedAt?: string | null;
  comment?: string | null;
}

/** Vertical approval chain. Shows what is done, what is waiting, and what comes next. */
export function ApprovalStepper({
  steps,
  planned = false,
}: {
  steps: StepView[];
  planned?: boolean;
}) {
  const currentIndex = steps.findIndex((s) => !s.status || s.status === 'PENDING');

  return (
    <ol className="space-y-5">
      {steps.map((step, i) => {
        const done = step.status === 'APPROVED';
        const rejected = step.status === 'REJECTED';
        const current = i === currentIndex && !planned;
        const last = i === steps.length - 1;

        let hint = 'Upcoming';
        if (planned) hint = 'Required approval';
        else if (done)
          hint = step.actedAt ? `Approved ${formatDateTime(step.actedAt)}` : 'Approved';
        else if (rejected) hint = 'Rejected at this step';
        else if (current) hint = 'Waiting for this approver';

        return (
          <li key={`${step.label}-${i}`} className="relative flex gap-4">
            {!last && (
              <span
                className={cn(
                  'absolute left-[13px] top-7 -bottom-5 w-px',
                  done ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-card text-xs font-semibold',
                done && 'border-primary bg-primary text-primary-foreground',
                rejected && 'border-rose-500 bg-rose-500 text-white',
                current && 'border-primary text-primary ring-4 ring-accent',
                !done && !rejected && !current && 'border-border text-muted-foreground',
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : rejected ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="text-sm font-medium">{step.label}</div>
              <div className="text-xs text-muted-foreground">{hint}</div>
              {step.comment && (
                <p className="mt-1 text-xs italic text-muted-foreground">“{step.comment}”</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
