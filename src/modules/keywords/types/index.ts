// ── Union Types ──────────────────────────────────────────────────────────────

export type RevenuePotential = 'High' | 'Medium' | 'Low';

export type KeywordFormat =
  | 'Review'
  | 'Guide'
  | 'Comparison'
  | 'Listicle'
  | 'Deal Alert'
  | 'Program Guide';

export type ETHStatus = 'no-content' | 'ranking';

export type TopicCluster =
  | 'Chase Cards'
  | 'Amex Cards'
  | 'Capital One'
  | 'Airlines'
  | 'Hotels'
  | 'Transfer Partners'
  | 'Lounges'
  | 'Strategy'
  | 'Deals'
  | 'Trusted Traveler';

export type SerpFeature =
  | 'Featured Snippet'
  | 'PAA'
  | 'Knowledge Panel'
  | 'Image Pack'
  | 'Video'
  | 'Top Stories'
  | 'Local Pack'
  | 'Shopping';

export type KeywordIntent =
  | 'Informational'
  | 'Commercial'
  | 'Transactional'
  | 'Navigational';

export type CpcTrend = 'rising' | 'falling' | 'stable';

export type GapType = 'missing' | 'weak' | 'strong' | 'unique' | 'untapped';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface CompetitorRanking {
  site: string;
  position: number;
  pageTitle: string;
  url: string;
  wordCount: number;
  datePublished: string;
}

export interface RelatedKeyword {
  keyword: string;
  volume: number;
  intent: KeywordIntent;
}

export interface KeywordOpportunity {
  id: string;
  keyword: string;
  searchVolume: number;
  kd: number;
  cpc: number;
  revenuePotential: RevenuePotential;
  revenueRationale: string;
  opportunityScore: number;
  contentGapScore: number;
  competitors: CompetitorRanking[];
  ethStatus: ETHStatus;
  ethRankPosition?: number;
  ethArticleTitle?: string;
  ethArticleId?: string;
  format: KeywordFormat;
  topicCluster: TopicCluster;
  monthlyTrend: number[];
  relatedKeywords: RelatedKeyword[];
  aiRationale: string;
  cardLinksTo?: string[];
  topGoogleResults: { title: string; url: string; wordCount: number }[];
  serpFeatures: SerpFeature[];
  intent: KeywordIntent;
  backlinksToRank: number;
  cpcTrend: CpcTrend;
  positionHistory?: number[];
  createdAt: Date;
  updatedAt: Date;
  lastRefreshedAt: Date;
}

export interface KeywordGap {
  id: string;
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  intent: KeywordIntent;
  ethPosition?: number;
  competitorPositions: Record<string, number>;
  gapType: GapType;
  topRankingDomain?: string;
  recommendedFormat?: string;
  serpFeatures: SerpFeature[];
  analysisId: string;
  createdAt: Date;
}

export interface GapAnalysisRun {
  analysisId: string;
  ethDomain: string;
  competitorDomains: string[];
  totalKeywordsAnalyzed: number;
  counts: Record<GapType, number>;
  totalGapTraffic: number;
  createdAt: Date;
  createdBy: string;
}

export interface TopPage {
  rank: number;
  pagePath: string;
  fullUrl: string;
  domain: string;
  estimatedTraffic: number;
  trafficDiff: number;
  trafficPercentage: number;
  keywordsCount: number;
  topKeyword: string;
  referringDomains: number;
  backlinks: number;
  ethStatus: 'no-content' | 'leading' | 'weaker';
  ethPosition?: number;
}

export interface ExplorerKeyword {
  id: string;
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  cpcTrend: CpcTrend;
  intent: KeywordIntent;
  matchType: 'broad' | 'phrase' | 'exact' | 'related' | 'question';
  questionType?:
    | 'what'
    | 'how'
    | 'why'
    | 'is'
    | 'can'
    | 'does'
    | 'where'
    | 'when'
    | 'which';
  cluster: string;
  serpFeatureCount: number;
  serpFeatures: SerpFeature[];
  trend: number[];
  ethPosition?: number;
  ethStatus: ETHStatus;
}

// ── Cloud Function Input / Output Types ─────────────────────────────────────

export interface ImportKeywordsInput {
  vertical?: string;
}

export interface ImportKeywordsOutput {
  imported: number;
  updated: number;
}

export interface AnalyzeKeywordGapInput {
  ethDomain: string;
  competitorDomains: string[];
}

export interface AnalyzeKeywordGapOutput {
  analysisId: string;
  totalAnalyzed: number;
  counts: Record<GapType, number>;
  totalGapTraffic: number;
}

export interface RefreshKeywordDataOutput {
  refreshed: number;
  flagged: number;
}

export interface ExploreKeywordsInput {
  seed: string;
  matchTypes?: string[];
}

export interface ExploreKeywordsOutput {
  keywords: ExplorerKeyword[];
  clusters: Record<string, number>;
}

export interface AnalyzeTopPagesInput {
  domain: string;
}

export interface AnalyzeTopPagesOutput {
  pages: TopPage[];
  stats: {
    totalPages: number;
    monthlyTraffic: number;
    page1Keywords: number;
    avgAuthority: number;
  };
}

// ── Filter State Types ──────────────────────────────────────────────────────

export interface KeywordFilters {
  topicCluster: TopicCluster | null;
  kdRange: [number, number];
  minVolume: number;
  revenuePotential: RevenuePotential | null;
  ethStatus: ETHStatus | 'underperforming' | null;
  positionRange: [number, number] | null;
  intent: KeywordIntent | null;
  includeText: string;
  excludeText: string;
}

export interface ExplorerFilters {
  volumeRange: [number, number];
  kdRange: [number, number];
  intent: KeywordIntent | null;
  cpcRange: [number, number];
  includeText: string;
  excludeText: string;
}

export interface GapFilters {
  volumeRange: [number, number];
  kdRange: [number, number];
  intent: KeywordIntent | null;
  cpcRange: [number, number];
  keywordText: string;
}

export interface TopPagesFilters {
  minTraffic: number;
  minKeywords: number;
  keywordText: string;
  intent: KeywordIntent | null;
}

// ── Sort & Pagination State Types ───────────────────────────────────────────

export interface SortState<T extends string = string> {
  column: T;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}
