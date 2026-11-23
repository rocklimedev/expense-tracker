import { cn } from '@/lib/utils';
import { money, label, todayIso } from '@/lib/format';
import { categoryMeta } from '@/lib/category-meta';
import { monthName } from '@/lib/spend';

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const BAR_AREA_PX = 112; // h-28

/** Simple monthly bars. The current month is solid, earlier months are muted. */
export function MonthlyBars({ data }: { data: { key: string; total: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const current = todayIso().slice(0, 7);
  const summary = data.map((d) => `${monthName(d.key, true)}: ${money(d.total)}`).join(', ');

  return (
    <div role="img" aria-label={`Spending for the last ${data.length} months. ${summary}`}>
      <div className="flex items-end gap-3">
        {data.map((d) => {
          const isCurrent = d.key === current;
          const height = d.total > 0 ? Math.max(6, (d.total / max) * BAR_AREA_PX) : 2;
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <span className="h-4 text-[11px] font-medium tabular-nums text-muted-foreground">
                {d.total > 0 ? `₹${compact.format(d.total)}` : ''}
              </span>
              <div className="flex h-28 w-full items-end">
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all',
                    isCurrent ? 'bg-primary' : 'bg-primary/20',
                  )}
                  style={{ height }}
                />
              </div>
              <span
                className={cn(
                  'text-xs',
                  isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {monthName(d.key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Where the money went: a stacked bar plus a ranked list. */
export function CategoryBreakdown({
  rows,
  total,
}: {
  rows: { category: string; total: number; count: number }[];
  total: number;
}) {
  return (
    <div className="space-y-6">
      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Share of spending by category"
      >
        {rows.map((r) => (
          <div
            key={r.category}
            className={cn('h-full', categoryMeta(r.category).bar)}
            style={{ width: `${total > 0 ? (r.total / total) * 100 : 0}%` }}
          />
        ))}
      </div>
      <ul className="space-y-4">
        {rows.map((r) => {
          const { icon: Icon, tone } = categoryMeta(r.category);
          const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
          return (
            <li key={r.category} className="flex items-center gap-3">
              <span
                className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tone)}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{label(r.category)}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(r.total)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {pct}% of spending · {r.count} {r.count === 1 ? 'claim' : 'claims'}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
