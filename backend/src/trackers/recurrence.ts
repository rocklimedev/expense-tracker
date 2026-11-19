export enum Frequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export interface RecurrenceRule {
  frequency: Frequency;
  interval: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
}

const DAY_MS = 86_400_000;
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const format = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(s: string, n: number): string {
  return format(new Date(parse(s).getTime() + n * DAY_MS));
}

/** The k-th occurrence (k = 0 is the start date). Strictly increasing in k. */
function nthOccurrence(rule: RecurrenceRule, k: number): string {
  const step = Math.max(1, rule.interval);

  switch (rule.frequency) {
    case Frequency.DAILY:
      return addDays(rule.startDate, k * step);

    case Frequency.WEEKLY:
      return addDays(rule.startDate, k * step * 7);

    case Frequency.MONTHLY: {
      const start = parse(rule.startDate);
      const monthIndex = start.getUTCMonth() + k * step;
      const year = start.getUTCFullYear() + Math.floor(monthIndex / 12);
      const month = monthIndex % 12;
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      // Jan 31 monthly becomes Feb 28 / Mar 31, never an invalid date
      const day = Math.min(start.getUTCDate(), daysInMonth);
      return format(new Date(Date.UTC(year, month, day)));
    }
  }
}

/** Occurrence dates within [from, to], inclusive, honoring the rule's endDate. */
export function occurrencesBetween(rule: RecurrenceRule, from: string, to: string): string[] {
  const limit = rule.endDate && rule.endDate < to ? rule.endDate : to;
  const out: string[] = [];

  for (let k = 0; ; k++) {
    const date = nthOccurrence(rule, k);
    if (date > limit) break;
    if (date >= from) out.push(date);
  }
  return out;
}
