import { useCallback, useMemo } from 'react';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import type { KeywordOpportunity, TopPage } from '../types';

/** Roles that can perform Research/Refresh actions. */
const ACTION_ROLES: Role[] = [Role.Admin, Role.Editor, Role.Writer];

export function useKeywordActions() {
  const { role } = useAuth();

  const canPerformActions = useMemo(
    () => role !== null && ACTION_ROLES.includes(role),
    [role],
  );

  /**
   * Open the New Article modal pre-populated with keyword data.
   * In production this would integrate with the pipeline module's modal context.
   * For now, we log the intent and the data that would be passed.
   */
  const handleResearch = useCallback(
    (keyword: KeywordOpportunity) => {
      if (!canPerformActions) return;

      // Pipeline integration: open NewArticleModal with pre-populated fields
      // This will be wired to the pipeline module's context when available
      console.info('[Keywords] Research action:', {
        title: keyword.keyword,
        targetKeyword: keyword.keyword,
        kd: keyword.kd,
        searchVolume: keyword.searchVolume,
        format: keyword.format,
        source: 'keyword',
        sourceDetail: keyword.keyword,
        competitors: keyword.competitors,
        topicCluster: keyword.topicCluster,
      });
    },
    [canPerformActions],
  );

  /**
   * Open the Refresh Article modal pre-populated with keyword data.
   */
  const handleRefresh = useCallback(
    (keyword: KeywordOpportunity) => {
      if (!canPerformActions) return;

      // Pipeline integration: open RefreshArticleModal with pre-populated fields
      console.info('[Keywords] Refresh action:', {
        articleTitle: keyword.ethArticleTitle ?? keyword.keyword,
        keyword: keyword.keyword,
        currentPosition: keyword.ethRankPosition,
      });
    },
    [canPerformActions],
  );

  /**
   * Handle Research action from a Top Page.
   */
  const handleTopPageResearch = useCallback(
    (page: TopPage) => {
      if (!canPerformActions) return;

      console.info('[Keywords] Top Page Research action:', {
        targetKeyword: page.topKeyword,
        source: 'keyword',
        sourceDetail: 'Top Pages',
        sourceUrl: page.fullUrl,
      });
    },
    [canPerformActions],
  );

  /**
   * Handle Refresh action from a Top Page.
   */
  const handleTopPageRefresh = useCallback(
    (page: TopPage) => {
      if (!canPerformActions) return;

      console.info('[Keywords] Top Page Refresh action:', {
        keyword: page.topKeyword,
        currentPosition: page.ethPosition,
      });
    },
    [canPerformActions],
  );

  return {
    canPerformActions,
    handleResearch,
    handleRefresh,
    handleTopPageResearch,
    handleTopPageRefresh,
  };
}
