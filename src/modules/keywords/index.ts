// Route components
export { KeywordsPage } from './components/KeywordsPage';

// SEO Analytics suite (Keyword Magic sub-pages)
export { DomainOverviewPage } from './components/DomainOverviewPage';
export { CompetitorAnalysisPage } from './components/CompetitorAnalysisPage';
export { TrafficInsightsPage } from './components/TrafficInsightsPage';
export { SerpAnalysisPage } from './components/SerpAnalysisPage';
export { KeywordTrendsPage } from './components/KeywordTrendsPage';
export { ContentGapPage } from './components/ContentGapPage';
export { TopPagesPage } from './components/TopPagesPage';
export { KeywordOverviewPage } from './components/KeywordOverviewPage';
export { OrganicResearchPage } from './components/OrganicResearchPage';
export { BacklinksPage } from './components/BacklinksPage';
export { AiVisibilityPage } from './components/AiVisibilityPage';

// SEO Intelligence engine (Keyword Magic v2 — data-driven actions)
export { IntelligenceDashboard } from './components/IntelligenceDashboard';
export { RecommendationDetailPage } from './components/RecommendationDetailPage';
export { InternalLinksPage } from './components/InternalLinksPage';
export { BrandMonitoringPage } from './components/BrandMonitoringPage';
export { PageAuditPage } from './components/PageAuditPage';
export { BusinessResearchPage } from './components/BusinessResearchPage';
export { RankTrackerPage } from './components/RankTrackerPage';

// Traffic & Market suite (Sessions 29–41 — Similarweb adapter)
export { TrafficAnalyticsPage } from './components/traffic-market/TrafficAnalyticsPage';
export { MarketOverviewPage } from './components/traffic-market/MarketOverviewPage';
export { TrafficTopPagesPage } from './components/traffic-market/TrafficTopPagesPage';
export { AiTrafficPage } from './components/traffic-market/AiTrafficPage';
export { TrafficDistributionPage } from './components/traffic-market/TrafficDistributionPage';
export { SourcesDestinationsPage } from './components/traffic-market/SourcesDestinationsPage';
export { trafficMarketService } from './services/trafficMarketService';
export * from './types/trafficMarket';

// Keyword Magic Tool (reusable — standalone page, article pipeline, asset intake)
export { KeywordMagicTool } from './components/KeywordMagicTool';
export type { KeywordMagicToolProps } from './components/KeywordMagicTool';
export { useKeywordMagic } from './hooks/useKeywordMagic';

// Legacy keyword opportunities (still consumed by pipeline NewArticleModal)
export { useKeywords } from './hooks/useKeywords';
export { useKeywordActions } from './hooks/useKeywordActions';
export type { KeywordOpportunity } from './types';

// Types
export type {
  MagicKeyword,
  KeywordGroup,
  KeywordMagicInput,
  KeywordMagicResult,
  MagicMatchType,
  MagicIntent,
  MagicFilters,
  MagicSortColumn,
  MagicSortState,
} from './types/magic';

/** Route metadata for shell integration */
export const keywordsRoutes = [
  { path: '/keywords', title: 'Keyword Magic' },
  { path: '/keywords/domain-overview', title: 'Domain Overview' },
  { path: '/keywords/competitors', title: 'Competitor Analysis' },
  { path: '/keywords/traffic', title: 'Traffic Insights' },
  { path: '/keywords/serp', title: 'SERP Analysis' },
  { path: '/keywords/trends', title: 'Keyword Trends' },
  { path: '/keywords/content-gap', title: 'Content Gap' },
  { path: '/keywords/top-pages', title: 'Top Pages' },
  { path: '/keywords/overview', title: 'Keyword Overview' },
  { path: '/keywords/organic-research', title: 'Organic Research' },
  { path: '/keywords/backlinks', title: 'Backlink Analytics' },
  { path: '/keywords/ai-visibility', title: 'AI Visibility' },
  { path: '/keywords/intelligence', title: 'SEO Intelligence' },
  { path: '/keywords/internal-links', title: 'Internal Links' },
  { path: '/keywords/brand-monitoring', title: 'Brand Monitoring' },
  { path: '/keywords/page-audit', title: 'Page Audit' },
  { path: '/keywords/business-research', title: 'Business Research' },
  { path: '/keywords/rank-tracker', title: 'Rank Tracker' },
  { path: '/traffic-market', title: 'Traffic Analytics' },
  { path: '/traffic-market/market-overview', title: 'Market Overview' },
  { path: '/traffic-market/top-pages', title: 'Top Pages (Traffic)' },
  { path: '/traffic-market/ai-traffic', title: 'AI Traffic' },
  { path: '/traffic-market/distribution', title: 'Traffic Distribution' },
  { path: '/traffic-market/sources', title: 'Sources & Destinations' },
] as const;
