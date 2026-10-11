import { useEffect, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Client-side sorting + pagination for an analytics table.
 * Sorting is by object key; null/undefined values sort last.
 */
export function useSortedPagination<T>(
  rows: T[],
  defaultSortKey: keyof T & string,
  defaultDirection: SortDirection = 'desc',
) {
  const [sortKey, setSortKey] = useState<string>(defaultSortKey);
  const [direction, setDirection] = useState<SortDirection>(defaultDirection);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset to the first page whenever the underlying data changes.
  useEffect(() => {
    setPage(1);
  }, [rows]);

  const toggleSort = (key: string) => {
    if (key === sortKey) {
      setDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('desc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, direction]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [sorted, clampedPage, pageSize],
  );

  return {
    pageRows,
    sortKey,
    direction,
    toggleSort,
    page: clampedPage,
    pageSize,
    totalPages,
    totalItems: sorted.length,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
}
