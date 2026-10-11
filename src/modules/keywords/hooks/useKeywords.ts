import { useState, useEffect, useMemo } from 'react';
import { subscribeToKeywords } from '../services/keywordsService';
import { useKeywordFilters } from './useKeywordFilters';
import { useKeywordSort } from './useKeywordSort';
import { usePagination } from './usePagination';
import type { KeywordOpportunity } from '../types';

export function useKeywords() {
  const [allKeywords, setAllKeywords] = useState<KeywordOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const filterHook = useKeywordFilters();
  const sortHook = useKeywordSort();

  // Subscribe to Firestore keywords collection
  useEffect(() => {
    const unsubscribe = subscribeToKeywords(
      (keywords) => {
        setAllKeywords(keywords);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  // Pipeline: filter → sort
  const filteredKeywords = useMemo(
    () => filterHook.applyFilters(allKeywords),
    [allKeywords, filterHook.applyFilters],
  );

  const sortedKeywords = useMemo(
    () => sortHook.applySortToArray(filteredKeywords),
    [filteredKeywords, sortHook.applySortToArray],
  );

  const pagination = usePagination(sortedKeywords.length);

  // Reset pagination when filters or sort change
  useEffect(() => {
    pagination.resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterHook.filters, sortHook.sort]);

  const paginatedKeywords = useMemo(
    () => pagination.paginatedSlice(sortedKeywords),
    [pagination.paginatedSlice, sortedKeywords],
  );

  // Aggregate stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: allKeywords.length,
      noContent: allKeywords.filter((kw) => kw.ethStatus === 'no-content').length,
      underperforming: allKeywords.filter(
        (kw) => kw.ethStatus === 'ranking' && (kw.ethRankPosition ?? 0) > 10,
      ).length,
      newThisWeek: allKeywords.filter((kw) => kw.createdAt >= oneWeekAgo).length,
    };
  }, [allKeywords]);

  return {
    keywords: allKeywords,
    filteredKeywords,
    sortedKeywords,
    paginatedKeywords,
    loading,
    error,
    stats,
    filters: filterHook.filters,
    setFilter: filterHook.setFilter,
    clearFilters: filterHook.clearFilters,
    sort: sortHook.sort,
    setSort: sortHook.setSort,
    pagination,
  };
}
