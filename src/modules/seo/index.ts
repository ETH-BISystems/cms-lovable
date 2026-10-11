// ── Page Components ─────────────────────────────────────────────────────────
export { SEOPage } from './components/SEOPage';
export { PositionTrackingPage } from './components/PositionTrackingPage';
export { PageAuditsPage } from './components/PageAuditsPage';
export { AIOverviewTrackerPage } from './components/AIOverviewTrackerPage';

// ── Hooks ───────────────────────────────────────────────────────────────────
export { useSiteHealth } from './hooks/useSiteHealth';
export { usePositionTracking } from './hooks/usePositionTracking';
export { usePageAudits } from './hooks/usePageAudits';
export { useAIOverviews } from './hooks/useAIOverviews';
export { useSEOFilters } from './hooks/useSEOFilters';

// ── Route Definitions ───────────────────────────────────────────────────────
export const seoRoutes = [
  { path: '/seo', label: 'SEO Dashboard', component: 'SEOPage' },
  { path: '/seo/position-tracking', label: 'Position Tracking', component: 'PositionTrackingPage' },
  { path: '/seo/page-audits', label: 'Page Audits', component: 'PageAuditsPage' },
  { path: '/seo/ai-overview', label: 'AI Overview Tracker', component: 'AIOverviewTrackerPage' },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  SiteId,
  SchemaType,
  IndexStatus,
  IssueSeverity,
  BacklinkStatus,
  LinkType,
  RedirectCode,
  RedirectStatus,
  ChangeType,
  KeywordIntent,
  AuditComponentKey,
  AuditComponentStatus,
  AuditRunState,
  AuditTriggerType,
  AuditedBySource,
  ETHCitedStatus,
  AIOverviewType,
  AIOverviewTrend,
  ClaimAccuracy,
  AuditFrequency,
  CWVOverall,
  SiteHealthDoc,
  SchemaDoc,
  IndexingDoc,
  TechnicalIssueDoc,
  BacklinkDoc,
  RedirectDoc,
  PositionTrackingDoc,
  PageAuditDoc,
  AIOverviewDoc,
  AuditRunDoc,
  AuditRunPageDoc,
  AuditRunIssueDoc,
  AuditConfigDoc,
} from './types';
