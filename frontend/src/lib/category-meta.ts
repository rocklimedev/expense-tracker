import { BedDouble, MoreHorizontal, Package, Plane, Utensils, type LucideIcon } from 'lucide-react';

/** One icon, tint and solid bar colour per expense category, so spending is recognisable at a glance. */
export const CATEGORY_META: Record<string, { icon: LucideIcon; tone: string; bar: string }> = {
  TRAVEL: { icon: Plane, tone: 'bg-sky-50 text-sky-700', bar: 'bg-sky-500' },
  MEALS: { icon: Utensils, tone: 'bg-orange-50 text-orange-700', bar: 'bg-orange-500' },
  SUPPLIES: { icon: Package, tone: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500' },
  ACCOMMODATION: { icon: BedDouble, tone: 'bg-teal-50 text-teal-700', bar: 'bg-teal-500' },
  OTHER: { icon: MoreHorizontal, tone: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.OTHER;
}
