import { useState, useEffect, useCallback } from 'react';
import type { ArticleStatus, ContentType } from '../types';
import type { ArticleTab } from './useArticles';

export type AiScoreRange = 'high' | 'medium' | 'low';
export type DateRange = 'today' | '7d' | '30d' | 'all';

export interface ArticleFilters {
  search: string | null;
  source: string | null;
  topics: string[] | null;
  aiScore: AiScoreRange | null;
  dateRange: DateRange | null;
  contentType: ContentType | null;
  status: ArticleStatus | null;
  dismissedBy: string | null;
  researchedBy: string | null;
}

const defaultFilters: ArticleFilters = {
  search: null,
  source: null,
  topics: null,
  aiScore: null,
  dateRange: null,
  contentType: null,
  status: null,
  dismissedBy: null,
  researchedBy: null,
};

export function useArticleFilters(tab: ArticleTab) {
  const [filters, setFilters] = useState<ArticleFilters>(defaultFilters);

  // Reset filters when tab changes
  useEffect(() => {
    setFilters(defaultFilters);
  }, [tab]);

  const setSearch = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, search: value }));
  }, []);

  const setSource = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, source: value }));
  }, []);

  const setTopics = useCallback((value: string[] | null) => {
    setFilters((prev) => ({ ...prev, topics: value }));
  }, []);

  const setAiScore = useCallback((value: AiScoreRange | null) => {
    setFilters((prev) => ({ ...prev, aiScore: value }));
  }, []);

  const setDateRange = useCallback((value: DateRange | null) => {
    setFilters((prev) => ({ ...prev, dateRange: value }));
  }, []);

  const setContentType = useCallback((value: ContentType | null) => {
    setFilters((prev) => ({ ...prev, contentType: value }));
  }, []);

  const setStatus = useCallback((value: ArticleStatus | null) => {
    setFilters((prev) => ({ ...prev, status: value }));
  }, []);

  const setDismissedBy = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, dismissedBy: value }));
  }, []);

  const setResearchedBy = useCallback((value: string | null) => {
    setFilters((prev) => ({ ...prev, researchedBy: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  return {
    filters,
    setSearch,
    setSource,
    setTopics,
    setAiScore,
    setDateRange,
    setContentType,
    setStatus,
    setDismissedBy,
    setResearchedBy,
    clearFilters,
  };
}
