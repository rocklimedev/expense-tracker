import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

/** Label and control stacked, used in every form. */
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
