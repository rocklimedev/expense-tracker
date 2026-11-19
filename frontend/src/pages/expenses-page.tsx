import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useFetch } from '@/lib/use-fetch';
import { money, formatDate, label } from '@/lib/format';
import type { Expense, ExpenseStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/page-header';
import { StatusBadge } from '@/components/common/status-badge';
import { Notice } from '@/components/common/notice';

const STATUSES: ExpenseStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_PAID', 'PAID'];

export default function ExpensesPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState('');
  const path = `/expenses${status ? `?status=${status}` : ''}`;
  const { data, error, loading } = useFetch<Expense[]>(path, [status]);

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Claims you submitted, or all claims if you can view them."
        actions={
          can('expense.create') && (
            <Link to="/expenses/new">
              <Button><Plus className="h-4 w-4" /> New expense</Button>
            </Link>
          )
        }
      />

      <div className="mb-4 w-56">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{label(s)}</option>
          ))}
        </Select>
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                {can('expense.view.all') && <TableHead>Employee</TableHead>}
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && !data && (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {data?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground">No expenses found.</TableCell></TableRow>
              )}
              {data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link to={`/expenses/${e.id}`} className="font-medium text-primary hover:underline">#{e.id}</Link>
                  </TableCell>
                  <TableCell>{formatDate(e.expenseDate)}</TableCell>
                  <TableCell>{label(e.category)}</TableCell>
                  {can('expense.view.all') && <TableCell>{e.employee?.name ?? '—'}</TableCell>}
                  <TableCell className="text-right tabular-nums">{money(e.amount, e.currency)}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
