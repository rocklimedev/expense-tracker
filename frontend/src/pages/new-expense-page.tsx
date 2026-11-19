import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';
import { todayIso, label } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';

export default function NewExpensePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: number }>('/expenses', {
        method: 'POST',
        json: {
          category,
          amount: Number(amount),
          expenseDate,
          description: description || undefined,
        },
      });
      navigate(`/expenses/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="New expense" description="Saved as a draft. Submit it from the expense page when ready." />
      <Card className="max-w-2xl">
        <form onSubmit={onSubmit}>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
              </Select>
            </Field>
            <Field label="Amount (INR)">
              <Input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Expense date">
              <Input type="date" required value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            {error && <div className="sm:col-span-2"><Notice kind="error">{error}</Notice></div>}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save draft'}</Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
