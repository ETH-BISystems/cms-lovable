import { usePipelineContext } from '../context/PipelineContext';
import { useArticleDetailContext } from '../context/ArticleDetailContext';
import { ArticleDetailPanel } from './ArticleDetailPanel';
import type { ArticleStatus } from '../types';

/**
 * Renders the article detail panel once at the pipeline-routes level so every
 * page (Pipeline board, Refresh Queue, Content Library) opens the same panel
 * through ArticleDetailContext.
 */
export function ArticleDetailPanelHost() {
  const { articles } = usePipelineContext();
  const {
    isOpen,
    selectedArticleId,
    isRefreshContext,
    initialTab,
    closePanel,
    tasks,
    tasksLoading,
    versions,
    versionsLoading,
    updateStatus,
  } = useArticleDetailContext();

  const article = selectedArticleId
    ? articles.find((a) => a.id === selectedArticleId) || null
    : null;

  const handleStatusChange = (id: string, status: ArticleStatus) => {
    updateStatus(id, status).catch(() => {
      // error toast handled in useArticleMutations
    });
  };

  return (
    <ArticleDetailPanel
      article={article}
      isOpen={isOpen}
      onClose={closePanel}
      onStatusChange={handleStatusChange}
      tasks={tasks}
      tasksLoading={tasksLoading}
      versions={versions}
      versionsLoading={versionsLoading}
      isRefreshContext={isRefreshContext}
      initialTab={initialTab}
    />
  );
}
