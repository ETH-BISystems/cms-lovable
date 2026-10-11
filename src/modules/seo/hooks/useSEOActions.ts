import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  callRunSiteHealthCrawl,
  callTrackPositions,
  callAuditPage,
  callRunSiteAudit,
  callTrackAIOverviews,
  callSubmitForIndexing,
  callCreateRedirect,
  callUpdateRedirect,
  callDeleteRedirect,
  callTestRedirect,
} from '../services/seoCallables';
import type {
  SiteId,
  CreateRedirectInput,
  UpdateRedirectInput,
} from '../types';

export function useSEOActions() {
  // Role-based access — default to true since auth integration is separate
  const canEdit = true;
  const canAdmin = true;

  // ── Cloud Function action handlers ──────────────────────────────────────

  const handleRunSiteHealthCrawl = useCallback(async (siteId: SiteId) => {
    try {
      await callRunSiteHealthCrawl({ siteId });
      toast.success('Site health crawl started');
    } catch (err) {
      toast.error('Failed to start site health crawl');
      throw err;
    }
  }, []);

  const handleTrackPositions = useCallback(async (siteId: SiteId) => {
    try {
      const result = await callTrackPositions({ siteId });
      toast.success(`Position tracking updated — ${result.keywordsUpdated} keywords refreshed`);
    } catch (err) {
      toast.error('Failed to track positions');
      throw err;
    }
  }, []);

  const handleAuditPage = useCallback(async (siteId: SiteId, articleId: string) => {
    try {
      const result = await callAuditPage({ siteId, articleId });
      toast.success(`Page audited — SEO score: ${result.seoScore}`);
      return result;
    } catch (err) {
      toast.error('Failed to audit page');
      throw err;
    }
  }, []);

  const handleRunSiteAudit = useCallback(async (siteId: SiteId) => {
    try {
      const result = await callRunSiteAudit({ siteId });
      toast.success('Full site audit started');
      return result;
    } catch (err) {
      toast.error('Failed to start site audit');
      throw err;
    }
  }, []);

  const handleTrackAIOverviews = useCallback(async (siteId: SiteId) => {
    try {
      const result = await callTrackAIOverviews({ siteId });
      toast.success(`AI overview tracking updated — ${result.keywordsChecked} keywords checked`);
    } catch (err) {
      toast.error('Failed to track AI overviews');
      throw err;
    }
  }, []);

  const handleSubmitForIndexing = useCallback(async (siteId: SiteId, urls: string[]) => {
    try {
      const result = await callSubmitForIndexing({ siteId, urls });
      toast.success(
        `${result.submitted} URL(s) submitted for indexing — ${result.quotaRemaining} quota remaining`
      );
    } catch (err) {
      toast.error('Failed to submit for indexing');
      throw err;
    }
  }, []);

  const handleCreateRedirect = useCallback(async (input: CreateRedirectInput) => {
    try {
      const result = await callCreateRedirect(input);
      toast.success('Redirect created');
      return result;
    } catch (err) {
      toast.error('Failed to create redirect');
      throw err;
    }
  }, []);

  const handleUpdateRedirect = useCallback(async (input: UpdateRedirectInput) => {
    try {
      await callUpdateRedirect(input);
      toast.success('Redirect updated');
    } catch (err) {
      toast.error('Failed to update redirect');
      throw err;
    }
  }, []);

  const handleDeleteRedirect = useCallback(async (siteId: SiteId, redirectId: string) => {
    try {
      await callDeleteRedirect({ siteId, redirectId });
      toast.success('Redirect deleted');
    } catch (err) {
      toast.error('Failed to delete redirect');
      throw err;
    }
  }, []);

  const handleTestRedirect = useCallback(async (siteId: SiteId, redirectId: string) => {
    try {
      const result = await callTestRedirect({ siteId, redirectId });
      if (result.working) {
        toast.success(`Redirect working — ${result.hops} hop(s) to ${result.finalUrl}`);
      } else {
        toast.error(`Redirect not working${result.details ? `: ${result.details}` : ''}`);
      }
      return result;
    } catch (err) {
      toast.error('Failed to test redirect');
      throw err;
    }
  }, []);

  // ── Content refresh integration stubs ───────────────────────────────────

  const handleRefreshFromAudit = useCallback((article: { articleId: string; title: string }) => {
    toast.info(`Opening refresh flow for "${article.title}"…`);
    // TODO: Open refresh modal or navigate to refresh queue
  }, []);

  const handleRefreshFromPosition = useCallback((keyword: { keyword: string; ethUrl: string | null }) => {
    toast.info(`Opening refresh flow for keyword "${keyword.keyword}"…`);
    // TODO: Open refresh modal or navigate to refresh queue
  }, []);

  const handleOptimizeFromAIOverview = useCallback((keyword: { keyword: string; id: string }) => {
    toast.info(`Opening optimization tips for "${keyword.keyword}"…`);
    // TODO: Open optimization modal with AI overview tips
  }, []);

  const handleCreateFromAIOverview = useCallback((keyword: { keyword: string; volume: number }) => {
    toast.info(`Opening article creation for "${keyword.keyword}"…`);
    // TODO: Navigate to pipeline with pre-filled keyword
  }, []);

  return {
    canEdit,
    canAdmin,
    handleRunSiteHealthCrawl,
    handleTrackPositions,
    handleAuditPage,
    handleRunSiteAudit,
    handleTrackAIOverviews,
    handleSubmitForIndexing,
    handleCreateRedirect,
    handleUpdateRedirect,
    handleDeleteRedirect,
    handleTestRedirect,
    handleRefreshFromAudit,
    handleRefreshFromPosition,
    handleOptimizeFromAIOverview,
    handleCreateFromAIOverview,
  };
}
