import { cn } from '@/lib/utils';
import { label } from '@/lib/format';

const STYLES: Record<string, { pill: string; dot: string }> = {
  DRAFT: { pill: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  SUBMITTED: { pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  APPROVED: { pill: 'bg-sky-50 text-sky-800', dot: 'bg-sky-500' },
  PARTIALLY_PAID: { pill: 'bg-violet-50 text-violet-800', dot: 'bg-violet-500' },
  PAID: { pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  REJECTED: { pill: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  PENDING: { pill: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  ACTIVE: { pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  CLOSED: { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

/** Status pill with a coloured dot. Keeps the same props as before, so every page works. */
export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? { pill: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' };
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', style.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />
      {label(status)}
    </span>
  );
}
