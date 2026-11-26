import type { ReactNode } from 'react';
import { money } from '@/lib/format';

export interface ReceiptLine {
  label: string;
  value: ReactNode;
}

interface ReceiptProps {
  reference: string;
  lines: ReceiptLine[];
  amount: number;
  paid: number;
  outstanding: number;
  currency?: string;
}

/** The claim as a paper-style receipt: line items, a dashed tear line, and the total. */
export function Receipt({
  reference,
  lines,
  amount,
  paid,
  outstanding,
  currency = 'INR',
}: ReceiptProps) {
  const pct = amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : 0;

  return (
    <section
      aria-label="Expense receipt"
      className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
    >
      <header className="flex items-center justify-between border-b bg-muted/40 px-6 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Expense claim
        </span>
        <span className="font-mono text-xs text-muted-foreground">#{reference}</span>
      </header>

      <dl className="space-y-3 px-6 py-5 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{l.label}</dt>
            <dd className="min-w-0 whitespace-pre-line break-words text-right font-medium">
              {l.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Tear line: the notches are cut out of the card edge. */}
      <div className="relative mx-0 border-t border-dashed">
        <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-background" aria-hidden />
        <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-background" aria-hidden />
      </div>

      <div className="px-6 pb-6 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-muted-foreground">Total claimed</span>
          <span className="min-w-0 text-3xl font-semibold tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
            {money(amount, currency)}
          </span>
        </div>

        <div className="mt-6">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Share of claim paid"
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Paid {money(paid, currency)}</span>
            <span>{money(outstanding, currency)} to go</span>
          </div>
        </div>
      </div>
    </section>
  );
}
