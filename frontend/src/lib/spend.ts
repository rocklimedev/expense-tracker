import type { Expense } from './types';
import { daysAgoIso, toIsoDate, todayIso } from './format';

const SPEND_STATUSES = ['SUBMITTED', 'APPROVED', 'PARTIALLY_PAID', 'PAID'];

export const num = (v: number | string | null | undefined) => Number(v ?? 0);

export function isSpend(e: Expense) {
  return SPEND_STATUSES.includes(e.status)
    || (e.status === 'REIMBURSEMENT_CANCELLED' && num(e.paidAmount) > 0);
}

export function spendAmount(e: Expense) {
  return num(e.status === 'REIMBURSEMENT_CANCELLED' ? e.paidAmount : e.amount);
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

/** The last n calendar months as YYYY-MM keys, oldest first, in local time. */
export function lastMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    toIsoDate(new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)).slice(0, 7),
  );
}

export function monthName(key: string, long = false) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    'en-IN',
    long ? { month: 'long', year: 'numeric' } : { month: 'short' },
  );
}

/** "Today", "Yesterday", or the full date. */
export function dayHeading(iso: string) {
  if (iso === todayIso()) return 'Today';
  if (iso === daysAgoIso(1)) return 'Yesterday';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Spend per category, largest first. Expects the expenses to be already filtered. */
export function categoryTotals(list: Expense[]) {
  const map = new Map<string, { category: string; total: number; count: number }>();
  for (const e of list) {
    const row = map.get(e.category) ?? { category: e.category, total: 0, count: 0 };
    row.total += spendAmount(e);
    row.count += 1;
    map.set(e.category, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Groups a list already sorted newest first into runs that share a date. */
export function groupByDay(list: Expense[]) {
  const groups: { date: string; items: Expense[] }[] = [];
  for (const e of list) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.expenseDate) last.items.push(e);
    else groups.push({ date: e.expenseDate, items: [e] });
  }
  return groups;
}
