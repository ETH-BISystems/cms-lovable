import { createContext, useContext, type ReactNode } from 'react';
import { useArticles } from '../hooks/useArticles';
import { useRefreshQueue } from '../hooks/useRefreshQueue';
import { usePipelineFilters } from '../hooks/usePipelineFilters';
import type { PipelineArticle, RefreshQueueItem, PipelineFilters } from '../types';

interface PipelineContextValue {
  articles: PipelineArticle[];
  pipelineArticles: PipelineArticle[];
  refreshItems: RefreshQueueItem[];
  loading: boolean;
  error: Error | null;
  filters: PipelineFilters;
  setFilter: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void;
  clearFilters: () => void;
  applyFilters: (articles: PipelineArticle[]) => PipelineArticle[];
  refetch: () => void;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const { articles, pipelineArticles, loading: articlesLoading, error: articlesError, refetch } = useArticles();
  const { refreshItems, loading: refreshLoading, error: refreshError } = useRefreshQueue();
  const { filters, setFilter, clearFilters, applyFilters } = usePipelineFilters();

  const loading = articlesLoading || refreshLoading;
  const error = articlesError || refreshError;

  return (
    <PipelineContext.Provider value={{
      articles,
      pipelineArticles,
      refreshItems,
      loading,
      error,
      filters,
      setFilter,
      clearFilters,
      applyFilters,
      refetch,
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipelineContext() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipelineContext must be used within a PipelineProvider');
  }
  return context;
}
