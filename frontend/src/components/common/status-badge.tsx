import { cn } from '@/lib/utils';
import { label } from '@/lib/format';

// Three meanings only: waiting on someone (amber), settled (green), and everything else (neutral).
const WAITING = 'bg-amber-50 text-amber-800';
const DONE = 'bg-emerald-50 text-emerald-800';
const NEUTRAL = 'bg-slate-100 text-slate-700';
const STYLES: Record<string, string> = {
  DRAFT: NEUTRAL,
  SUBMITTED: WAITING,
  APPROVED: WAITING,
  PARTIALLY_PAID: WAITING,
  PAID: DONE,
  REIMBURSEMENT_CANCELLED: NEUTRAL,
  REJECTED: 'bg-rose-50 text-rose-700',
  PENDING: NEUTRAL,
  ACTIVE: DONE,
  CLOSED: NEUTRAL,
};

/** Status pill with a coloured dot. Keeps the same props as before, so every page works. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        STYLES[status] ?? NEUTRAL,
      )}
    >
      {label(status)}
    </span>
  );
}
