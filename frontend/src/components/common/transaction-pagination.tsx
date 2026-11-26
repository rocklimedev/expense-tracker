import { Button } from '@/components/ui/button';

const PAGE_SIZE = 20;

export function paginateTransactions<T>(rows: readonly T[], requestedPage: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(pageCount, Math.max(1, requestedPage))
    : 1;
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  return { rows: rows.slice(start, end), page, pageCount, total, start, end };
}

export function TransactionPagination({
  pagination: { page, pageCount, total, start, end },
  onPageChange,
  scrollTarget,
}: {
  pagination: Omit<ReturnType<typeof paginateTransactions>, 'rows'>;
  onPageChange: (page: number) => void;
  scrollTarget: string;
}) {
  if (pageCount <= 1) return null;

  function changePage(nextPage: number) {
    onPageChange(nextPage);
    document.getElementById(scrollTarget)?.scrollIntoView({ block: 'start' });
  }

  return (
    <nav aria-label="Transaction pagination" className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <span className="text-sm text-muted-foreground" aria-live="polite">
        {start + 1}–{end} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => changePage(page - 1)}>
          Previous
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">Page {page} of {pageCount}</span>
        <Button type="button" variant="outline" size="sm" disabled={page === pageCount} onClick={() => changePage(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}
