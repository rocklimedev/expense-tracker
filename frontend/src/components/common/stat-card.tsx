import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: string;
}

export function StatCard({ label, value, hint, icon: Icon, tone }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 truncate text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
