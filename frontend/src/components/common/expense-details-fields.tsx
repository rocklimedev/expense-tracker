import { Field } from './field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApiQuery } from '@/lib/api-query';

const SOMEONE_ELSE = 'someone-else';
const SAVED_NAME = 'saved-name';
type ExpenseRequester = { id: string; name: string };

export const emptyExpenseDetails = { toldBySelection: '', toldBy: '', reason: '', paidTo: '' };
export type ExpenseDetails = typeof emptyExpenseDetails;

export function existingExpenseDetails(expense: {
  toldBy?: string | null;
  paidTo?: string | null;
  reason?: string | null;
}): ExpenseDetails {
  return {
    toldBySelection: expense.toldBy ? SAVED_NAME : '',
    toldBy: expense.toldBy ?? '',
    paidTo: expense.paidTo ?? '',
    reason: expense.reason ?? '',
  };
}

export function expenseDetailsPayload(details: ExpenseDetails) {
  return {
    toldBy: details.toldBy.trim() || undefined,
    paidTo: details.paidTo.trim() || undefined,
    reason: details.reason.trim() || undefined,
  };
}

export function ExpenseDetailsFields({ value, onChange, id }: {
  value: ExpenseDetails;
  onChange: (details: ExpenseDetails) => void;
  id: string;
}) {
  const { data: requesters, error, loading, reload } =
    useApiQuery<ExpenseRequester[]>('/users/expense-requesters');

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-3">
          <Field label="Told by" htmlFor={`${id}-told-by`}>
            <Select
              id={`${id}-told-by`}
              value={value.toldBySelection}
              onChange={(e) => {
                const toldBySelection = e.target.value;
                const toldBy = requesters?.find((person) => person.id === toldBySelection)?.name ?? '';
                onChange({ ...value, toldBySelection, toldBy });
              }}
            >
              <option value="">{loading && !requesters ? 'Loading team members…' : 'Select a team member'}</option>
              {value.toldBySelection === SAVED_NAME && <option value={SAVED_NAME}>{value.toldBy}</option>}
              {requesters?.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
              <option value={SOMEONE_ELSE}>Someone else</option>
            </Select>
            {error && (
              <p className="text-xs text-muted-foreground">
                Could not load team members.{' '}
                <button type="button" onClick={reload} className="font-medium underline">Retry</button>
              </p>
            )}
          </Field>
          {value.toldBySelection === SOMEONE_ELSE && (
            <Field label="Name of person" htmlFor={`${id}-told-by-name`}>
              <Input
                id={`${id}-told-by-name`}
                maxLength={120}
                required
                pattern={String.raw`.*\S.*`}
                value={value.toldBy}
                onChange={(e) => onChange({ ...value, toldBy: e.target.value })}
              />
            </Field>
          )}
        </div>
        <Field label="Paid to" htmlFor={`${id}-paid-to`}>
          <Input id={`${id}-paid-to`} maxLength={120} value={value.paidTo} onChange={(e) => onChange({ ...value, paidTo: e.target.value })} />
        </Field>
      </div>
      <Field label="Reason" htmlFor={`${id}-reason`}>
        <Textarea id={`${id}-reason`} rows={2} maxLength={500} value={value.reason} onChange={(e) => onChange({ ...value, reason: e.target.value })} />
      </Field>
    </>
  );
}
