/**
 * Types for the SEO Analytics suite (Keyword Magic sub-pages).
 * Mirrors the output shapes of the seoAnalytics_* Cloud Functions.
 *
 * List-bearing results carry optional `totalCount` / `pulledCount` (additive —
 * older cached payloads may lack them): the provider-reported total rows
 * available vs. the rows actually extracted (offset-paged, limit=1000 per
 * request, up to the shared `traffic_market_config/default.maxResultsPerQuery`
 * cap). Lets pages render "all X of Y".
 */

// ---------- Domain Overview ----------

export interface DomainOverviewInput {
  domain: string;
}

export interface RankingBucket {
  bucket: string;
  count: number;
}

export interface DomainTopKeyword {
  keyword: string;
  position: number;
  volume: number;
  kd: number;
  cpc: number;
  traffic: number;
  url: string;
  intent?: string | null;
}

export interface DomainIntentSlice {
  intent: string;
  count: number;
  volume: number;
}

export interface DomainCompetitorLite {
  domain: string;
  commonKeywords: number;
  organicTraffic: number;
  organicKeywords: number;
  avgPosition: number;
}

export interface DomainOverviewResult {
  domain: string;
  metrics: {
    organicTraffic: number;
    paidTraffic: number;
    organicKeywords: number;
    paidKeywords: number;
    backlinks: number | null;
    domainRank: number | null;
  };
  rankingDistribution: RankingBucket[];
  topKeywords: DomainTopKeyword[];
  intentDistribution?: DomainIntentSlice[];
  competitors?: DomainCompetitorLite[];
  /** Provider-reported total ranked keywords available. */
  totalCount?: number;
  /** Keyword rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Competitor Analysis ----------

export interface CompetitorsInput {
  domain: string;
  compareWith?: string;
}

export interface CompetitorRow {
  domain: string;
  commonKeywords: number;
  organicTraffic: number;
  paidTraffic: number;
  organicKeywords: number;
  avgPosition: number;
}

export interface SharedKeywordRow {
  keyword: string;
  ourPosition: number | null;
  theirPosition: number | null;
  volume: number;
  kd: number;
  cpc: number;
}

export interface CompetitorsResult {
  domain: string;
  competitors: CompetitorRow[];
  comparedWith: string | null;
  sharedKeywords: SharedKeywordRow[];
  /** Provider-reported total SERP competitors available. */
  totalCount?: number;
  /** Competitor rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Traffic Insights ----------

export interface TrafficInput {
  domain: string;
}

export interface TrafficPoint {
  date: string;
  organic: number;
  paid: number;
  featuredSnippet: number;
  localPack: number;
}

export interface RankingPoint {
  date: string;
  top3: number;
  pos4_10: number;
  pos11_20: number;
  pos21_50: number;
  pos51_100: number;
}

export interface MomChange {
  metric: string;
  thisMonth: number;
  lastMonth: number;
  changePct: number | null;
}

export interface TrafficResult {
  domain: string;
  traffic: TrafficPoint[];
  rankings: RankingPoint[];
  momChanges: MomChange[];
}

// ---------- SERP Analysis ----------

export interface SerpAnalysisInput {
  keyword: string;
}

export interface SerpResultRow {
  position: number;
  title: string;
  url: string;
  domain: string;
  features: string[];
}

export interface SerpHistoryPoint {
  date: string;
  [domain: string]: string | number | null;
}

export interface SerpCompetitorRow {
  domain: string;
  position: number;
  visibility: number;
  estTraffic: number;
}

export interface SerpAnalysisResult {
  keyword: string;
  results: SerpResultRow[];
  features: string[];
  history: SerpHistoryPoint[];
  historyDomains: string[];
  competitors: SerpCompetitorRow[];
  aiOverview: { present: boolean; referencedDomains: string[] };
  peopleAlsoAsk: string[];
  autocomplete: string[];
  /** Organic results the live SERP offered (SERPs are naturally ~100 deep). */
  totalCount?: number;
  /** Organic result rows returned. */
  pulledCount?: number;
}

// ---------- Brand Monitoring (Content Analysis API) ----------

export interface BrandMonitoringInput {
  keyword: string;
}

export interface BrandCountRow {
  label: string;
  count: number;
}

export interface BrandMentionRow {
  url: string;
  domain: string;
  domainRank: number;
  title: string;
  snippet: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  datePublished: string | null;
}

export interface BrandMonitoringResult {
  keyword: string;
  totalMentions: number;
  sentiment: { positive: number; negative: number; neutral: number };
  emotions: BrandCountRow[];
  topDomains: BrandCountRow[];
  countries: BrandCountRow[];
  pageTypes: BrandCountRow[];
  mentions: BrandMentionRow[];
  /** Provider-reported total mention rows available. */
  totalCount?: number;
  /** Mention rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Business Research (Business Data API) ----------

export interface BusinessListingsInput {
  query: string;
  category?: string;
  coordinate?: string;
}

export interface BusinessRow {
  title: string;
  category: string;
  address: string;
  rating: number | null;
  reviews: number;
  phone: string;
  domain: string;
  url: string;
  image: string | null;
}

export interface BusinessListingsResult {
  query: string;
  listings: BusinessRow[];
  /** Provider-reported total listings available. */
  totalCount?: number;
  /** Listing rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Instant Page Audit (On-Page API) ----------

export interface PageAuditInput {
  url: string;
}

export interface PageAuditCheck {
  key: string;
  label: string;
  status: 'passed' | 'issue';
}

export interface PageAuditResult {
  url: string;
  statusCode: number;
  onpageScore: number;
  meta: {
    title: string;
    titleLength: number;
    description: string;
    descriptionLength: number;
    canonical: string;
    h1Count: number;
    internalLinks: number;
    externalLinks: number;
    imagesWithoutAlt: number | null;
  };
  timing: {
    timeToInteractive: number;
    domComplete: number;
    largestContentfulPaint: number;
  };
  issues: PageAuditCheck[];
  passed: PageAuditCheck[];
  lighthouse: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  } | null;
}

// ---------- Keyword Trends ----------

export type TrendsTimeRange =
  | 'past_7_days'
  | 'past_30_days'
  | 'past_90_days'
  | 'past_12_months'
  | 'past_5_years';

export type TrendsType = 'web' | 'news' | 'ecommerce';

export interface TrendsInput {
  keywords: string[];
  timeRange?: TrendsTimeRange;
  type?: TrendsType;
}

export interface TrendsSeriesPoint {
  date: string;
  [keyword: string]: string | number | null;
}

export interface TrendsRegionRow {
  region: string;
  [keyword: string]: string | number | null;
}

export interface TrendsDemographyRow {
  bucket: string;
  [keyword: string]: string | number | null;
}

export interface RelatedQuery {
  keyword: string;
  volume: number;
  growthPct: number | null;
}

export interface TrendsResult {
  keywords: string[];
  interestOverTime: TrendsSeriesPoint[];
  regions: TrendsRegionRow[];
  demography: {
    age: TrendsDemographyRow[];
    gender: TrendsDemographyRow[];
  };
  related: {
    top: RelatedQuery[];
    rising: RelatedQuery[];
  };
}

// ---------- Content Gap ----------

export interface ContentGapInput {
  domain: string;
  competitors?: string[];
}

export interface GapKeyword {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  opportunity: number;
  positions: Array<number | null>;
}

export interface ContentGapResult {
  domain: string;
  competitors: string[];
  autoDiscovered: boolean;
  gaps: GapKeyword[];
  /** Distinct gap keywords found across all competitor intersections. */
  totalCount?: number;
  /** Gap rows actually returned (bounded by the shared cap). */
  pulledCount?: number;
}

// ---------- Top Pages ----------

export interface TopPagesInput {
  domain: string;
}

export interface TopPageRow {
  url: string;
  keywords: number;
  traffic: number;
  trafficShare: number;
  topKeyword: string | null;
  topKeywordPosition: number | null;
}

export interface DecliningPageRow {
  url: string;
  keywordsLost: number;
  keywordsDown: number;
  traffic: number;
  topKeyword: string | null;
}

export interface SubdomainRow {
  subdomain: string;
  keywords: number;
  traffic: number;
}

export interface TopPagesResult {
  domain: string;
  totalTraffic: number;
  pages: TopPageRow[];
  declining: DecliningPageRow[];
  subdomains: SubdomainRow[];
  /** Provider-reported total relevant pages available. */
  totalCount?: number;
  /** Pages actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Keyword Overview ----------

export interface KeywordOverviewInput {
  keyword: string;
}

export interface CountryVolume {
  country: string;
  code: string;
  volume: number;
}

export interface VolumeTrendPoint {
  date: string;
  volume: number;
}

export interface IdeaKeyword {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  intent: string | null;
}

export interface KeywordSerpRow {
  position: number;
  title: string;
  url: string;
  domain: string;
  description: string;
  /**
   * SERP features carried by this result (featured_snippet, video,
   * sitelinks, …). Optional: snapshots saved before CMS-33 lack it.
   */
  features?: string[];
}

export interface AdsVolumeInfo {
  volume: number;
  competitionLevel: string | null;
  competitionIndex: number;
  cpc: number;
  lowBid: number;
  highBid: number;
}

export interface KeywordOverviewResult {
  keyword: string;
  volume: number;
  adsVolume: AdsVolumeInfo | null;
  kdSource?: 'labs' | 'estimated';
  kd: number;
  cpc: number;
  competition: number;
  competitionLevel: string | null;
  intent: string | null;
  foreignIntents: string[];
  resultsCount: number;
  serpFeatures: string[];
  avgBacklinks: number | null;
  avgReferringDomains: number | null;
  globalVolume: CountryVolume[];
  trend: VolumeTrendPoint[];
  variations: IdeaKeyword[];
  variationsTotal: number;
  questions: IdeaKeyword[];
  related: IdeaKeyword[];
  serp: KeywordSerpRow[];
  /** Provider-reported total keyword suggestions available. */
  totalCount?: number;
  /** Suggestion rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Organic Research (position changes) ----------

export interface OrganicResearchInput {
  domain: string;
}

export interface PositionKeyword {
  keyword: string;
  intent: string | null;
  position: number;
  previousPosition: number | null;
  change: number | null;
  isNew: boolean;
  isUp: boolean;
  isDown: boolean;
  /** CMS-36: the domain no longer ranks — `position` is the last known rank. */
  isLost?: boolean;
  volume: number;
  kd: number;
  cpc: number;
  traffic: number;
  url: string;
}

export interface OrganicResearchResult {
  domain: string;
  metrics: {
    keywords: number;
    traffic: number;
    trafficCost: number;
    newKeywords: number;
    improved: number;
    declined: number;
    lost: number;
  };
  rankingDistribution: RankingBucket[];
  keywords: PositionKeyword[];
  /**
   * CMS-36: keywords the domain previously ranked for but lost. Optional:
   * snapshots saved before this field exist without it.
   */
  lostKeywords?: PositionKeyword[];
  /** Provider-reported total ranked keywords available. */
  totalCount?: number;
  /** Keyword rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- Backlink Analytics ----------

export interface BacklinksInput {
  domain: string;
}

export interface BacklinkHistoryPoint {
  date: string;
  backlinks: number;
  referringDomains: number;
}

export interface BacklinkDistributionRow {
  label: string;
  count: number;
}

export interface AnchorRow {
  anchor: string;
  backlinks: number;
  referringDomains: number;
}

export interface ReferringDomainRow {
  domain: string;
  rank: number;
  backlinks: number;
  firstSeen: string | null;
}

export interface TopBacklinkRow {
  pageTitle: string;
  urlFrom: string;
  urlTo: string;
  anchor: string;
  rank: number;
  dofollow: boolean;
  firstSeen: string | null;
}

export interface BacklinksResult {
  domain: string;
  metrics: {
    rank: number | null;
    backlinks: number;
    referringDomains: number;
    referringIps: number;
    brokenBacklinks: number;
    dofollow: number;
    nofollow: number;
  };
  history: BacklinkHistoryPoint[];
  linkTypes: BacklinkDistributionRow[];
  tlds: BacklinkDistributionRow[];
  countries: BacklinkDistributionRow[];
  anchors: AnchorRow[];
  referringDomainsList: ReferringDomainRow[];
  topBacklinks: TopBacklinkRow[];
  /** Provider-reported total backlink rows available (one_per_domain mode). */
  totalCount?: number;
  /** Backlink rows actually extracted (paged to the shared cap). */
  pulledCount?: number;
}

// ---------- AI Visibility (LLM answers) ----------

export type AiProvider = 'chat_gpt' | 'gemini' | 'claude' | 'perplexity';

export interface AiVisibilityInput {
  target: string;
  prompts: string[];
  providers?: AiProvider[];
  keywords?: string[];
}

export interface AiCitation {
  url: string;
  domain: string;
  title: string;
}

export interface AiPromptResponse {
  prompt: string;
  provider: AiProvider;
  model: string;
  status: 'ok' | 'error';
  mentioned: boolean;
  cited: boolean;
  snippet: string;
  citations: AiCitation[];
}

export interface AiCitedDomainRow {
  domain: string;
  count: number;
  isTarget: boolean;
}

export interface AiVolumeRow {
  keyword: string;
  aiSearchVolume: number;
  trend: VolumeTrendPoint[];
}

export interface AiVisibilityResult {
  target: string;
  responses: AiPromptResponse[];
  citedDomains: AiCitedDomainRow[];
  aiVolume: AiVolumeRow[];
}
