import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Notice({ kind, children }: { kind: 'ok' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-4 py-3 text-sm',
        kind === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        kind === 'error' && 'border-red-200 bg-red-50 text-red-900',
        kind === 'info' && 'border-blue-200 bg-blue-50 text-blue-900',
      )}
    >
      {children}
    </div>
  );
}
