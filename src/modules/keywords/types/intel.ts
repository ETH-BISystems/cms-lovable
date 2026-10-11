/**
 * Client-side types for the SEO Intelligence engine.
 * Mirrors functions/src/seo-intel/types.ts (Timestamps become Dates).
 */

export type RecommendationType =
  | 'new_content'
  | 'refresh'
  | 'internal_link_cluster'
  | 'backlink_reclaim'
  | 'backlink_gap'
  | 'backlink_fix'
  | 'linkable_asset'
  | 'ai_gap'
  | 'ai_refresh'
  | 'keyword_striking_distance'
  | 'cannibalization_merge'
  | 'ai_overview_gap'
  | 'brand_reputation';

export type RecommendationStatus = 'open' | 'snoozed' | 'in_progress' | 'done' | 'dismissed';

export interface EvidenceKeyword {
  keyword: string;
  volume: number;
  kd: number;
  position: number | null;
  bestCompetitorPosition?: number | null;
  competitorDomain?: string | null;
  url?: string | null;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  reason: string;
  expectedBenefit: string;
  priorityScore: number;
  impact: number;
  effort: number;
  confidence: number;
  scoreExplanation: string;
  evidence: {
    keywords?: EvidenceKeyword[];
    urls?: string[];
    domains?: Array<{ domain: string; rank: number; note?: string }>;
  };
  relatedArticleIds: string[];
  contentBrief: {
    suggestedTitle: string;
    targetKeyword: string;
    secondaryKeywords: string[];
    outline: string[];
  } | null;
  status: RecommendationStatus;
  dismissReason: string | null;
  actionedAs: { articleId?: string; taskId?: string; refreshQueueId?: string };
  realizedImpact?: {
    keywordsImproved: number;
    keywordsDeclined: number;
    estTrafficDelta: number;
    measuredWeek: string;
  } | null;
  createdWeek: string;
  updatedAt: Date | null;
}

// ---------- Internal link suggestions (Phase 3) ----------

export type LinkSuggestionStatus = 'open' | 'accepted' | 'dismissed' | 'done';

export interface LinkSuggestion {
  id: string;
  sourceArticleId: string;
  sourceTitle: string;
  sourceUrl: string | null;
  targetArticleId: string;
  targetTitle: string;
  targetUrl: string | null;
  anchorText: string;
  reason: string;
  score: number;
  clusterId: string;
  clusterName: string;
  status: LinkSuggestionStatus;
  taskId: string | null;
  createdWeek: string;
}

// ---------- Tracked AI visibility (Phase 5) ----------

export interface AiTrackedPrompt {
  id: string;
  prompt: string;
  topic: string | null;
  active: boolean;
  createdAt: Date | null;
}

export interface AiVisibilityRun {
  id: string;
  week: string;
  promptId: string;
  prompt: string;
  provider: AiProviderName;
  model: string;
  status: 'ok' | 'error';
  mentioned: boolean;
  cited: boolean;
  competitorsCited: string[];
  citations: Array<{ url: string; domain: string; title: string }>;
  snippet: string;
}

export type AiProviderName = 'chat_gpt' | 'gemini' | 'claude' | 'perplexity';

export interface SnapshotMetrics {
  organicTraffic: number;
  organicKeywords: number;
  top3: number;
  top10: number;
  backlinks: number | null;
  referringDomains: number | null;
}

export interface SeoSnapshot {
  week: string;
  domain: string;
  competitors: string[];
  metrics: SnapshotMetrics;
  deltas: Partial<Record<keyof SnapshotMetrics, number>>;
  segments: {
    strikingDistance: number;
    declining: number;
    gaps: number;
    cannibalized: number;
    top3: number;
    top10: number;
  };
  recommendationCounts: Partial<Record<RecommendationType, number>>;
  brand?: {
    phrase: string;
    mentions: number;
    positive: number;
    negative: number;
    neutral: number;
  };
  mock?: boolean;
  createdAt: Date | null;
}

export type IntelActionName =
  | 'create_article'
  | 'add_to_refresh_queue'
  | 'create_task'
  | 'snooze'
  | 'dismiss'
  | 'reopen';

export interface IntelActionPayload {
  title?: string;
  assignee?: { name: string; avatar: string };
  assignedTo?: string;
  priority?: 'High' | 'Medium' | 'Low';
  days?: number;
  reason?: string;
}
