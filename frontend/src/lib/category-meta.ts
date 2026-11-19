import { BedDouble, MoreHorizontal, Package, Plane, Utensils, type LucideIcon } from 'lucide-react';

/** One icon and tint per expense category, so claims are recognisable at a glance. */
export const CATEGORY_META: Record<string, { icon: LucideIcon; tone: string }> = {
  TRAVEL: { icon: Plane, tone: 'bg-sky-50 text-sky-700' },
  MEALS: { icon: Utensils, tone: 'bg-orange-50 text-orange-700' },
  SUPPLIES: { icon: Package, tone: 'bg-violet-50 text-violet-700' },
  ACCOMMODATION: { icon: BedDouble, tone: 'bg-teal-50 text-teal-700' },
  OTHER: { icon: MoreHorizontal, tone: 'bg-slate-100 text-slate-700' },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.OTHER;
}
