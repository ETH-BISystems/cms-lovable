import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PAGE_SIZES = [50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type PageItem = number | 'ellipsis';

/**
 * Page numbers to render: first and last always visible, a window around
 * the current page, ellipses over the gaps. Seven or fewer pages render
 * in full.
 */
export function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);
  if (windowStart > 2) items.push('ellipsis');
  for (let p = windowStart; p <= windowEnd; p++) items.push(p);
  if (windowEnd < total - 1) items.push('ellipsis');
  items.push(total);
  return items;
}

export interface ArticlePaginationProps {
  page: number;
  pageSize: PageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export function ArticlePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: ArticlePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Showing {first}–{last} of {totalItems}
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v) as PageSize)}
        >
          <SelectTrigger className="h-8 w-[130px]" aria-label="Articles per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                onClick={(e) => { e.preventDefault(); if (page > 1) onPageChange(page - 1); }}
              />
            </PaginationItem>
            {getPageItems(page, totalPages).map((item, idx) => (
              <PaginationItem key={item === 'ellipsis' ? `e-${idx}` : item}>
                {item === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    isActive={item === page}
                    onClick={(e) => { e.preventDefault(); onPageChange(item); }}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= totalPages}
                className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                onClick={(e) => { e.preventDefault(); if (page < totalPages) onPageChange(page + 1); }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
