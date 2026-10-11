import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import {
  LayoutGrid,
  List,
  Settings2,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  RefreshCw,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import {
  NewArticleModal,
  useNewArticleModal,
  useArticleDetailContext,
  callCreateArticle,
  type CreateArticleInput,
} from '@/modules/pipeline';
import { useArticles } from '../hooks/useArticles';
import type { ArticleTab } from '../hooks/useArticles';
import { useFeeds } from '../hooks/useFeeds';
import { useTrendingTopics } from '../hooks/useTrendingTopics';
import { useArticleFilters } from '../hooks/useArticleFilters';
import { rssService } from '../services/rssService';
import { buildResearchPrefill, buildTopicResearchInput, canResearchArticle } from '../utils/researchPrefill';
import type { RSSArticle, TrendingTopic } from '../types';
import { ArticleCard } from './ArticleCard';
import { ArticleRow } from './ArticleRow';
import { ArticleFiltersComponent } from './ArticleFilters';
import { BulkActionBar } from './BulkActionBar';
import { StatsBar } from './StatsBar';
import { ArticlePagination, PAGE_SIZES, type PageSize } from './ArticlePagination';
import { TrendingTopicBanner } from './TrendingTopicBanner';
import { FeedManagementPanel } from './FeedManagementPanel';

type ViewMode = 'card' | 'list';
export type SortDirection = 'asc' | 'desc';
export interface SortState {
  column: string;
  direction: SortDirection;
}

const SESSION_VIEW_MODE_KEY = 'rss-view-mode';
const SESSION_PAGE_SIZE_KEY = 'rss-page-size';

function getInitialViewMode(): ViewMode {
  try {
    const stored = sessionStorage.getItem(SESSION_VIEW_MODE_KEY);
    if (stored === 'card' || stored === 'list') return stored;
  } catch { /* ignore */ }
  return 'card';
}

function getInitialPageSize(): PageSize {
  try {
    const stored = Number(sessionStorage.getItem(SESSION_PAGE_SIZE_KEY));
    if ((PAGE_SIZES as readonly number[]).includes(stored)) return stored as PageSize;
  } catch { /* ignore */ }
  return PAGE_SIZES[0];
}

/** Sort articles client-side for list view. */
export function sortArticles(articles: RSSArticle[], sort: SortState): RSSArticle[] {
  const sorted = [...articles];
  const dir = sort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sort.column) {
      case 'aiScore':
        return (a.aiScore - b.aiScore) * dir;
      case 'keywordDifficulty':
        return (a.keywordDifficulty - b.keywordDifficulty) * dir;
      case 'searchVolume':
        return (a.searchVolume - b.searchVolume) * dir;
      case 'publishedAt':
        return (a.publishedAt.toDate().getTime() - b.publishedAt.toDate().getTime()) * dir;
      default:
        return 0;
    }
  });

  return sorted;
}

export function RSSPage() {
  const { userProfile, role } = useAuth();
  const displayName = userProfile?.displayName ?? 'Unknown';

  // Role-based access flags
  const canManageFeeds = role === Role.Admin || role === Role.Editor;
  const canTriageArticles = role === Role.Admin || role === Role.Editor;
  const canPermanentlyDelete = role === Role.Admin;

  // Tab state
  const [activeTab, setActiveTab] = useState<ArticleTab>('feed');

  // View mode (session-persisted)
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  // Feed management panel
  const [feedPanelOpen, setFeedPanelOpen] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // List view sort state
  const [sort, setSort] = useState<SortState>({ column: 'publishedAt', direction: 'desc' });

  // Pagination (page size session-persisted)
  const [pageSize, setPageSize] = useState<PageSize>(getInitialPageSize);
  const [page, setPage] = useState(1);

  // Dismissed trending topic IDs (session state)
  const [dismissedTopicIds, setDismissedTopicIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // SEO metrics enrichment (CMS-30)
  const [enriching, setEnriching] = useState(false);

  // Research flow — Start New Article modal, prefilled from the RSS item
  const researchModal = useNewArticleModal();
  const { openPanel } = useArticleDetailContext();
  const [researchItemId, setResearchItemId] = useState<string | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
  // CMS-112: bulk + topic research (previously hardcoded-disabled buttons)
  const [bulkResearching, setBulkResearching] = useState(false);
  const [researchingTopicId, setResearchingTopicId] = useState<string | null>(null);

  // Hooks
  const filterState = useArticleFilters(activeTab);
  const { articles, loading, error } = useArticles(activeTab, filterState.filters);
  const { feeds } = useFeeds();
  const { topics: trendingTopics } = useTrendingTopics();

  // Global header search deep link: /rss?q=<term> seeds the keyword search,
  // then the param is consumed so in-page edits aren't overwritten.
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParam = searchParams.get('q');
  const { setSearch } = filterState;
  useEffect(() => {
    if (searchParam === null) return;
    setSearch(searchParam.trim() || null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        return next;
      },
      { replace: true },
    );
  }, [searchParam, setSearch, setSearchParams]);

  // Persist view mode
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  // Persist page size
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_PAGE_SIZE_KEY, String(pageSize)); } catch { /* ignore */ }
  }, [pageSize]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab]);

  // Back to page 1 whenever the visible set changes shape
  useEffect(() => {
    setPage(1);
  }, [activeTab, filterState.filters, sort, pageSize]);

  // Visible trending topics (Feed tab only, not dismissed)
  const visibleTopics = useMemo(
    () => trendingTopics.filter((t) => !dismissedTopicIds.has(t.id)),
    [trendingTopics, dismissedTopicIds],
  );

  // Sorted articles for list view
  const displayArticles = useMemo(
    () => (viewMode === 'list' ? sortArticles(articles, sort) : articles),
    [articles, viewMode, sort],
  );

  // Current page of articles. Live updates can shrink the set below the
  // current page start, so clamp rather than showing an empty page.
  const totalPages = Math.max(1, Math.ceil(displayArticles.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedArticles = useMemo(
    () => displayArticles.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [displayArticles, currentPage, pageSize],
  );



  /* ── Handlers ── */

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as ArticleTab);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allOnPageSelected =
    pagedArticles.length > 0 && pagedArticles.every((a) => selectedIds.has(a.id));

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pagedArticles.every((a) => next.has(a.id))) {
        pagedArticles.forEach((a) => next.delete(a.id));
      } else {
        pagedArticles.forEach((a) => next.add(a.id));
      }
      return next;
    });
  }, [pagedArticles]);

  const handleDismiss = useCallback(async (articleId: string) => {
    try {
      await rssService.dismissArticle({ articleId, dismissedBy: displayName });
      toast('Article dismissed', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await rssService.restoreArticle(articleId);
              toast.success('Article restored');
            } catch {
              toast.error('Failed to undo dismiss');
            }
          },
        },
      });
    } catch {
      toast.error('Failed to dismiss article');
    }
  }, [displayName]);

  const handleRestore = useCallback(async (articleId: string) => {
    try {
      await rssService.restoreArticle(articleId);
      toast.success('Article restored');
    } catch {
      toast.error('Failed to restore article');
    }
  }, []);

  /** Research click: open the Start New Article modal prefilled from the RSS item. */
  const handleResearch = useCallback((articleId: string) => {
    const item = articles.find((a) => a.id === articleId);
    if (!item) return;
    if (!canResearchArticle(item)) {
      toast.info('Already in the pipeline', {
        description: 'Find it on the Pipeline board in the New Article column.',
      });
      return;
    }
    setResearchItemId(item.id);
    researchModal.openModal(buildResearchPrefill(item));
  }, [articles, researchModal]);

  const handleResearchModalClose = useCallback(() => {
    setResearchItemId(null);
    researchModal.closeModal();
  }, [researchModal]);

  /** Modal submit: create the pipeline article (callable marks the RSS item researching). */
  const handleResearchSubmit = useCallback(async (input: CreateArticleInput) => {
    if (!researchItemId) return;
    setCreatingArticle(true);
    try {
      const articleId = await callCreateArticle({ ...input, rssItemId: researchItemId });
      toast.success('Added to Article Pipeline', {
        description: 'Opening the Research Brief — also on the Pipeline board in the New Article column.',
      });
      openPanel(articleId, false, 'Research Brief');
    } catch (err) {
      toast.error('Failed to add to pipeline', { description: (err as Error).message });
    } finally {
      setCreatingArticle(false);
      setResearchItemId(null);
    }
  }, [researchItemId, openPanel]);

  /**
   * CMS-112 "Research Selected": one pipeline article per selected feed item,
   * created directly from the prefill (no modal per item). Items already in
   * the pipeline are skipped; per-item failures don't abort the batch.
   */
  const handleBulkResearch = useCallback(async () => {
    const selected = articles.filter((a) => selectedIds.has(a.id));
    const researchable = selected.filter(canResearchArticle);
    const skipped = selected.length - researchable.length;
    if (researchable.length === 0) {
      toast.info('Nothing to research', {
        description: skipped > 0 ? 'Every selected item is already in the pipeline.' : 'Select at least one feed article first.',
      });
      return;
    }
    setBulkResearching(true);
    let created = 0;
    let failed = 0;
    for (const item of researchable) {
      try {
        const prefill = buildResearchPrefill(item);
        await callCreateArticle({
          title: prefill.title ?? item.title,
          targetKeyword: item.topics?.[0] ?? item.title,
          assignee: {
            name: displayName,
            avatar: displayName.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'UN',
          },
          priority: 'Medium',
          entryPoint: 'RSS',
          source: { type: 'RSS Feed', label: item.source },
          sourceUrls: prefill.sourceUrls,
          topicCluster: prefill.topicCluster,
          editorialNotes: prefill.editorialNotes,
          rssItemId: item.id,
        });
        created++;
      } catch {
        failed++;
      }
    }
    setBulkResearching(false);
    setSelectedIds(new Set());
    if (failed === 0) {
      toast.success(`${created} article${created !== 1 ? 's' : ''} added to the Article Pipeline`, {
        description: skipped > 0 ? `${skipped} selected item${skipped !== 1 ? 's were' : ' was'} already in the pipeline — skipped.` : 'Find them on the Pipeline board in the New Article column.',
      });
    } else {
      toast.warning(`${created} added, ${failed} failed`, {
        description: 'The failed items were left selected-free in the feed — try researching them individually.',
      });
    }
  }, [articles, selectedIds, displayName]);

  /**
   * CMS-112 "Research This Topic": ONE pipeline article for the whole story
   * cluster — all still-researchable cluster articles attach as competitor
   * sources and are marked In Pipeline (rssItemIds bulk handoff).
   */
  const handleResearchTopic = useCallback(async (topic: TrendingTopic) => {
    const cluster = articles.filter((a) => topic.articleIds.includes(a.id));
    const researchable = cluster.filter(canResearchArticle);
    if (researchable.length === 0) {
      toast.info('Already in the pipeline', {
        description: 'Every article in this topic cluster is already being researched.',
      });
      return;
    }
    setResearchingTopicId(topic.id);
    try {
      const articleId = await callCreateArticle(buildTopicResearchInput(topic, researchable, displayName));
      toast.success('Topic added to Article Pipeline', {
        description: `${researchable.length} source${researchable.length !== 1 ? 's' : ''} attached — opening the Research Brief.`,
      });
      openPanel(articleId, false, 'Research Brief');
    } catch (err) {
      toast.error('Failed to add topic to pipeline', { description: (err as Error).message });
    } finally {
      setResearchingTopicId(null);
    }
  }, [articles, displayName, openPanel]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteArticleId) return;
    setDeleting(true);
    try {
      await rssService.deleteArticle(deleteArticleId);
      toast.success('Article permanently deleted');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteArticleId);
        return next;
      });
    } catch {
      toast.error('Failed to delete article');
    } finally {
      setDeleting(false);
      setDeleteArticleId(null);
    }
  }, [deleteArticleId]);

  const handleBulkDismiss = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await rssService.bulkDismiss({ articleIds: ids, dismissedBy: displayName });
      toast('Dismissed ' + ids.length + ' article(s)', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await rssService.bulkRestore(ids);
              toast.success('Articles restored');
            } catch {
              toast.error('Failed to undo bulk dismiss');
            }
          },
        },
      });
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to dismiss articles');
    }
  }, [selectedIds, displayName]);

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await rssService.bulkRestore(ids);
      toast.success('Restored ' + ids.length + ' article(s)');
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to restore articles');
    }
  }, [selectedIds]);

  const handleDismissTopic = useCallback((topicId: string) => {
    setDismissedTopicIds((prev) => {
      const next = new Set(prev);
      next.add(topicId);
      // Set up undo — remove from dismissed set after 5s if not undone
      toast('Trending topic dismissed', {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: () => {
            setDismissedTopicIds((p) => {
              const n = new Set(p);
              n.delete(topicId);
              return n;
            });
          },
        },
      });
      return next;
    });
  }, []);

  /** Articles on the current page whose SEO metrics were never fetched. */
  const unenrichedOnPage = useMemo(
    () => pagedArticles.filter((a) => !a.keywordMetricsStatus).map((a) => a.id),
    [pagedArticles],
  );

  /** Fetch KD + Search Vol from DataForSEO for the un-enriched articles on this page. */
  const handleEnrichKeywords = useCallback(async () => {
    if (unenrichedOnPage.length === 0) return;
    setEnriching(true);
    try {
      // The callable caps a batch at 50 articles
      const { enrichedCount, noDataCount } = await rssService.enrichArticleKeywords(
        unenrichedOnPage.slice(0, 50),
      );
      toast.success(
        `SEO metrics fetched for ${enrichedCount} article(s)` +
          (noDataCount > 0 ? ` — no keyword data for ${noDataCount}` : ''),
      );
    } catch (err) {
      toast.error('Failed to fetch SEO metrics', { description: (err as Error).message });
    } finally {
      setEnriching(false);
    }
  }, [unenrichedOnPage]);

  const handleSortColumn = useCallback((column: string) => {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  const SortIcon = ({ column }: { column: string }) => {
    if (sort.column !== column) return null;
    return sort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 inline ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">RSS Feed Monitor</h1>
        {canManageFeeds && (
          <Button variant="outline" onClick={() => setFeedPanelOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Feeds
          </Button>
        )}
      </div>

      {/* Stats bar */}
      <StatsBar articles={articles} trendingTopicCount={visibleTopics.length} />

      {/* Tab bar + view toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="researching">
              Researching
              {activeTab === 'researching' && articles.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                  {articles.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              Dismissed
              {activeTab === 'dismissed' && articles.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium">
                  {articles.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          {canTriageArticles && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 mr-2"
              onClick={handleEnrichKeywords}
              disabled={enriching || unenrichedOnPage.length === 0}
              title="Fetch keyword difficulty and search volume from DataForSEO for the un-enriched articles on this page"
            >
              <Gauge className="h-3.5 w-3.5 mr-1.5" />
              {enriching
                ? 'Fetching SEO data…'
                : `Enrich SEO data${unenrichedOnPage.length > 0 ? ` (${Math.min(unenrichedOnPage.length, 50)})` : ''}`}
            </Button>
          )}
          <Button
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('card')}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Trending topic banners (Feed tab only) */}
      {activeTab === 'feed' && visibleTopics.length > 0 && (
        <div className="space-y-2">
          {visibleTopics.map((topic) => (
            <TrendingTopicBanner
              key={topic.id}
              topic={topic}
              onDismiss={handleDismissTopic}
              onResearch={canTriageArticles ? handleResearchTopic : undefined}
              researching={researchingTopicId === topic.id}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <ArticleFiltersComponent
        tab={activeTab}
        filters={filterState.filters}
        feeds={feeds}
        articles={articles}
        setSearch={filterState.setSearch}
        setSource={filterState.setSource}
        setTopics={filterState.setTopics}
        setAiScore={filterState.setAiScore}
        setDateRange={filterState.setDateRange}
        setContentType={filterState.setContentType}
        setStatus={filterState.setStatus}
        setDismissedBy={filterState.setDismissedBy}
        setResearchedBy={filterState.setResearchedBy}
        clearFilters={filterState.clearFilters}
      />

      {/* Bulk action bar */}
      {canTriageArticles && (
        <BulkActionBar
          tab={activeTab}
          selectedCount={selectedIds.size}
          onBulkDismiss={handleBulkDismiss}
          onBulkRestore={handleBulkRestore}
          onBulkResearch={handleBulkResearch}
          bulkResearching={bulkResearching}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">Failed to load articles. Please try again.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && displayArticles.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          {activeTab === 'feed' && 'No new articles. Add feeds and poll to discover content.'}
          {activeTab === 'researching' && 'No articles are being researched yet.'}
          {activeTab === 'dismissed' && 'No dismissed articles.'}
        </div>
      )}

      {/* Article content */}
      {!loading && !error && displayArticles.length > 0 && (
        <>
          {viewMode === 'card' ? (
            /* Card view: 3-column responsive grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pagedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  isSelected={selectedIds.has(article.id)}
                  onSelect={handleToggleSelect}
                  onDismiss={canTriageArticles ? handleDismiss : undefined}
                  onRestore={activeTab === 'dismissed' && canTriageArticles ? handleRestore : undefined}
                  onDelete={activeTab === 'dismissed' && canPermanentlyDelete ? (id) => setDeleteArticleId(id) : undefined}
                  onResearch={canTriageArticles ? handleResearch : undefined}
                />
              ))}
            </div>
          ) : (
            /* List view: sortable table */
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 w-10">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all articles on this page"
                      />
                    </th>
                    <th className="p-3 text-left font-medium">Title / Source</th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer select-none"
                      onClick={() => handleSortColumn('aiScore')}
                    >
                      AI Score
                      <SortIcon column="aiScore" />
                    </th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer select-none"
                      onClick={() => handleSortColumn('keywordDifficulty')}
                    >
                      KD
                      <SortIcon column="keywordDifficulty" />
                    </th>
                    <th
                      className="p-3 text-right font-medium cursor-pointer select-none"
                      onClick={() => handleSortColumn('searchVolume')}
                    >
                      Search Vol
                      <SortIcon column="searchVolume" />
                    </th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-left font-medium">Topics</th>
                    <th
                      className="p-3 text-left font-medium cursor-pointer select-none"
                      onClick={() => handleSortColumn('publishedAt')}
                    >
                      Published
                      <SortIcon column="publishedAt" />
                    </th>
                    <th className="p-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedArticles.map((article) => (
                    <ArticleRow
                      key={article.id}
                      article={article}
                      isSelected={selectedIds.has(article.id)}
                      onSelect={handleToggleSelect}
                      onDismiss={canTriageArticles ? handleDismiss : undefined}
                      onRestore={activeTab === 'dismissed' && canTriageArticles ? handleRestore : undefined}
                      onDelete={activeTab === 'dismissed' && canPermanentlyDelete ? (id) => setDeleteArticleId(id) : undefined}
                      onResearch={canTriageArticles ? handleResearch : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <ArticlePagination
            page={currentPage}
            pageSize={pageSize}
            totalItems={displayArticles.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* Feed Management Panel */}
      <FeedManagementPanel open={feedPanelOpen} onClose={() => setFeedPanelOpen(false)} />

      {/* Start New Article modal — Research handoff, prefilled from the RSS item */}
      <NewArticleModal
        open={researchModal.isOpen}
        onClose={handleResearchModalClose}
        onSubmit={handleResearchSubmit}
        prefillData={researchModal.prefillData}
        loading={creatingArticle}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteArticleId !== null}
        onOpenChange={(isOpen) => { if (!isOpen) setDeleteArticleId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The article will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
