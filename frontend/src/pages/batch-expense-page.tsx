import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import {
  emptyExpenseDetails,
  expenseDetailsPayload,
} from '@/components/common/expense-details-fields';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { useApiQuery, writeApi } from '@/lib/api-query';
import { label, money, todayIso } from '@/lib/format';
import type { ExpenseCategory } from '@/lib/types';

const MAX_EXPENSES = 25;
const columns = [
  { field: 'category', label: 'Category', width: 'w-40' },
  { field: 'amount', label: 'Amount (INR)', width: 'w-28' },
  { field: 'expenseDate', label: 'Expense date', width: 'w-36' },
  { field: 'description', label: 'Description', width: 'w-44', maxLength: 500 },
  { field: 'toldBy', label: 'Told by', width: 'w-36', maxLength: 120 },
  { field: 'paidTo', label: 'Paid to', width: 'w-36', maxLength: 120 },
  { field: 'reason', label: 'Reason', width: 'w-44', maxLength: 500 },
] as const;
type Column = (typeof columns)[number];
const cellClass = 'h-10 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset sm:h-10';

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
  const [rows, setRows] = useState(() => [newRow()]);
  const { data: requesters } = useApiQuery<{ id: string; name: string }[]>('/users/expense-requesters');
  const grid = useRef<HTMLFieldSetElement>(null);
  const [saved, setSaved] = useState<{ id: string }[]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function update(id: string, column: Column, value: string) {
    setRows((current) => current.map((row) => row.id === id ? changeCell(row, column, value) : row));
  }

  function focusCell(row: number, column: number) {
    requestAnimationFrame(() => {
      grid.current?.querySelector<HTMLElement>(`[data-row="${row}"][data-column="${column}"]`)?.focus();
    });
  }

  function addRow(column = 0) {
    if (rows.length >= MAX_EXPENSES) return;
    setRows((current) => [...current, newRow()]);
    focusCell(rows.length, column);
  }

  function moveDown(event: KeyboardEvent<HTMLElement>, row: number, column: number) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (event.shiftKey || row < rows.length - 1) {
      focusCell(Math.max(0, row + (event.shiftKey ? -1 : 1)), column);
    }
  }

  function pasteCells(event: ClipboardEvent<HTMLElement>, startRow: number, startColumn: number) {
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n').replace(/\n$/, '');
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    const pasted = parseClipboard(text);
    if (startRow + pasted.length > MAX_EXPENSES || pasted.some((row) => startColumn + row.length > columns.length)) {
      setError('The pasted range exceeds the available columns or the 25-row limit.');
      return;
    }

    const next = rows.slice();
    for (const [rowOffset, cells] of pasted.entries()) {
      const rowIndex = startRow + rowOffset;
      let row = next[rowIndex] ?? newRow();
      for (const [columnOffset, rawValue] of cells.entries()) {
        const column = columns[startColumn + columnOffset];
        let value = rawValue.trim();
        if (column.field === 'category' && value) {
          const match = categories.data?.find(({ code }) =>
            [code, label(code)].some((option) => option.toLowerCase() === value.toLowerCase()),
          );
          if (!match) {
            setError(`Row ${rowIndex + 1}: “${value}” is not a category.`);
            return;
          }
          value = match.code;
        }
        if (column.field === 'expenseDate' && value) {
          const localDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
          if (localDate) {
            const [, day, month, year] = localDate;
            value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          const date = new Date(value + 'T00:00:00Z');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.valueOf()) ||
              date.toISOString().slice(0, 10) !== value) {
            setError(`Row ${rowIndex + 1}: enter a valid date in YYYY-MM-DD or DD/MM/YYYY format.`);
            return;
          }
        }
        if (column.field === 'amount' && value) {
          if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d+)?$/.test(value)) {
            setError(`Row ${rowIndex + 1}: enter an amount without a currency symbol.`);
            return;
          }
          value = value.replace(/,/g, '');
        }
        if ('maxLength' in column && value.length > column.maxLength) {
          setError(`Row ${rowIndex + 1}: ${column.label} exceeds ${column.maxLength} characters.`);
          return;
        }
        row = changeCell(row, column, value);
      }
      next[rowIndex] = row;
    }
    setError(undefined);
    setRows(next);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saved) return;
    setBusy(true);
    setError(undefined);
    try {
      setSaved(
        await writeApi<{ id: string }[]>('/expenses/batch', {
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
        }),
      );
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
        actions={
          <Link className="text-sm font-medium text-primary underline" to="/expenses">
            All expenses
          </Link>
        }
      />

      {saved ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {saved.length} expense {saved.length === 1 ? 'draft' : 'drafts'} saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Open a draft to add receipts or submit it for approval.
            </p>
            <ul className="space-y-2">
              {saved.map(({ id }, index) => {
                const row = rows[index];
                return (
                  <li key={id}>
                    <Link
                      className="text-sm font-medium text-primary underline"
                      to={`/expenses/${id}`}
                    >
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
              <Button type="button" variant="outline" onClick={categories.reload}>
                Retry categories
              </Button>
            </div>
          )}
          <p id="batch-grid-help" className="text-sm text-muted-foreground">
            Use Tab to move across, Enter to move down, or paste cells from a spreadsheet. Pasted dates can use YYYY-MM-DD or DD/MM/YYYY.
          </p>
          <Card className="overflow-hidden">
            <fieldset ref={grid} disabled={busy} aria-label="Expenses" className="min-w-0">
              <Table aria-label="Expense entry grid" aria-describedby="batch-grid-help" className="table-fixed min-w-[74rem]">
                <colgroup>
                  <col className="w-10" />
                  {columns.map((column) => <col key={column.field} className={column.width} />)}
                  <col className="w-12" />
                </colgroup>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead scope="col" className="sticky left-0 z-20 border-r bg-muted px-2 text-center">#</TableHead>
                    {columns.map((column) => (
                      <TableHead key={column.field} scope="col" className="border-r px-2">
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead scope="col"><span className="sr-only">Remove row</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableHead scope="row" className="sticky left-0 z-20 border-r bg-muted px-2 text-center tabular-nums">
                        {index + 1}
                      </TableHead>
                      {columns.map((column, columnIndex) => {
                        const field = column.field;
                        const props = {
                          'aria-label': `Row ${index + 1}: ${column.label}`,
                          'data-row': index,
                          'data-column': columnIndex,
                          className: cellClass,
                          onKeyDown: (event: KeyboardEvent<HTMLElement>) => moveDown(event, index, columnIndex),
                          onPaste: (event: ClipboardEvent<HTMLElement>) => pasteCells(event, index, columnIndex),
                        };
                        return (
                          <TableCell key={field} className="border-r p-0">
                            {field === 'category' ? (
                              <Select {...props} required value={row.category}
                                onChange={(event) => update(row.id, column, event.target.value)}
                              >
                                <option value="">Select…</option>
                                {categories.data?.map(({ code }) => (
                                  <option key={code} value={code}>{label(code)}</option>
                                ))}
                              </Select>
                            ) : (
                              <Input
                                {...props}
                                type={field === 'amount' ? 'number' : field === 'expenseDate' ? 'date' : 'text'}
                                min={field === 'amount' ? '0.01' : undefined}
                                max={field === 'amount' ? '9999999999.99' : field === 'expenseDate' ? todayIso() : undefined}
                                step={field === 'amount' ? '0.01' : undefined}
                                inputMode={field === 'amount' ? 'decimal' : undefined}
                                maxLength={'maxLength' in column ? column.maxLength : undefined}
                                list={field === 'toldBy' ? 'batch-requesters' : undefined}
                                required={field === 'amount' || field === 'expenseDate'}
                                value={field === 'toldBy' || field === 'paidTo' || field === 'reason' ? row.details[field] : row[field]}
                                onChange={(event) => update(row.id, column, event.target.value)}
                              />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="p-0 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={rows.length === 1}
                          aria-label={`Remove expense ${index + 1}`}
                          onClick={() => setRows((current) => current.filter(({ id }) => id !== row.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <datalist id="batch-requesters">
                {[...new Set(requesters?.map(({ name }) => name))].map((name) => <option key={name} value={name} />)}
              </datalist>
            </fieldset>
          </Card>
          {error && <Notice kind="error">{error}</Notice>}
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy || rows.length >= MAX_EXPENSES}
              onClick={() => addRow()}
            >
              <Plus className="h-4 w-4" /> Add row
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

function changeCell(row: ExpenseRow, { field }: Column, value: string): ExpenseRow {
  if (field === 'toldBy' || field === 'paidTo' || field === 'reason') {
    return { ...row, details: { ...row.details, [field]: value } };
  }
  return { ...row, [field]: value };
}

function parseClipboard(text: string): string[][] {
  const rows: string[][] = [[]];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (quoted || !cell)) {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === '\t' || char === '\n')) {
      rows[rows.length - 1].push(cell);
      cell = '';
      if (char === '\n') rows.push([]);
    } else {
      cell += char;
    }
  }
  rows[rows.length - 1].push(cell);
  return rows;
}
