/**
 * Traffic & Market suite — data contracts (Master Spec v1.41, Sessions 29–41).
 *
 * Shape follows the Semrush-parity spec; the backend adapter layer
 * (functions/src/traffic-market/) translates Similarweb responses into these
 * contracts (Decision D2). Data mode is governed by `TrafficMarketMeta.dataSource`
 * — see its doc comment for the live / sample / disabled semantics.
 */

/**
 * Traffic channels tracked by the suite (TA-02, SD-01).
 * The first ten are the clickstream taxonomy; `featured_snippet` and
 * `local_pack` are DataForSEO search channels (Labs traffic estimation).
 */
export type TrafficChannel =
  | 'direct'
  | 'ai_traffic'
  | 'referral'
  | 'organic_search'
  | 'google_ai_mode'
  | 'paid_search'
  | 'organic_social'
  | 'paid_social'
  | 'email'
  | 'display_ads'
  | 'featured_snippet'
  | 'local_pack';

/** The seven Traffic Distribution channel pages (Sessions 34–40; AI Traffic has its own page). */
export type DistributionChannel =
  | 'referral'
  | 'organic_search'
  | 'paid_search'
  | 'organic_social'
  | 'paid_social'
  | 'email'
  | 'display_ads';

/** AI engines tracked platform-wide (Decision D11 + AIT-03 source list). */
export type AiEngine = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'grok' | 'deepseek' | 'copilot';

export type TrafficMetricKey =
  | 'visits'
  | 'uniqueVisitors'
  | 'pagesPerVisit'
  | 'avgVisitDuration'
  | 'bounceRate';

export type DeviceKey = 'all' | 'desktop' | 'mobile';

/**
 * Every response carries provenance + the month axis.
 *
 * dataSource semantics (primary provider of the response):
 * - 'dataforseo' — live DataForSEO search intelligence (the DEFAULT provider:
 *                  search-traffic ETV, ranked keywords, pages, competitors,
 *                  per-country search data). Clickstream-only sections in the
 *                  same response are null/gated unless Similarweb is keyed.
 * - 'similarweb' — Similarweb clickstream enrichment active (real key
 *                  configured): engagement metrics, all-channel mix, journeys,
 *                  device splits, AI referral traffic.
 * - 'sample'     — deterministic sample data (explicit demo mode via
 *                  settings/trafficMarket.useSampleData).
 * - 'disabled'   — neither provider available (DataForSEO credentials missing
 *                  AND no Similarweb key) and sample mode off.
 */
export interface TrafficMarketMeta {
  dataSource: 'dataforseo' | 'similarweb' | 'sample' | 'disabled';
  /** True when Similarweb clickstream enrichment contributed to the response. */
  clickstream: boolean;
  region: string;
  /** YYYY-MM, ascending — the shared time axis for all series. */
  months: string[];
  lastUpdated: string;
}

/** Status payload for the Settings integration card (trafficMarket_status). */
export interface TrafficMarketStatus {
  /** A non-placeholder Similarweb key is available to the backend. */
  keyConfigured: boolean;
  /** Where the active key was resolved from. */
  keySource: 'secret-manager' | 'env' | null;
  /** First characters of the key for display, e.g. "sk_a••••" — null when unset (admin-only). */
  maskedKey: string | null;
  /** settings/trafficMarket.useSampleData — demo mode serving generated data. */
  sampleMode: boolean;
  /** Result of a live connectivity ping (only when requested with {test:true}). */
  connection?: { ok: boolean; message: string };
}

export interface SetApiKeyInput {
  apiKey: string;
}

export interface SetApiKeyResult {
  success: boolean;
  /** The key was verified against the Similarweb API before being stored. */
  tested: boolean;
  message: string;
}

/** One domain's monthly series (values align with meta.months). */
export interface DomainSeries {
  domain: string;
  values: number[];
}

/** Common input for all traffic-market callables. */
export interface TrafficMarketInput {
  /** Domain set — defaults to the configured competitor set when omitted. */
  domains?: string[];
  region?: string;
  /** How many trailing months of history (default 12). */
  months?: number;
  /**
   * Persist this result as a history snapshot (default true). The backend
   * dedupes identical input+result hashes within a short window, so tab
   * switches and reloads don't spam history.
   */
  saveHistory?: boolean;
}

// ---------------------------------------------------------------------------
// TA-01 · Summary + Traffic Trend
// ---------------------------------------------------------------------------

export interface TrafficSummaryRow {
  domain: string;
  /** Search Traffic (DataForSEO ETV) or panel visits (Similarweb). */
  visits: number;
  visitsDeltaPct: number | null;
  /** DataForSEO search-channel split (always available on 'dataforseo'). */
  organicVisits: number | null;
  paidVisits: number | null;
  /** Clickstream-only engagement metrics — null unless Similarweb is keyed. */
  uniqueVisitors: number | null;
  uniqueVisitorsDeltaPct: number | null;
  pagesPerVisit: number | null;
  pagesPerVisitDeltaPct: number | null;
  /** Seconds. */
  avgVisitDuration: number | null;
  avgVisitDurationDeltaPct: number | null;
  /** 0–1. */
  bounceRate: number | null;
  bounceRateDeltaPct: number | null;
  desktopShare: number | null;
  mobileShare: number | null;
}

export interface TrafficSummaryResult {
  meta: TrafficMarketMeta;
  rows: TrafficSummaryRow[];
  /**
   * One trend block per metric tab. Clickstream-only metrics carry empty
   * arrays when Similarweb is not keyed — hide those tabs.
   */
  trends: Record<TrafficMetricKey, DomainSeries[]>;
  /** DataForSEO search-channel trends (Organic / Paid tabs). */
  searchTrends: Record<'organic' | 'paid', DomainSeries[]>;
}

// ---------------------------------------------------------------------------
// TA-02 · Channel Distribution + Trend
// ---------------------------------------------------------------------------

export interface ChannelDistributionEntry {
  channel: TrafficChannel;
  /** Latest-month visits per domain, keyed by domain. */
  visitsByDomain: Record<string, number>;
}

export interface TrafficChannelsResult {
  meta: TrafficMarketMeta;
  /**
   * Channels present given the active provider(s): DataForSEO supplies the
   * search channels (organic_search, paid_search, featured_snippet,
   * local_pack); the full clickstream taxonomy requires Similarweb.
   */
  availableChannels: TrafficChannel[];
  distribution: ChannelDistributionEntry[];
  /** Per-channel trend series (channel selector on the chart). */
  trends: Partial<Record<TrafficChannel, DomainSeries[]>>;
}

// ---------------------------------------------------------------------------
// TA-03 · Traffic Journey (Sankey) + Top Pages / Subfolders / Subdomains
// ---------------------------------------------------------------------------

export interface JourneyNodeFlow {
  name: string;
  /** Share of the domain's traffic, 0–1. */
  share: number;
  /** Period-over-period share delta, percentage points. */
  deltaPct: number | null;
  channel: TrafficChannel;
}

export interface TrafficJourneyResult {
  meta: TrafficMarketMeta;
  domain: string;
  /** Clickstream-only — null (section gated) unless Similarweb is keyed. */
  sources: JourneyNodeFlow[] | null;
  destinations: JourneyNodeFlow[] | null;
}

export interface TopPageRow {
  page: string;
  trafficShare: number;
  /** Clickstream-only — null on 'dataforseo' (no per-page pageview/visitor data). */
  uniquePageviews: number | null;
  uniqueVisitors: number | null;
}

export interface TrafficStructureResult {
  meta: TrafficMarketMeta;
  domain: string;
  pages: TopPageRow[];
  subfolders: TopPageRow[];
  subdomains: TopPageRow[];
}

// ---------------------------------------------------------------------------
// TA-04 · Geo Distribution
// ---------------------------------------------------------------------------

export interface GeoCountryRow {
  /** ISO 3166-1 alpha-2, lowercase (e.g. 'us'). */
  countryCode: string;
  countryName: string;
  share: number;
  /** Search Traffic ETV per country (DataForSEO) or panel visits (Similarweb). */
  visits: number;
  /** Clickstream-only — null unless Similarweb is keyed. */
  desktopShare: number | null;
  mobileShare: number | null;
  uniqueVisitors: number | null;
}

export interface TrafficGeoResult {
  meta: TrafficMarketMeta;
  domain: string;
  countries: GeoCountryRow[];
}

// ---------------------------------------------------------------------------
// MO-01..03 · Market Overview (D5: Similarweb-native metrics only —
// no TAM/SAM, no Market Traffic Cost, no modeled Consolidation)
// ---------------------------------------------------------------------------

export interface MarketPlayerRow {
  domain: string;
  marketSharePct: number;
  visits: number;
  visitsDeltaPct: number | null;
  /** Latest-month visits per channel with period-over-period diff. */
  channels: Partial<Record<TrafficChannel, { visits: number; diffPct: number | null }>>;
}

export interface QuadrantPoint {
  domain: string;
  /** Metric values keyed by axis metric id. */
  metrics: Record<string, number>;
}

export interface QuadrantAxisOption {
  id: string;
  label: string;
}

export interface MarketOverviewResult {
  meta: TrafficMarketMeta;
  domainsCount: number;
  marketTraffic: number;
  marketTrafficDeltaPct: number | null;
  keyPlayers: MarketPlayerRow[];
  players: MarketPlayerRow[];
  quadrant: {
    axisOptions: QuadrantAxisOption[];
    points: QuadrantPoint[];
  };
  marketTrafficTrend: DomainSeries[];
}

// ---------------------------------------------------------------------------
// TMP-01..02 · Top Pages (Traffic & Market)
// ---------------------------------------------------------------------------

export type TrendingBucket = 'growing' | 'declining' | 'new';

export interface TrendingPageCard {
  page: string;
  visits: number;
  changePct: number | null;
  /** Mini-trend for the sparkline. */
  trend: number[];
  bucket: TrendingBucket;
}

export interface ClickstreamTopPageRow {
  page: string;
  trafficShare: number;
  /**
   * 12-point 1-year trend for the sparkline column. Null on 'dataforseo'
   * (no per-page history API) unless ≥2 saved history snapshots allow a
   * computed trend.
   */
  yearTrend: number[] | null;
  /** Search Traffic ETV (DataForSEO) or panel visits (Similarweb). */
  visits: number;
  /** Ranked keywords on this page (DataForSEO). */
  keywordCount: number | null;
  /** Clickstream-only — null unless Similarweb is keyed. */
  uniquePageviews: number | null;
  uniqueVisitors: number | null;
  /** Seconds. */
  avgVisitDuration: number | null;
  /** Channel split for the expandable row (search channels on 'dataforseo'). */
  channelShares: Partial<Record<TrafficChannel, number>>;
}

export interface TrafficTopPagesResult {
  meta: TrafficMarketMeta;
  domain: string;
  /**
   * Growing / declining / new cards. On 'dataforseo' these are computed by
   * diffing the two most recent saved history snapshots — empty (with
   * trendingNote) until two snapshots exist.
   */
  trending: TrendingPageCard[];
  trendingNote: string | null;
  rows: ClickstreamTopPageRow[];
  /** Total pages available upstream vs pulled (max-results pagination). */
  totalCount: number;
  pulledCount: number;
}

// ---------------------------------------------------------------------------
// AIT-01..03 · AI Traffic (+ D6 Visibility → Traffic join)
// ---------------------------------------------------------------------------

export interface AiTrafficResult {
  meta: TrafficMarketMeta;
  /** AI referral *traffic* is clickstream-only; true when those sections are gated. */
  trafficGated: boolean;
  engines: AiEngine[];
  /** Latest-month AI referral visits: engine → domain → visits. */
  distribution: Record<AiEngine, Record<string, number>>;
  /** Per-engine trend series. */
  trends: Record<AiEngine, DomainSeries[]>;
  /** AIT-02 growth cards, keyed by engine. */
  topGrowingPages: Record<AiEngine, TrendingPageCard[]>;
  sources: AiSourceRow[];
  /** D6 — per-engine visibility (AIV mention share) vs actual referral share. */
  visibilityJoin: AiVisibilityJoinRow[];
}

export interface AiSourceRow {
  source: string;
  category: string;
  engine: AiEngine;
  /** Traffic split across the domain set, keyed by domain (0–1, sums to 1). */
  groupTrafficSplit: Record<string, number>;
  groupTrafficSharePct: number;
}

export interface AiVisibilityJoinRow {
  engine: AiEngine;
  /** AI Visibility mention share for the primary domain, 0–100. */
  visibilityScore: number;
  /** Share of AI referral traffic captured by the primary domain, 0–100. */
  trafficSharePct: number;
  monthlyVisits: number;
}

// ---------------------------------------------------------------------------
// RF/OS/PS/OSO/PSO/EM/DA · Shared Traffic Distribution channel template
// ---------------------------------------------------------------------------

export interface ChannelViewInput extends TrafficMarketInput {
  channel: DistributionChannel;
  /** OS-01 (D7): 'ai_mode' re-scopes organic series to Google AI-Mode *presence*. */
  organicMode?: 'organic' | 'ai_mode';
}

export interface WordCloudTerm {
  term: string;
  weight: number;
}

export interface ChannelViewResult {
  meta: TrafficMarketMeta;
  channel: DistributionChannel;
  /** False on 'dataforseo' (no device split) — hide Desktop/Mobile charts. */
  deviceSplitAvailable: boolean;
  /** Clickstream-only channels are gated without Similarweb. */
  channelGated: boolean;
  trends: Record<DeviceKey, DomainSeries[]>;
  topGrowingPages: TrendingPageCard[];
  /** Sankey flows — null for email / display_ads (no Top Sources panel). */
  topSources: JourneyNodeFlow[] | null;
  /** Keyword cloud — organic (DataForSEO ranked_keywords, D7) + paid only; null otherwise. */
  topKeywords: WordCloudTerm[] | null;
  /** Total keywords available upstream vs pulled (max-results pagination). */
  topKeywordsTotalCount: number | null;
  /** OS-01: AI-Mode presence series when organicMode==='ai_mode' (SERP-tracked, not traffic). */
  aiModePresence: boolean;
}

// ---------------------------------------------------------------------------
// SD-01..02 · Sources & Destinations
// ---------------------------------------------------------------------------

export interface SourceRow {
  name: string;
  category: string;
  channel: TrafficChannel;
  groupTrafficSplit: Record<string, number>;
  groupTrafficSharePct: number;
}

export interface SourcesDestinationsResult {
  meta: TrafficMarketMeta;
  /** The cross-channel source rollup is clickstream-only. */
  gated: boolean;
  channelCounts: Array<{ channel: TrafficChannel | 'total'; count: number }>;
  sources: SourceRow[];
  destinations: SourceRow[];
  categories: string[];
}

// ---------------------------------------------------------------------------
// History — every search result is saved as a snapshot, per page
// ---------------------------------------------------------------------------

/**
 * Every SEO surface that keeps search history — the six Traffic & Market
 * pages plus all fourteen DataForSEO-backed SEO Research / Domain Analytics
 * pages. Every search records its domain/query, timestamp, and author, and
 * is browsable / filterable / deletable / reloadable from that page's
 * History panel.
 */
export type SeoHistoryPage =
  // Traffic & Market
  | 'traffic-analytics'
  | 'market-overview'
  | 'top-pages'
  | 'ai-traffic'
  | 'distribution'
  | 'sources'
  // SEO Research / Domain Analytics (seoAnalytics_* callables)
  | 'domain-overview'
  | 'organic-research'
  | 'competitor-analysis'
  | 'traffic-insights'
  | 'top-pages-organic'
  | 'backlink-analytics'
  | 'keyword-overview'
  | 'serp-analysis'
  | 'keyword-trends'
  | 'content-gap'
  | 'ai-visibility'
  | 'brand-monitoring'
  | 'page-audit'
  | 'business-research'
  // Keyword Magic Tool (keywordMagicSearch callable)
  | 'keyword-magic';

/** @deprecated alias kept for existing imports — use SeoHistoryPage. */
export type TrafficMarketPage = SeoHistoryPage;

/** Metadata row shown in the history list (payload stored separately). */
export interface HistoryEntryMeta {
  id: string;
  page: TrafficMarketPage;
  /** Which callable produced the payload (e.g. 'summary', 'channelView'). */
  section: string;
  /** ISO timestamp. */
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  domains: string[];
  region: string;
  /** Distribution page only. */
  channel: DistributionChannel | null;
  provider: 'dataforseo' | 'similarweb' | 'mixed';
  /** e.g. { rows: 940, keywords: 3200 } — for list display. */
  resultCounts: Record<string, number>;
  sizeBytes: number;
}

export interface HistoryListInput {
  page: TrafficMarketPage;
  /** Substring filter on the snapshot's domain set. */
  domain?: string;
  /** ISO date bounds. */
  from?: string;
  to?: string;
  limit?: number;
  /** Opaque cursor from a previous call. */
  cursor?: string;
}

export interface HistoryListResult {
  entries: HistoryEntryMeta[];
  nextCursor: string | null;
}

export interface HistoryGetResult {
  entry: HistoryEntryMeta;
  /** The original callable result, verbatim (cast to the page's result type). */
  payload: unknown;
}

// ---------------------------------------------------------------------------
// Shared client-side helpers
// ---------------------------------------------------------------------------

/** Display labels for channels (tables, chips, tabs). */
export const TRAFFIC_CHANNEL_LABELS: Record<TrafficChannel, string> = {
  direct: 'Direct',
  ai_traffic: 'AI Traffic',
  referral: 'Referral',
  organic_search: 'Organic Search',
  google_ai_mode: 'Google AI Mode',
  paid_search: 'Paid Search',
  organic_social: 'Organic Social',
  paid_social: 'Paid Social',
  email: 'Email',
  display_ads: 'Display Ads',
  featured_snippet: 'Featured Snippet',
  local_pack: 'Local Pack',
};

export const AI_ENGINE_LABELS: Record<AiEngine, string> = {
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  claude: 'Claude',
  perplexity: 'Perplexity',
  grok: 'Grok',
  deepseek: 'DeepSeek',
  copilot: 'Copilot',
};

export const TRAFFIC_METRIC_LABELS: Record<TrafficMetricKey, string> = {
  visits: 'Visits',
  uniqueVisitors: 'Unique Visitors',
  pagesPerVisit: 'Pages / Visit',
  avgVisitDuration: 'Avg. Visit Duration',
  bounceRate: 'Bounce Rate',
};
