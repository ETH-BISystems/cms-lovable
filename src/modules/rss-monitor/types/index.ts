import { Timestamp } from '@/services/timestamp';

export type FeedStatus = 'active' | 'paused' | 'error';
export type ArticleStatus = 'new' | 'researching' | 'dismissed' | 'in-pipeline';
// 'News' | 'Deal' | 'Guide' | 'Review' are what the enrichment function
// writes today (functions/src/rss-monitor/enrich.ts); the specific review
// subtypes remain for legacy documents.
export type ContentType =
  | 'News'
  | 'Deal'
  | 'Guide'
  | 'Review'
  | 'Airline Review'
  | 'Hotel Review'
  | 'Card Review'
  | 'Lounge Review'
  | 'Deal Alert';

export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  status: FeedStatus;
  errorMessage?: string;
  lastPolled: Timestamp;
  totalIngested: number;
  last7DaysCount: number;
  pollInterval: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface RSSArticle {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  source: string;
  sourceAbbreviation: string;
  publishedAt: Timestamp;
  aiScore: number;
  aiRationale: string;
  topics: string[];
  contentType: ContentType;
  keywordDifficulty: number;
  searchVolume: number;
  /** Keyword the SEO metrics were fetched for (set by enrichArticleKeywords). */
  primaryKeyword?: string;
  /**
   * SEO metrics enrichment state (CMS-30). Absent = not enriched yet
   * (polling ingests articles without metrics; enrichment is an explicit,
   * paid DataForSEO call). 'no-data' = enriched but the keyword database
   * had nothing for the derived keyword.
   */
  keywordMetricsStatus?: 'enriched' | 'no-data';
  keywordMetricsAt?: Timestamp;
  status: ArticleStatus;
  feedId: string;
  contentHash: string;
  clusterId?: string;
  dismissedAt?: Timestamp;
  dismissedBy?: string;
  researchedBy?: string;
  researchedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TrendingTopic {
  id: string;
  /** Representative headline of the story cluster (was a taxonomy topic pre-Jul 2026). */
  topic: string;
  /** Per-article source names, aligned index-for-index with articleTitles. */
  sources: string[];
  articleTitles: string[];
  articleIds: string[];
  /** Articles in the cluster. */
  count: number;
  /** Distinct sources covering the story. */
  sourceCount?: number;
  detectedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface AddFeedInput {
  name: string;
  url: string;
  pollInterval: string;
}

export interface UpdateFeedInput {
  feedId: string;
  name?: string;
  url?: string;
  pollInterval?: string;
  status?: FeedStatus;
  errorMessage?: string;
}

export interface DismissArticleInput {
  articleId: string;
  dismissedBy: string;
}

export interface BulkDismissInput {
  articleIds: string[];
  dismissedBy: string;
}

export interface TestFeedResult {
  title: string;
  itemCount: number;
}

export interface PollFeedResult {
  newArticleCount: number;
}

export interface EnrichKeywordsResult {
  enrichedCount: number;
  noDataCount: number;
}
