import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Field } from '@/components/common/field';
import { ExpenseDetailsFields, emptyExpenseDetails, expenseDetailsPayload } from '@/components/common/expense-details-fields';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { label, money, todayIso } from '@/lib/format';
import type { ExpenseCategory } from '@/lib/types';

const MAX_EXPENSES = 25;
const newRow = () => ({
  id: crypto.randomUUID(),
  category: '',
  amount: '',
  expenseDate: todayIso(),
  description: '',
  details: emptyExpenseDetails,
});
type ExpenseRow = ReturnType<typeof newRow>;

export default function BatchExpensePage() {
  const categories = useApiQuery<ExpenseCategory[]>('/expense-categories');
  const [rows, setRows] = useState(() => [newRow(), newRow()]);
  const [saved, setSaved] = useState<{ id: string }[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function update(id: string, changes: Partial<ExpenseRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saved) return;
    setBusy(true);
    setError(undefined);
    try {
      setSaved(await writeApi<{ id: string }[]>('/expenses/batch', {
        method: 'POST',
        json: {
          expenses: rows.map(({ category, amount, expenseDate, description, details }) => ({
            category,
            amount: Number(amount),
            expenseDate,
            description: description.trim() || undefined,
            ...expenseDetailsPayload(details),
          })),
        },
      }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Batch expense entry"
        description="Save multiple expenses as individual drafts."
        actions={<Link className="text-sm font-medium text-primary underline" to="/expenses">All expenses</Link>}
      />

      {saved ? (
        <Card>
          <CardHeader><CardTitle>{saved.length} expense {saved.length === 1 ? 'draft' : 'drafts'} saved</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">Open a draft to add receipts or submit it for approval.</p>
            <ul className="space-y-2">
              {saved.map(({ id }, index) => {
                const row = rows[index];
                return (
                  <li key={id}>
                    <Link className="text-sm font-medium text-primary underline" to={`/expenses/${id}`}>
                      {row.description.trim() || label(row.category)} · {money(row.amount)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {categories.error && (
            <div className="space-y-2">
              <Notice kind="error">{categories.error}</Notice>
              <Button type="button" variant="outline" onClick={categories.reload}>Retry categories</Button>
            </div>
          )}
          <fieldset disabled={busy} aria-label="Expenses" className="min-w-0 space-y-4">
            {rows.map((row, index) => (
              <Card key={row.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle>Expense {index + 1}</CardTitle>
                  {rows.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove expense ${index + 1}`}
                      onClick={() => setRows((current) => current.filter(({ id }) => id !== row.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Category" htmlFor={`category-${row.id}`}>
                      <Select id={`category-${row.id}`} required value={row.category}
                        onChange={(e) => update(row.id, { category: e.target.value })}>
                        <option value="">Select a category</option>
                        {categories.data?.map(({ code }) => <option key={code} value={code}>{label(code)}</option>)}
                      </Select>
                    </Field>
                    <Field label="Amount (INR)" htmlFor={`amount-${row.id}`}>
                      <Input id={`amount-${row.id}`} type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" required
                        value={row.amount} onChange={(e) => update(row.id, { amount: e.target.value })} />
                    </Field>
                    <Field label="Expense date" htmlFor={`date-${row.id}`}>
                      <Input id={`date-${row.id}`} type="date" max={todayIso()} required
                        value={row.expenseDate} onChange={(e) => update(row.id, { expenseDate: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Description" htmlFor={`description-${row.id}`}>
                    <Input id={`description-${row.id}`} maxLength={500} value={row.description}
                      onChange={(e) => update(row.id, { description: e.target.value })} />
                  </Field>
                  <ExpenseDetailsFields id={row.id} value={row.details} onChange={(details) => update(row.id, { details })} />
                </CardContent>
              </Card>
            ))}
          </fieldset>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button type="button" variant="outline" disabled={busy || rows.length >= MAX_EXPENSES}
              onClick={() => setRows((current) => [...current, newRow()])}>
              <Plus className="h-4 w-4" /> Add another expense
            </Button>
            <Button type="submit" disabled={busy || !categories.data?.length}>
              {busy ? 'Saving…' : `Save ${rows.length} as drafts`}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
