import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, Plus, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { categoryMeta } from '@/lib/category-meta';
import { todayIso, daysAgoIso, label, money, formatDate } from '@/lib/format';
import { useFetch } from '@/lib/use-fetch';
import { useDebounced } from '@/lib/use-debounced';
import type { ApprovalStep, ExpenseCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { ApprovalStepper } from '@/components/common/approval-stepper';

const MAX_DESCRIPTION = 500;

export default function NewExpensePage() {
  const navigate = useNavigate();
  const categories = useFetch<ExpenseCategory[]>('/expense-categories');
  const [selectedCategory, setCategory] = useState('');
  const category =
    selectedCategory ||
    categories.data?.find(({ code }) => code === 'TRAVEL')?.code ||
    categories.data?.[0]?.code ||
    '';
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  const amountNum = Number(amount);
  const validAmount = amount !== '' && amountNum > 0;

  // Preview the approval route as the amount settles, without a request on every keystroke.
  const debouncedAmount = useDebounced(validAmount ? amountNum : 0, 450);
  const { data: route, loading: routeLoading } = useFetch<ApprovalStep[]>(
    debouncedAmount > 0 && category
      ? `/approval-policies/preview?amount=${debouncedAmount}&category=${encodeURIComponent(category)}`
      : null,
    [debouncedAmount, category],
  );

  const { icon: CatIcon, tone: catTone } = categoryMeta(category);

  async function addCategory() {
    const name = categoryName.trim();
    if (savingCategory || name.length < 2) return;

    setSavingCategory(true);
    setCategoryError(null);
    try {
      const created = await api<ExpenseCategory>('/expense-categories', {
        method: 'POST',
        json: { name },
      });
      categories.setData((current) => {
        const options = current ?? [];
        if (options.some(({ code }) => code === created.code)) return options;
        return [...options, created];
      });
      setCategory(created.code);
      setCategoryName('');
      setAddingCategory(false);
    } catch (err) {
      setCategoryError((err as Error).message);
    } finally {
      setSavingCategory(false);
    }
  }

  // Go back in the app if there is somewhere to go, otherwise land on the expense list.
  // A direct link to this page has no history to return to, and going back would leave the app.
  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/expenses');
  }

  async function save(andSubmit: boolean) {
    if (!category || addingCategory || busy) return;
    if (!validAmount) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setBusy(andSubmit ? 'submit' : 'draft');
    setError(null);

    let id: string | undefined;
    try {
      const created = await api<{ id: string }>('/expenses', {
        method: 'POST',
        json: {
          category,
          amount: amountNum,
          expenseDate,
          description: description.trim() || undefined,
        },
      });
      id = created.id;
      if (andSubmit) await api(`/expenses/${id}/submit`, { method: 'POST' });
      navigate(`/expenses/${id}`);
    } catch (err) {
      const message = (err as Error).message;
      if (id) {
        // The draft exists, so send the user there and explain why it was not submitted.
        navigate(`/expenses/${id}`, {
          state: { notice: `Saved as a draft, but it was not submitted: ${message}` },
        });
      } else {
        setError(message);
        setBusy(null);
      }
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={goBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New expense</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Takes about a minute. Save it now, or submit for approval straight away.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="lg:col-span-3">
          <Card>
            <CardContent className="space-y-8 p-6 sm:p-8">
              {/* Amount is the first thing people look for, so it gets the most room. */}
              <Field label="Amount" htmlFor="amount">
                <div className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                  <span className="text-2xl font-medium text-muted-foreground">₹</span>
                  <input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    required
                    autoFocus
                    aria-describedby="amount-hint"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 w-full bg-transparent text-3xl font-semibold tabular-nums placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
                <p id="amount-hint" className="text-xs text-muted-foreground">
                  Enter the total you paid, including tax.
                </p>
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Category</legend>
                {categories.error && (
                  <div className="space-y-2">
                    <Notice kind="error">{categories.error}</Notice>
                    <Button type="button" variant="outline" size="sm" onClick={categories.reload}>
                      Retry
                    </Button>
                  </div>
                )}
                {!categories.data && !categories.error && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Loading categories…
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.data?.map(({ code: c }) => {
                    const meta = categoryMeta(c);
                    const Icon = meta.icon;
                    const selected = c === category;
                    return (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCategory(c)}
                        className={cn(
                          'flex min-w-0 flex-col items-start gap-3 rounded-xl border p-3 text-left text-sm font-medium transition-all',
                          selected
                            ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary'
                            : 'border-input bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg',
                            meta.tone,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="max-w-full break-words">{label(c)}</span>
                      </button>
                    );
                  })}
                </div>
                {addingCategory ? (
                  <div className="space-y-2 rounded-xl border p-3">
                    <Field label="Category name">
                      <Input
                        autoFocus
                        maxLength={60}
                        value={categoryName}
                        disabled={savingCategory}
                        onChange={(event) => setCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void addCategory();
                          }
                        }}
                      />
                    </Field>
                    {categoryError && <Notice kind="error">{categoryError}</Notice>}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={addCategory}
                        disabled={savingCategory || categoryName.trim().length < 2}
                      >
                        {savingCategory ? 'Adding…' : 'Add category'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={savingCategory}
                        onClick={() => {
                          setAddingCategory(false);
                          setCategoryName('');
                          setCategoryError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!categories.data || busy !== null}
                    onClick={() => setAddingCategory(true)}
                  >
                    <Plus aria-hidden="true" className="h-4 w-4" /> Add category
                  </Button>
                )}
              </fieldset>

              <div className="grid gap-6 sm:grid-cols-2">
                <Field label="Date">
                  <Input
                    type="date"
                    required
                    max={todayIso()}
                    className="h-11"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1">
                    {[
                      { label: 'Today', value: todayIso() },
                      { label: 'Yesterday', value: daysAgoIso(1) },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setExpenseDate(opt.value)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          expenseDate === opt.value
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label="Description">
                <Textarea
                  placeholder="What was it for? e.g. Client lunch with Acme team"
                  maxLength={MAX_DESCRIPTION}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {description.length}/{MAX_DESCRIPTION}
                </div>
              </Field>

              {error && <Notice kind="error">{error}</Notice>}
            </CardContent>

            <CardFooter className="flex-col-reverse gap-3 border-t bg-muted/30 p-6 sm:flex-row sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> You can attach receipts after saving.
              </p>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-10"
                  disabled={busy !== null || !category || addingCategory}
                >
                  {busy === 'draft' ? 'Saving…' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  className="h-10"
                  disabled={busy !== null || !category || addingCategory}
                  onClick={() => save(true)}
                >
                  <Send className="h-4 w-4" />
                  {busy === 'submit' ? 'Submitting…' : 'Submit for approval'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>

        {/* Live summary: what the approver will see, and the route it will take. */}
        <aside className="lg:col-span-2">
          <Card className="lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Receipt preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <span
                  className={cn('flex h-10 w-10 items-center justify-center rounded-xl', catTone)}
                >
                  <CatIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="break-words text-sm font-medium">
                    {category ? label(category) : 'Choose a category'}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(expenseDate)}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-lg font-semibold tabular-nums">
                    {validAmount ? money(amountNum) : '—'}
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Approval route
                </div>
                {!validAmount && (
                  <p className="text-sm text-muted-foreground">
                    Enter an amount to see who needs to approve.
                  </p>
                )}
                {validAmount && routeLoading && !route && (
                  <p className="text-sm text-muted-foreground">Checking policies…</p>
                )}
                {validAmount && route && route.length > 0 && (
                  <ApprovalStepper steps={route} planned />
                )}
                {validAmount && route && route.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No approval needed for this amount.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
