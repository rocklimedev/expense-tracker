import { cn } from '@/lib/utils';
import { categoryMeta } from '@/lib/category-meta';

export function CategoryTile({ category, className }: { category: string; className?: string }) {
  const { icon: Icon, tone } = categoryMeta(category);
  return (
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tone, className)} aria-hidden>
      <Icon className="h-[18px] w-[18px]" />
    </div>
  );
}
