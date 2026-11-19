import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/use-fetch';
import { useAuth } from '@/context/auth-context';
import { money, formatDate } from '@/lib/format';
import type { Tracker } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Field } from '@/components/common/field';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';

export default function TrackersPage() {
  const { can } = useAuth();
  const { data, error, reload } = useFetch<Tracker[]>('/trackers');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api('/trackers', {
        method: 'POST',
        json: {
          title,
          description: description || undefined,
          startDate,
          endDate: endDate || undefined,
          budgetAmount: budget ? Number(budget) : undefined,
        },
      });
      setShowForm(false);
      setTitle(''); setDescription(''); setStartDate(''); setEndDate(''); setBudget('');
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Trackers"
        description="Group the expenses of a task or project, including recurring costs."
        actions={
          can('expense.create') && (
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" /> New tracker
            </Button>
          )
        }
      />

      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}

      {showForm && (
        <Card className="mb-6 max-w-2xl">
          <form onSubmit={onCreate}>
            <CardHeader><CardTitle>New tracker</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" className="sm:col-span-2">
                <Input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <Field label="Start date">
                <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
              <Field label="End date (optional)">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </Field>
              <Field label="Budget (optional)">
                <Input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              {formError && <div className="sm:col-span-2"><Notice kind="error">{formError}</Notice></div>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create tracker'}</Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">No trackers yet.</TableCell></TableRow>}
              {data?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to={`/trackers/${t.id}`} className="font-medium text-primary hover:underline">{t.title}</Link>
                  </TableCell>
                  <TableCell>{formatDate(t.startDate)} – {t.endDate ? formatDate(t.endDate) : 'open-ended'}</TableCell>
                  <TableCell>{t.employee?.name ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.budgetAmount ? money(t.budgetAmount) : '—'}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
