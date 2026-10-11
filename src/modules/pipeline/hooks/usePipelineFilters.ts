import { useState, useCallback } from 'react';
import type { PipelineFilters, PipelineArticle } from '../types';

const DEFAULT_FILTERS: PipelineFilters = {
  entryPoint: 'All',
  priority: 'All',
  assignee: 'All',
  eeat: 'All',
  blocked: 'All',
};

export function usePipelineFilters() {
  const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_FILTERS);

  const setFilter = useCallback(
    <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const applyFilters = useCallback(
    (articles: PipelineArticle[]): PipelineArticle[] => {
      return articles.filter((article) => {
        if (filters.entryPoint !== 'All' && article.entryPoint !== filters.entryPoint) return false;
        if (filters.priority !== 'All' && article.priority !== filters.priority) return false;
        if (filters.assignee !== 'All' && article.assignee.name !== filters.assignee) return false;
        if (filters.eeat === 'Experience Sourced' && !article.hasExperience) return false;
        if (filters.eeat === 'No Experience' && article.hasExperience) return false;
        if (filters.blocked === 'Has Blockers' && !article.taskProgress.hasBlocked) return false;
        if (filters.blocked === 'No Blockers' && article.taskProgress.hasBlocked) return false;
        return true;
      });
    },
    [filters]
  );

  return { filters, setFilter, clearFilters, applyFilters };
}
