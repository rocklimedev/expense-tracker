import { useState, type FormEvent } from 'react';
import { ExpenseDetailsFields, existingExpenseDetails, expenseDetailsPayload } from './expense-details-fields';
import { Field } from './field';
import { Notice } from './notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { label } from '@/lib/format';
import type { Expense, ExpenseCategory } from '@/lib/types';

export function EditExpenseForm({ expense, onSave, onCancel }: {
  expense: Expense;
  onSave: () => void;
  onCancel: () => void;
}) {
  const categories = useApiQuery<ExpenseCategory[]>('/expense-categories');
  const [category, setCategory] = useState(expense.category);
  const [amount, setAmount] = useState(String(expense.amount));
  const [date, setDate] = useState(expense.expenseDate);
  const [description, setDescription] = useState(expense.description ?? '');
  const [details, setDetails] = useState(() => existingExpenseDetails(expense));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await writeApi(`/expenses/${expense.id}`, {
        method: 'PATCH',
        json: {
          category,
          amount: Number(amount),
          expenseDate: date,
          description: description.trim() || undefined,
          ...expenseDetailsPayload(details),
        },
      });
      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Edit expense</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={saving} aria-label="Expense details" className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Category">
                <Select required value={category} onChange={(e) => setCategory(e.target.value)}>
                  {!categories.data?.some(({ code }) => code === expense.category) && (
                    <option value={expense.category}>{label(expense.category)}</option>
                  )}
                  {categories.data?.map(({ code }) => <option key={code} value={code}>{label(code)}</option>)}
                </Select>
              </Field>
              <Field label={`Amount (${expense.currency})`}>
                <Input required type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal"
                  value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Expense date">
                <Input required type="date" readOnly={Boolean(expense.scheduleId)} value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <ExpenseDetailsFields id="edit-expense" value={details} onChange={setDetails} />
          </fieldset>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
