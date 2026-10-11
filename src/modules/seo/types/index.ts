// ── Union Types ──────────────────────────────────────────────────────────────

export type SiteId = 'epm' | 'eth';

export type SchemaType = 'Article' | 'FAQ' | 'Review' | 'HowTo' | 'None';

export type IndexStatus =
  | 'Indexed'
  | 'Discovered'
  | 'Crawled'
  | 'Not Indexed'
  | 'Error';

export type IssueSeverity = 'Critical' | 'Warning' | 'Info';

export type BacklinkStatus = 'New' | 'Lost';

export type LinkType = 'Dofollow' | 'Nofollow';

export type RedirectCode = 301 | 302 | 307;

export type RedirectStatus = 'Active' | 'Broken' | 'Loop';

export type ChangeType = 'improved' | 'declined' | 'stable' | 'new' | 'lost';

export type KeywordIntent = 'Comm' | 'Info' | 'Trans' | 'Navi';

export type AuditComponentKey =
  | 'titleTag'
  | 'metaDescription'
  | 'h1Tag'
  | 'contentLength'
  | 'keywordUsage'
  | 'internalLinks'
  | 'externalLinks'
  | 'imageAltText'
  | 'schemaMarkup'
  | 'urlStructure'
  | 'readability'
  | 'contentFreshness';

export type AuditComponentStatus = 'pass' | 'warning' | 'fail';

export type AuditRunState =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partially_completed';

export type AuditTriggerType =
  | 'Scheduled'
  | 'Manual'
  | 'Publish'
  | 'Traffic'
  | 'Ranking';

export type AuditedBySource = 'Auto' | 'Publish' | 'Manual';

export type ETHCitedStatus = 'Yes' | 'Partial' | 'No' | 'N/A';

export type AIOverviewType = 'Paragraph' | 'List' | 'Steps';

export type AIOverviewTrend = 'New' | 'Stable' | 'Removed';

export type ClaimAccuracy = 'accurate' | 'partial' | 'inaccurate';

export type AuditFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type CWVOverall = 'Good' | 'Needs Improvement' | 'Poor';


// ── Firestore Document Interfaces ───────────────────────────────────────────

export interface SiteHealthDoc {
  siteId: string;
  domain: string;
  domainRating: number;
  domainRatingChange: number;
  drHistory: number[];
  totalIndexedPages: number;
  indexedPagesChange: number;
  cwv: {
    lcp: number;
    inp: number;
    cls: number;
    overall: CWVOverall;
  };
  crawlErrors: number;
  auditSummary: {
    pagesAudited: number;
    critical: number;
    warnings: number;
    info: number;
    lastAudit: Date;
  };
  dataFreshness: {
    gsc: Date;
    seoApi: Date;
    lastFullAudit: Date;
  };
  updatedAt: Date;
}

export interface SchemaDoc {
  articleId: string;
  title: string;
  url: string;
  schemaType: SchemaType;
  schemaValid: boolean;
  richResultsEligible: boolean;
  lastChecked: Date;
  jsonLd?: string;
  validationErrors?: string[];
}

export interface IndexingDoc {
  id: string;
  url: string;
  title: string;
  status: IndexStatus;
  lastCrawled: Date;
  submittedDate?: Date;
  coverageIssue?: string;
}

export interface TechnicalIssueDoc {
  id: string;
  severity: IssueSeverity;
  type: string;
  description: string;
  url: string;
  pageTitle: string;
  firstDetected: Date;
  canAutoFix: boolean;
  hasArticle: boolean;
  ignored: boolean;
  ignoredAt?: Date;
  ignoredBy?: string;
}

export interface BacklinkDoc {
  id: string;
  status: BacklinkStatus;
  sourceUrl: string;
  sourceDomain: string;
  sourceDr: number;
  targetPage: string;
  anchorText: string;
  linkType: LinkType;
  date: Date;
}

export interface RedirectDoc {
  id: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: RedirectCode;
  chainLength: number;
  finalDestination?: string;
  chain?: { url: string; code: RedirectCode }[];
  createdAt: Date;
  createdBy: string;
  status: RedirectStatus;
  notes?: string;
}


// ── Position Tracking Types ─────────────────────────────────────────────────

export interface PositionHistoryEntry {
  date: string;
  position: number;
}

export interface SERPResult {
  rank: number;
  domain: string;
  title: string;
  features: string[];
  isETH: boolean;
  isCompetitor: boolean;
}

export interface SERPSnapshot {
  date: string;
  featuredSnippet: string | null;
  results: SERPResult[];
}

export interface CompetitorPosition {
  name: string;
  position: number;
}

export interface PositionTrackingDoc {
  id: string;
  keyword: string;
  siteId: string;
  position: number | null;
  positionChange: number | null;
  changeType: ChangeType;
  bestPosition: number | null;
  bestPositionDate?: string;
  volume: number;
  kd: number;
  cpc: number;
  intent: KeywordIntent;
  ethUrl: string | null;
  serpFeatures: string[];
  competitors: CompetitorPosition[];
  positionHistory: PositionHistoryEntry[];
  serpSnapshots: SERPSnapshot[];
  updatedAt: Date;
}

// ── Page Audit Types ────────────────────────────────────────────────────────

export interface AuditComponent {
  score: number;
  status: AuditComponentStatus;
  detail: string;
}

export type AuditComponents = Record<AuditComponentKey, AuditComponent>;

export interface PageAuditDoc {
  articleId: string;
  title: string;
  url: string;
  publishedDate: Date;
  seoScore: number;
  components: AuditComponents;
  criticalCount: number;
  warningCount: number;
  topIssue?: { text: string; severity: IssueSeverity };
  traffic: number;
  keyword: string;
  position: number | null;
  lastAuditedAt: Date;
  auditedBy: AuditedBySource;
  siteId: string;
}

// ── AI Overview Types ───────────────────────────────────────────────────────

export interface AIClaim {
  text: string;
  accuracy: ClaimAccuracy;
}

export interface AISource {
  domain: string;
  url: string;
  isETH: boolean;
  isCompetitor: boolean;
}

export interface FollowUpQuestion {
  question: string;
  tracked: boolean;
}

export interface AlternativeKeyword {
  keyword: string;
  volume: number;
  kd: number;
  hasAIOverview: boolean;
}

export interface AIAnswer {
  claims: AIClaim[];
  sources: AISource[];
  followUpQuestions: FollowUpQuestion[];
}

export interface AIOverviewDoc {
  id: string;
  keyword: string;
  siteId: string;
  volume: number;
  hasAIOverview: boolean;
  ethCited: ETHCitedStatus;
  aiOverviewType?: AIOverviewType;
  ctrImpact: number;
  position: number | null;
  actualCtr?: number;
  trend: AIOverviewTrend;
  optimizationTips: string[];
  alternativeKeywords: AlternativeKeyword[];
  aiAnswer?: AIAnswer;
  updatedAt: Date;
}


// ── Audit Run Types ─────────────────────────────────────────────────────────

export interface AuditRunDoc {
  runId: string;
  siteId: string;
  state: AuditRunState;
  triggerType: AuditTriggerType;
  triggeredBy: string;
  articleCount: number;
  completedCount: number;
  failedCount: number;
  avgScore?: number;
  scoreChange?: number;
  criticalCount: number;
  newIssues: number;
  resolvedIssues: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  error?: string;
  retryCount: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
}

export interface AuditRunPageDoc {
  articleId: string;
  title: string;
  url: string;
  seoScore: number;
  previousScore?: number;
  scoreChange?: number;
  components: AuditComponents;
  criticalCount: number;
  warningCount: number;
}

export interface AuditRunIssueDoc {
  id: string;
  articleId: string;
  severity: IssueSeverity;
  component: AuditComponentKey;
  description: string;
  isNew: boolean;
  isResolved: boolean;
}

// ── Audit Config Types ──────────────────────────────────────────────────────

export interface AuditTriggers {
  onPublish: boolean;
  onRefresh: boolean;
  onRankingChange: boolean;
  onTrafficDrop: boolean;
}

export interface AuditNotifications {
  slack: boolean;
  onlyOnIssues: boolean;
}

export interface AuditConfigDoc {
  enabled: boolean;
  frequency: AuditFrequency;
  dayOfWeek?: number;
  timeOfDay: string;
  triggers: AuditTriggers;
  notifications: AuditNotifications;
  apiCallsLimit: number;
  updatedAt: Date;
  updatedBy: string;
}


// ── Cloud Function Input/Output Types ───────────────────────────────────────

export interface RunSiteHealthCrawlInput {
  siteId: string;
}

export interface RunSiteHealthCrawlOutput {
  success: boolean;
}

export interface TrackPositionsInput {
  siteId: string;
}

export interface TrackPositionsOutput {
  keywordsUpdated: number;
}

export interface AuditPageInput {
  siteId: string;
  articleId: string;
}

export interface AuditPageOutput {
  seoScore: number;
  components: AuditComponents;
}

export interface RunSiteAuditInput {
  siteId: string;
}

export interface RunSiteAuditOutput {
  runId: string;
}

export interface TrackAIOverviewsInput {
  siteId: string;
}

export interface TrackAIOverviewsOutput {
  keywordsChecked: number;
}

export interface SubmitForIndexingInput {
  siteId: string;
  urls: string[];
}

export interface SubmitForIndexingOutput {
  submitted: number;
  quotaRemaining: number;
}

export interface CreateRedirectInput {
  siteId: string;
  sourceUrl: string;
  destinationUrl: string;
  statusCode: RedirectCode;
  reason?: string;
}

export interface CreateRedirectOutput {
  redirectId: string;
}

export interface UpdateRedirectInput {
  siteId: string;
  redirectId: string;
  destinationUrl?: string;
  statusCode?: RedirectCode;
}

export interface UpdateRedirectOutput {
  success: boolean;
}

export interface DeleteRedirectInput {
  siteId: string;
  redirectId: string;
}

export interface DeleteRedirectOutput {
  success: boolean;
}

export interface TestRedirectInput {
  siteId: string;
  redirectId: string;
}

export interface TestRedirectOutput {
  working: boolean;
  finalUrl: string;
  hops: number;
  details?: string;
}

export interface UpdateAuditScheduleInput {
  siteId: string;
  enabled: boolean;
  frequency: AuditFrequency;
  dayOfWeek?: number;
  timeOfDay: string;
  triggers: AuditTriggers;
  notifications: AuditNotifications;
  apiCallsLimit: number;
}

export interface UpdateAuditScheduleOutput {
  success: boolean;
}


// ── Filter State Types ──────────────────────────────────────────────────────

export interface SchemaFilters {
  search: string;
  schemaType: SchemaType | 'All';
  validationStatus: 'All' | 'Valid' | 'Invalid' | 'Missing';
}

export interface IndexingFilters {
  status: IndexStatus | 'All';
}

export interface IssueFilters {
  severity: IssueSeverity | 'All';
}

export interface BacklinkFilters {
  status: BacklinkStatus | 'All';
  linkType: LinkType | 'All';
}

export interface RedirectFilters {
  code: RedirectCode | 'All';
  status: RedirectStatus | 'All';
  chainType: 'All' | 'Direct' | 'Chain 3+';
}

export interface PositionFilters {
  positionRange: string;
  changeType: ChangeType | 'all';
  volumeMin: string;
  keywordSearch: string;
}

export interface AuditFilters {
  scoreRange: string;
  severity: IssueSeverity | 'All';
  topicCluster: string;
  author: string;
  search: string;
}

export interface AuditHistoryFilters {
  type: AuditTriggerType | 'All';
  triggeredBy: string;
}

export interface AIOverviewFilters {
  hasAIOverview: 'All' | 'Has AI Overview' | 'No AI Overview';
  ethCited: ETHCitedStatus | 'All';
  volumeMin: string;
  ctrImpact: 'All' | 'High' | 'Medium' | 'Low';
}
