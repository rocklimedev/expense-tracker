import { useState } from 'react';
import { Notice } from '@/components/common/notice';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiQuery } from '@/lib/api-query';
import { formatDateTime, label } from '@/lib/format';

interface ActivityPageData {
  entries: {
    id: string;
    actorName: string;
    action: string;
    method: string;
    resource: string;
    createdAt: string;
  }[];
  hasMore: boolean;
}

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApiQuery<ActivityPageData>(`/activity?page=${page}`);

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Sign-ins, changes, and recurring expense generation across Expense Tracker."
        actions={<Button type="button" variant="outline" disabled={loading} onClick={reload}>Refresh</Button>}
      />
      {error && <Notice kind="error">{error}</Notice>}
      {error && !data && page > 1 && (
        <Button type="button" variant="outline" className="mt-3" onClick={() => setPage(page - 1)}>Previous</Button>
      )}
      {!data && !error && <p role="status" className="text-sm text-muted-foreground">Loading activity…</p>}
      {data && (
        <Card>
          <Table aria-label="System activity">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">When</TableHead>
                <TableHead scope="col">Actor</TableHead>
                <TableHead scope="col">Action</TableHead>
                <TableHead scope="col">Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.length === 0 && (
                <TableRow><TableCell colSpan={4}>No activity recorded yet.</TableCell></TableRow>
              )}
              {data.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell className="min-w-28 font-medium [overflow-wrap:anywhere]">{entry.actorName}</TableCell>
                  <TableCell className="min-w-28">{label(entry.action.replace(/([a-z])([A-Z])/g, '$1 $2'))}</TableCell>
                  <TableCell className="min-w-40 font-mono text-xs [overflow-wrap:anywhere]">
                    {entry.method} {entry.resource}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CardFooter className="justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={loading || page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button type="button" variant="outline" disabled={loading || !data.hasMore} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
