import { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps {
  totalItems: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  /** Optional ref to scroll to top on page change */
  scrollRef?: React.RefObject<HTMLElement>;
}

const PER_PAGE_OPTIONS = [25, 50, 100];

export function DataTablePagination({ totalItems, page, perPage, onPageChange, onPerPageChange, scrollRef }: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const startItem = Math.min((page - 1) * perPage + 1, totalItems);
  const endItem = Math.min(page * perPage, totalItems);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page <= 4) {
        for (let i = 2; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push('ellipsis');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [totalPages, page]);

  const goToPage = useCallback((p: number) => {
    const clamped = Math.max(1, Math.min(p, totalPages));
    onPageChange(clamped);
    scrollRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages, onPageChange, scrollRef]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToPage(page - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToPage(page + 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, goToPage]);

  if (totalItems <= 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-t border-border text-xs" style={{ minHeight: '48px' }}>
      {/* Left: Results count */}
      <span className="text-muted-foreground whitespace-nowrap">
        Showing {startItem}–{endItem} of {totalItems.toLocaleString()} results
      </span>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'ghost'}
              size="icon"
              className={cn(
                'h-7 w-7 text-[11px] font-medium',
                p === page
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90 rounded-full'
                  : 'text-muted-foreground hover:bg-accent/10'
              )}
              onClick={() => goToPage(p as number)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Right: Rows per page */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-muted-foreground">Show</span>
        <Select value={String(perPage)} onValueChange={v => { onPerPageChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-7 w-16 text-xs border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map(n => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Hook to manage pagination state. Returns [page, perPage, setPage, setPerPage, paginatedData, totalCount].
 */
export function usePagination<T>(data: T[], defaultPerPage = 25) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(defaultPerPage);

  // Reset to page 1 when data changes length significantly
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / perPage));
    if (page > maxPage) setPage(maxPage);
  }, [data.length, perPage, page]);

  const paged = useMemo(() => data.slice((page - 1) * perPage, page * perPage), [data, page, perPage]);

  return { page, perPage, setPage, setPerPage, paged, totalItems: data.length };
}
