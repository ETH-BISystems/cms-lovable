import { createContext, useContext, type ReactNode } from 'react';
import { useArticleDetail } from '../hooks/useArticleDetail';
import { useArticleTasks } from '../hooks/useArticleTasks';
import { useArticleVersions } from '../hooks/useArticleVersions';
import { useArticleMutations } from '../hooks/useArticleMutations';
import type { ArticleTask, ArticleVersion, ArticleStatus } from '../types';

interface ArticleDetailContextValue {
  isOpen: boolean;
  selectedArticleId: string | null;
  isRefreshContext: boolean;
  /** Undefined when the opener didn't request a specific tab — the panel then
   * lands on the article stage's working surface (CMS-153). */
  initialTab: string | undefined;
  openPanel: (articleId: string, refreshContext?: boolean, tab?: string) => void;
  closePanel: () => void;
  tasks: ArticleTask[];
  tasksLoading: boolean;
  versions: ArticleVersion[];
  versionsLoading: boolean;
  updateStatus: (articleId: string, newStatus: ArticleStatus) => Promise<void>;
  loading: Record<string, boolean>;
  error: Record<string, Error | null>;
}

const ArticleDetailCtx = createContext<ArticleDetailContextValue | null>(null);

export function ArticleDetailProvider({ children }: { children: ReactNode }) {
  const { isOpen, selectedArticleId, isRefreshContext, initialTab, openPanel, closePanel } = useArticleDetail();
  const { tasks, loading: tasksLoading } = useArticleTasks(selectedArticleId);
  const { versions, loading: versionsLoading } = useArticleVersions(selectedArticleId);
  const { updateStatus, loading, error } = useArticleMutations();

  return (
    <ArticleDetailCtx.Provider value={{
      isOpen,
      selectedArticleId,
      isRefreshContext,
      initialTab,
      openPanel,
      closePanel,
      tasks,
      tasksLoading,
      versions,
      versionsLoading,
      updateStatus,
      loading,
      error,
    }}>
      {children}
    </ArticleDetailCtx.Provider>
  );
}

export function useArticleDetailContext() {
  const context = useContext(ArticleDetailCtx);
  if (!context) {
    throw new Error('useArticleDetailContext must be used within an ArticleDetailProvider');
  }
  return context;
}
