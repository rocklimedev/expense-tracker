import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Label } from '@/components/ui/label';

const LABELABLE = ['input', 'select', 'textarea'];

/**
 * Label and control stacked, used in every form.
 * The label is linked to the first control, so clicking it focuses the field and
 * screen readers announce it. Pass `htmlFor` when the control is nested in a wrapper.
 */
export function Field({
  label,
  children,
  className,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const autoId = useId();
  const kids = Children.toArray(children);
  const first = kids[0];

  let controlId = htmlFor;
  let content: ReactNode = children;

  if (!controlId && isValidElement(first)) {
    // Native elements are only labelable if they are inputs, selects or textareas. Wrapper divs are skipped.
    const isNative = typeof first.type === 'string';
    const canLabel = !isNative || LABELABLE.includes(first.type as string);
    if (canLabel) {
      const existing = (first.props as { id?: string }).id;
      controlId = existing ?? autoId;
      if (!existing) {
        content = kids.map((child, i) =>
          i === 0 && isValidElement(child)
            ? cloneElement(child as ReactElement<{ id?: string }>, { id: autoId })
            : child,
        );
      }
    }
  }

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={controlId}>{label}</Label>
      {content}
    </div>
  );
}
