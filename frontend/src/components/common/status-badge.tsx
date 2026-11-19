import { Badge, type BadgeProps } from '@/components/ui/badge';
import { label } from '@/lib/format';

const VARIANTS: Record<string, BadgeProps['variant']> = {
  DRAFT: 'secondary',
  SUBMITTED: 'warning',
  APPROVED: 'success',
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  REJECTED: 'destructive',
  PENDING: 'secondary',
  ACTIVE: 'success',
  CLOSED: 'secondary',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? 'outline'}>{label(status)}</Badge>;
}
