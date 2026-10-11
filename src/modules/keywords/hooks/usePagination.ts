import { useState, useCallback, useMemo } from 'react';

const DEFAULT_PAGE_SIZE = 25;

export function usePagination(totalItems: number, defaultPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page to valid range when totalPages shrinks
  const safePage = Math.min(page, totalPages);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  /** Return the paginated slice of an array. */
  const paginatedSlice = useCallback(
    <T>(items: T[]): T[] => {
      const start = (safePage - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },
    [safePage, pageSize],
  );

  return useMemo(
    () => ({
      page: safePage,
      pageSize,
      totalPages,
      totalItems,
      setPage,
      setPageSize,
      resetPage,
      paginatedSlice,
    }),
    [safePage, pageSize, totalPages, totalItems, setPage, setPageSize, resetPage, paginatedSlice],
  );
}
