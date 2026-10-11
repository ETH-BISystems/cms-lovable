// Status types — NEW 11-stage pipeline + lifecycle stages
import type { ArticleFinalProcessing, ArticleHumanise } from '@/modules/ai-final-processing';

export type ArticleStage =
  | 'New Article'
  | 'Keyword Discovery'
  | 'Select Keywords'
  | 'Deep Research'
  | 'Write Article'
  | 'Humanise'
  | 'Review & Edit'
  | 'Add Photos + SEO Check'
  | 'Final Approval'
  | 'Watermark Removal'
  | 'Fact Check'
  | 'Publish'
  | 'Published'
  | 'Needs Refresh'
  | 'Refreshing'
  | 'Archived';

// Legacy status type — kept for backward compatibility during migration
export type ArticleStatus = 'Discovered' | 'Researching' | 'Writing' | 'In Review' | 'Approved' | 'Published' | 'Needs Refresh' | 'Refreshing' | 'Archived';

// Stage classification constants
export const PIPELINE_CREATION_STAGES: ArticleStage[] = [
  'New Article', 'Keyword Discovery', 'Select Keywords', 'Deep Research',
  'Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish',
];
export const HUMAN_GATE_STAGES: ArticleStage[] = ['Select Keywords', 'Review & Edit', 'Final Approval'];
export const AUTO_STAGES: ArticleStage[] = ['Keyword Discovery', 'Deep Research', 'Write Article', 'Humanise', 'Watermark Removal', 'Fact Check'];
export const ACTION_STAGES: ArticleStage[] = ['New Article', 'Add Photos + SEO Check', 'Publish'];

// Stage transitions — forward to next, backward to any previous
export const STAGE_ORDER: ArticleStage[] = [
  'New Article', 'Keyword Discovery', 'Select Keywords', 'Deep Research',
  'Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish',
];

/**
 * The detail panel's full tab set (CMS-153). Order is the render order in the
 * panel's tab bar.
 */
export const PANEL_TABS = ['Overview', 'Tasks', 'Research Brief', 'Content Preview', 'SEO Checklist', 'Links Audit', 'Compliance', 'Post-Publish', 'Version History'] as const;
export type PanelTab = typeof PANEL_TABS[number];

/**
 * The detail panel tab that is each stage's working surface — clicking a
 * kanban card opens the panel directly on this tab (requested 2026-09-16:
 * "every stage opens its relative stage in the modal"). Stages not listed
 * (lifecycle: Published/Needs Refresh/Refreshing) open on Overview.
 */
export const STAGE_DEFAULT_TAB: Partial<Record<ArticleStage, PanelTab>> = {
  'New Article': 'Overview',            // finish the brief, keyword, source material
  'Keyword Discovery': 'Overview',      // keyword metrics land here
  'Select Keywords': 'Overview',        // target-keyword context (picker is the stage guide)
  'Deep Research': 'Research Brief',    // the deep-research findings
  'Write Article': 'Content Preview',   // the draft lands here
  'Humanise': 'Content Preview',        // review the humanised text
  'Review & Edit': 'Content Preview',   // the editing surface
  'Add Photos + SEO Check': 'SEO Checklist',
  'Watermark Removal': 'Content Preview', // review the final text
  'Fact Check': 'Content Preview',        // the text under verification
  'Final Approval': 'Compliance',       // sign-off surface
  'Publish': 'Post-Publish',
};

/**
 * The tabs shown by default while viewing each stage (CMS-153: "show only
 * what is relevant to that step — in 'Article' you should only see how to
 * write the article, not the brief you already provided"). Every stage's
 * STAGE_DEFAULT_TAB must appear in its scoped set. The panel's "All tabs"
 * toggle restores the full PANEL_TABS list, so nothing is ever unreachable.
 * Lifecycle stages keep the full set.
 */
export const STAGE_TABS: Record<ArticleStage, PanelTab[]> = {
  'New Article': ['Overview'],                                    // brief, keyword, source material
  'Keyword Discovery': ['Overview'],                              // keyword metrics land here
  'Select Keywords': ['Overview'],                                // target-keyword context
  'Deep Research': ['Research Brief', 'Overview'],                // findings + the sources they draw on
  'Write Article': ['Content Preview', 'Version History'],        // the writing surface — not the provided brief
  'Humanise': ['Content Preview', 'Version History'],             // the humanised text
  'Review & Edit': ['Content Preview', 'Version History'],        // the editing surface
  'Add Photos + SEO Check': ['SEO Checklist', 'Content Preview', 'Links Audit', 'Tasks'], // photos/SEO + blocking media tasks
  'Watermark Removal': ['Content Preview', 'Version History'],    // the final de-watermarked text
  'Fact Check': ['Content Preview', 'Version History'],           // the fact-check report + the text under verification
  'Final Approval': ['Compliance', 'Content Preview'],            // sign-off + final read-through
  'Publish': ['Post-Publish', 'Compliance', 'Content Preview'],   // publish + monitoring setup
  'Published': [...PANEL_TABS],
  'Needs Refresh': [...PANEL_TABS],
  'Refreshing': [...PANEL_TABS],
  'Archived': [...PANEL_TABS],
};

/** The tab a stage's screen lands on (falls back to Overview for lifecycle stages). */
export function getStageDefaultTab(stage: ArticleStage): PanelTab {
  return STAGE_DEFAULT_TAB[stage] ?? 'Overview';
}

/** The tabs shown for a stage's screen (defensive full-set fallback). */
export function getStageTabs(stage: ArticleStage): PanelTab[] {
  return STAGE_TABS[stage] ?? [...PANEL_TABS];
}

/**
 * Kanban board column configuration (CMS-153: the column labels are the
 * pipeline stage names verbatim — the in-article stepper uses the same
 * STAGE_ORDER names, so tiles and columns always match).
 */
export const KANBAN_COLUMNS: { stage: ArticleStage; label: string; color: string; type: 'auto' | 'human' | 'action' }[] = [
  { stage: 'New Article', label: 'New Article', color: '#22c55e', type: 'action' },
  { stage: 'Keyword Discovery', label: 'Keyword Discovery', color: '#0093A7', type: 'auto' },
  { stage: 'Select Keywords', label: 'Select Keywords', color: '#f59e0b', type: 'human' },
  { stage: 'Deep Research', label: 'Deep Research', color: '#0093A7', type: 'auto' },
  { stage: 'Write Article', label: 'Write Article', color: '#0093A7', type: 'auto' },
  { stage: 'Humanise', label: 'Humanise', color: '#0093A7', type: 'auto' },
  { stage: 'Review & Edit', label: 'Review & Edit', color: '#f59e0b', type: 'human' },
  { stage: 'Add Photos + SEO Check', label: 'Add Photos + SEO Check', color: '#22c55e', type: 'action' },
  { stage: 'Watermark Removal', label: 'Watermark Removal', color: '#0093A7', type: 'auto' },
  { stage: 'Fact Check', label: 'Fact Check', color: '#0093A7', type: 'auto' },
  { stage: 'Final Approval', label: 'Final Approval', color: '#f59e0b', type: 'human' },
  { stage: 'Publish', label: 'Publish', color: '#22c55e', type: 'action' },
];

export function getValidForwardStages(current: ArticleStage): ArticleStage[] {
  // Lifecycle stages are not in STAGE_ORDER — handle them before the index
  // lookup or their transitions are unreachable.
  if (current === 'Published') return ['Needs Refresh'];
  if (current === 'Needs Refresh') return ['Refreshing'];
  if (current === 'Refreshing') return ['Published'];
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1) return [];
  if (idx < STAGE_ORDER.length - 1) return [STAGE_ORDER[idx + 1]];
  // 'Publish' → 'Published'
  if (current === 'Publish') return ['Published'];
  return [];
}

export function getValidBackwardStages(current: ArticleStage): ArticleStage[] {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx <= 0) return [];
  return STAGE_ORDER.slice(0, idx);
}

export function isValidStageTransition(from: ArticleStage, to: ArticleStage): boolean {
  if (to === 'Archived') return true; // can always archive
  return getValidForwardStages(from).includes(to) || getValidBackwardStages(from).includes(to);
}

// Keyword Discovery types
export interface KeywordOpportunity {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  serpFeatures: string[];
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  competitorGap: boolean;
  achievabilityScore: number;
  trend?: number[]; // last 12 months search volume trend
  updatedAt?: string; // e.g. "2 weeks ago"
  difficulty?: 'very_easy' | 'easy' | 'possible' | 'difficult' | 'hard' | 'very_hard';
}

export interface CompetitorGap {
  keyword: string;
  competitorDomain: string;
  competitorPosition: number;
  ourPosition: number | null;
  opportunity: string;
}

export interface SEOIssue {
  category: 'metadata' | 'headings' | 'keywords' | 'images' | 'schema';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface RefreshTrigger {
  id: string;
  type: 'ranking_drop' | 'traffic_decay' | 'competitor_overtake' | 'manual';
  detectedAt: Date;
  details: string;
  magnitude: number;
  resolved: boolean;
}

/** AI-generated experience question with the author's typed answer (CMS-52). */
export interface ExperienceQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface ArticleBrief {
  context: string;
  angle: string;
  targetAudience: string;
  experienceIds: string[];
  voiceNoteIds: string[];
}

export interface SEOCheckResult {
  passed: boolean;
  issues: SEOIssue[];
  acknowledgedWarnings: boolean;
  checkedAt: Date;
}

export interface FinalApprovalChecklist {
  contentReviewed: boolean;
  imagesAdded: boolean;
  seoVerified: boolean;
  metadataComplete: boolean;
  schemaPresent: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface MonitoringData {
  lastCheckedAt: Date | null;
  currentPosition: number | null;
  previousPosition: number | null;
  positionTrend: 'up' | 'down' | 'stable';
  weeklyTraffic: number;
  previousWeekTraffic: number;
  trafficTrend: number;
  healthStatus: 'healthy' | 'monitor' | 'attention';
  refreshTriggers: RefreshTrigger[];
}

// Legacy status → new stage migration map
export const STATUS_TO_STAGE_MAP: Record<ArticleStatus, ArticleStage> = {
  'Discovered': 'New Article',
  'Researching': 'Deep Research',
  'Writing': 'Write Article',
  'In Review': 'Review & Edit',
  'Approved': 'Final Approval',
  'Published': 'Published',
  'Needs Refresh': 'Needs Refresh',
  'Refreshing': 'Refreshing',
  'Archived': 'Archived',
};

export type PublishingState = 'draft' | 'ready_for_review' | 'approved' | 'publishing' | 'published' | 'publish_failed' | 'update_pending' | 'archived';

export type RefreshStatus = 'Needs Refresh' | 'Researching' | 'Rewriting' | 'In Review' | 'Approved' | 'Re-Published';

export type RefreshReasonType = 'Ranking Drop' | 'Traffic Decay' | 'AI Overview' | 'SEO Audit' | 'Stale Card Data' | 'Age' | 'Low-Hanging Fruit' | 'Manual';

export type TaskStatus = 'Pending' | 'In Progress' | 'Complete' | 'Blocked';

export type EntryPoint = 'RSS' | 'Manual' | 'Keyword' | 'URL Drop';

export type Priority = 'High' | 'Medium' | 'Low';

export type RevenuePotential = 'high' | 'medium' | 'low';

export type ConfidenceLevel = 'verified' | 'likely' | 'needs_verification' | 'disputed';

export type LinkSuggestionStatus = 'Pending' | 'Approved' | 'Rejected';

export type LinkStatus = 'Added' | 'Pending Add' | 'Not Found';

// Source URL type
export interface SourceUrl {
  url: string;
  type: 'Competitor Article' | 'Issuer Page' | 'Data Source' | 'Reference Material' | 'Internal ETH Article';
}

export interface ArticleCardTag {
  cardId: string;
  name: string;
}

/** An image found on a researched/selected source article (CMS-53). */
export interface SourceArticleImage {
  url: string;
  sourceUrl: string;
  alt: string;
}

export interface ArticleSourceImages {
  images: SourceArticleImage[];
  scannedUrls: string[];
  failedPages: number;
  extractedAt: Date;
}

/**
 * A source image the editor picked for use in this article (CMS-67).
 * Selection persists independently of `sourceImages` (which a re-scan
 * overwrites) so picks — including AI-edited versions — survive re-scans.
 */
export interface SelectedSourceImage {
  url: string;
  /** The source article page the image came from ('' for AI-edited results). */
  sourceUrl: string;
  alt: string;
  /** Asset Library document id when the image was imported / AI-edited. */
  assetId?: string;
  /** Original source-image URL when this entry is an AI-edited version. */
  editedFromUrl?: string;
}

// Main article interface
// Compliance check (final pipeline step) — the article body audited against
// the editable compliance rules document (settings/complianceRules) by the
// checkArticleCompliance callable. Verdict fails on ANY rule violation.
export type ComplianceCheckSeverity = 'level1' | 'level2' | 'level3';

export interface ComplianceCheckFinding {
  severity: ComplianceCheckSeverity;
  /** The specific rule text from the rules document that is violated. */
  rule: string;
  /** The offending article excerpt, quoted verbatim. */
  excerpt: string;
  explanation: string;
  suggestion: string;
}

export interface ArticleComplianceCheck {
  verdict: 'pass' | 'fail';
  summary: string;
  findings: ComplianceCheckFinding[];
  checkedAt: Date;
  checkedBy: string;
  /** sha1 of the rules text the article was checked against. */
  rulesHash: string;
  model: string;
}

// Fact Check stage (CMS-161) — Perplexity verifies the article's factual
// claims after Watermark Removal. Runs automatically on stage entry
// (pipeline_onArticleEnteredFactCheck trigger) and on manual re-run
// (factCheckArticle callable). FAIL auto-returns the article to Review & Edit;
// the Final Approval gate requires a pass recorded during the current visit.
export type FactCheckIssueType = 'incorrect' | 'outdated' | 'unverifiable';

export interface FactCheckIssue {
  /** The factual claim from the article, quoted verbatim. */
  claim: string;
  issueType: FactCheckIssueType;
  explanation: string;
  /** The correct current fact (empty for unverifiable claims). */
  correction: string;
  /** Source name/URL backing the correction, when available. */
  source: string;
}

export interface ArticleFactCheck {
  status: 'running' | 'passed' | 'failed' | 'error';
  /** Null while running / on error — a check that never completed is not a pass. */
  verdict: 'pass' | 'fail' | null;
  summary: string;
  issues: FactCheckIssue[];
  checkedAt: Date | null;
  checkedBy: string;
  model: string;
  /** Web sources Perplexity cited for the verdict. */
  citations?: string[];
  /** Raw model output kept for auditing. */
  rawResponse?: string;
  /** Failure detail when status === 'error' (service/parse failure). */
  error?: string;
}

export interface PipelineArticle {
  id: string;
  title: string;
  status: ArticleStatus;
  stage: ArticleStage;
  entryPoint: EntryPoint;
  source: { type: string; label: string };
  qualityScore: number;
  assignee: { name: string; avatar: string };
  targetKeyword: string;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  updatedAt: Date;
  createdAt: Date;
  stageEnteredAt: Date;
  priority: Priority;
  hasExperience: boolean;
  revenuePotential: RevenuePotential;
  /** Experience Library transcript ids attached to this article. */
  attachedExperienceIds?: string[];
  /** Last completed refresh (stamped by updateRefreshItemStatus / republish). */
  lastRefreshed?: Date | null;
  /** Staged AI-refreshed content awaiting review in the diff view. */
  refreshedContent?: string;
  refreshChangePercent?: number;
  /** Scheduled publish date set from the Editorial Calendar. Null when unscheduled. */
  scheduledPublishDate: Date | null;
  /** Scheduled publish time (e.g. '9:00 AM') set from the Editorial Calendar. */
  publishTime: string | null;
  taskProgress: { completed: number; total: number; hasBlocked: boolean };
  topicCluster?: string;
  subProgress?: Array<{ label: string; status: 'done' | 'active' | 'pending' }>;
  compliance?: { ftcDisclosure: boolean; cardTermsVerified: boolean; disclaimerPresent: boolean };
  /** Latest AI compliance-rules audit (final pipeline step) — written only by
   * the checkArticleCompliance callable via the Admin SDK. */
  complianceCheck?: ArticleComplianceCheck | null;
  refreshInfo?: { reason: string; detail: string; severity: string; notes?: string[] };
  refreshMeta?: {
    flaggedBy: string;
    flaggedDate: Date;
    originalPublishDate: Date;
    lastRefreshed: Date | null;
    liveUrl: string;
    currentPosition: number | null;
    targetPosition: number | null;
    traffic: number;
    trafficTrend: string;
    seoScore: number;
    daysInQueue: number;
  };
  failedInfo?: { stage: string; error: string };
  imagesNeeded?: boolean;
  socialEmbedsNeeded?: boolean;
  awaitingExperience?: boolean;
  webflowItemId?: string;
  publishedUrl?: string;
  content?: string;
  /** Article thumbnail (featured image) — Firebase Storage CDN URL of an
   * asset. Consumed at publish time for Webflow's featured-image AND the
   * OG/social image. Target format: 1080×1920 (9:16 Reel portrait). */
  featuredImage?: string;
  /** CMS-113: last publish's thumbnail-transfer failure (set by
   * executePublish when the Webflow upload fails; cleared on a clean sync). */
  featuredImageSyncWarning?: string;
  // Card tags — cards the article covers, suggested by AI at the Publish
  // step and confirmed by an editor. Names also merge into topicTags so they
  // resolve to Webflow tags at publish time.
  cardTags?: ArticleCardTag[];
  topicTags?: string[];
  sourceUrls?: SourceUrl[];
  metaTitle?: string;
  metaDescription?: string;
  schemaMarkup?: string;
  publishingState?: PublishingState;
  researchBrief?: {
    id?: string;
    findings: ResearchFinding[];
    selectedFindings?: string[];
    /** Per-finding editor steering notes (Deep Research approval) —
     * findingId → note; shipped verbatim to the writing agent. */
    findingNotes?: Record<string, string>;
    /** Source URLs Perplexity cited while generating the brief (saved by
     * generateTopicResearch) — shown as the supporting-research provenance. */
    citations?: string[];
    /** CMS-154: per-PRIMARY-source steering notes (source URL → note) from the
     * plan review — shipped verbatim with the primary-source block. */
    sourceNotes?: Record<string, string>;
    /** CMS-154: primary source URLs the editor unchecked in the plan review
     * (default = every article.sourceUrls entry is included). */
    excludedSourceUrls?: string[];
    /** CMS-154: overall "steer the plan" free-text — sent to the writing
     * agent as the global EDITOR DIRECTION line. */
    planNote?: string;
    approvalStatus?: 'draft' | 'approved';
    lockedAt?: Date | null;
    approvedBy?: string | null;
    generatedAt?: Date;
    keyword?: string;
  };
  seoResearch?: {
    keyword: string;
    metrics: { searchVolume: number; keywordDifficulty: number; cpc: number; competition: number };
    serp: Array<{ position: number; title: string; url: string; domain: string; estimatedWordCount: number }>;
    featuredSnippet: { type: string; currentHolder: string | null; opportunity: boolean };
    peopleAlsoAsk: string[];
    recommendedStructure: { suggestedH1: string; suggestedH2s: string[]; targetWordCount: number };
    generatedAt?: Date;
  };
  slug?: string;
  format?: string;
  redirects?: Array<{ oldUrl: string; created: string }>;
  editorialNotes?: string;
  /** Article brief — stored top-level by createArticle/updateArticle and
   * editable in the Overview tab (Context / Angle / Audience). */
  context?: string;
  angle?: string;
  targetAudience?: string;
  /** Experience Q&A step (CMS-52) — AI-generated questions the author
   * answers in text fields; answered ones feed the AI draft as
   * personal-experience context. */
  experienceQuestions?: ExperienceQuestion[];
  /** Page-template library choice (CMS-47) — id into PAGE_TEMPLATES. */
  pageTemplateId?: string;
  outline?: string[];
  /** Images extracted from the researched/selected source articles
   * (extractSourceImages callable) — shown in Content Preview so the
   * editor can pick which to reuse. */
  sourceImages?: ArticleSourceImages | null;
  /** Source images the editor selected for this article (CMS-67) —
   * persists across re-scans and includes AI-edited versions. */
  selectedSourceImages?: SelectedSourceImage[];
  /** Source-image URLs the editor removed (CMS-67) — kept so a re-scan
   * that repopulates `sourceImages` doesn't bring them back. */
  dismissedSourceImageUrls?: string[];
  // New pipeline lifecycle fields
  articleBrief?: ArticleBrief;
  keywordDiscovery?: { keywords: KeywordOpportunity[]; competitorGaps: CompetitorGap[]; generatedAt: Date } | null;
  seoCheckResult?: SEOCheckResult | null;
  finalApprovalChecklist?: FinalApprovalChecklist | null;
  monitoringData?: MonitoringData | null;
  /** AI Final Processing (ZeroGPT detection + Gemma normalisation) state —
   * written only by the processing backend (job / callables). */
  finalProcessing?: ArticleFinalProcessing | null;
  /** CMS-131: Humanise stage state (ZeroGPT scan + Gemma humanise pass after
   * Write Article) — written only by the processing backend. */
  humanise?: ArticleHumanise | null;
  /** CMS-161: Fact Check stage report (Perplexity audit after Watermark
   * Removal) — written only by the factCheckArticle callable / stage-entry
   * trigger via the Admin SDK. */
  factCheck?: ArticleFactCheck | null;
}

// Refresh Queue Item
export interface RefreshQueueItem {
  /** Linked pipeline article document id. */
  articleId?: string;
  /** Set when the refresh completes (status Re-Published). */
  completedAt?: Date | null;
  /** Achieved-vs-target improvement recorded at completion. */
  positionImprovement?: number | null;
  id: string;
  title: string;
  keyword?: string;
  position: number | null;
  targetPosition: number | null;
  traffic: number;
  trafficTrend: 'up' | 'down' | 'stable';
  status: RefreshStatus;
  priority: Priority;
  assignedTo?: string;
  seoScore: number;
  qualityScore: number;
  refreshReason: RefreshReasonType;
  flaggedBy: string;
  flaggedDate: Date;
  publishedDate?: Date;
  lastRefreshed: Date | null;
  liveUrl?: string;
  daysInQueue: number;
  refreshNotes?: string[];
  aiRecommendations?: Array<{ category: string; severity: string; text: string }>;
  voiceNote?: boolean;
  editorialDirection?: string;
  refreshScope?: string[];
  sourceUrls?: string[];
  dueDate?: Date;
  blockedTask?: string;
}

// Article Task
export interface ArticleTask {
  id: string;
  articleId: string;
  icon: string;
  name: string;
  status: TaskStatus;
  assignee: string;
  avatar: string;
  dueDate: Date;
  comments: number;
  blockReason?: string;
  blocksAdvancement?: boolean;
  isImagesTask?: boolean;
  isSocialEmbedsTask?: boolean;
  description?: string;
  autoAssigned?: boolean;
  resolvedBlockers?: Array<{ reason: string; resolvedAt: Date }>;
}

// Article Version
export interface ArticleVersion {
  id: string;
  articleId: string;
  author: string;
  timestamp: Date;
  action: string;
  wordCount: number;
  /** Article body as of this version — present on versions written after
   * restore support shipped; enables "Restore this version". */
  contentSnapshot?: string;
  /** Set on version entries created by a restore. */
  restoredFromVersionId?: string;
}

// Cloud Function Input/Output types
export interface CreateArticleInput {
  title: string;
  targetKeyword: string;
  assignee: { name: string; avatar: string };
  priority: Priority;
  entryPoint: EntryPoint;
  source: { type: string; label: string };
  sourceUrls?: SourceUrl[];
  format?: string;
  topicCluster?: string;
  editorialNotes?: string;
  articleLength?: 'short' | 'standard' | 'longform' | 'epic';
  depth?: 'Overview' | 'Detailed' | 'Comprehensive';
  experienceCategory?: string;
  experienceText?: string;
  secondaryKeywords?: string[];
  outline?: string[];
  targetDate?: string;
  // New pipeline lifecycle fields
  context?: string;
  angle?: string;
  targetAudience?: string;
  /**
   * RSS → Pipeline handoff: when set, the createArticle callable marks the
   * RSS item `researching` (and rejects items already in the pipeline).
   */
  rssItemId?: string;
  /**
   * CMS-149 "Save Draft": persist a PARTIALLY filled form (target keyword
   * optional) so the author can leave and finish later from the New Article
   * column. Everything else validates as normal.
   */
  saveAsDraft?: boolean;
  /**
   * CMS-150 page-template choice at creation: id into PAGE_TEMPLATES
   * (recorded on the article). When a template is chosen, `content` carries
   * the template's seeded placeholder structure for the blank body.
   */
  pageTemplateId?: string;
  /** Initial article body — used by CMS-150 to seed a template's skeleton. */
  content?: string;
  /**
   * CMS-112 bulk handoff ("Research Selected" / "Research This Topic"):
   * marks MANY RSS items researching against the one created article;
   * items already in the pipeline are skipped, not rejected.
   */
  rssItemIds?: string[];
}

export interface CreateArticleOutput {
  articleId: string;
}

export interface UpdateArticleStatusInput {
  articleId: string;
  newStatus: ArticleStatus;
}

export interface UpdateArticleStatusOutput {
  success: boolean;
}

export interface AddToRefreshQueueInput {
  articleId?: string;
  title: string;
  refreshReason: RefreshReasonType;
  priority: Priority;
  keyword?: string;
  assignedTo?: string;
  refreshScope?: string[];
  sourceUrls?: string[];
  editorialDirection?: string;
  dueDate?: Date;
  targetPosition?: number;
}

export interface GenerateArticleDraftInput {
  articleId: string;
  researchFindings: ResearchFinding[];
  personalExperience?: string;
  seoContext: {
    targetKeyword: string;
    searchVolume: number;
    competitorAnalysis: CompetitorData[];
  };
}

export interface GenerateTopicResearchInput {
  articleId: string;
  targetKeyword: string;
  sourceUrls?: string[];
}

export interface GenerateTopicResearchOutput {
  brief: ResearchBrief;
}

export interface PublishToWebflowInput {
  articleId: string;
}

export interface PublishToWebflowOutput {
  success: boolean;
  webflowItemId?: string;
  publishedUrl?: string;
  /**
   * CMS-113: set when the article published but its thumbnail could not be
   * uploaded to Webflow (e.g. the API token lacks the assets:write scope).
   * Undefined means the featured image transferred cleanly (or none was set).
   */
  featuredImageWarning?: string;
  verificationResults?: {
    httpStatus: number;
    schemaPresent: boolean;
    metaTagsValid: boolean;
    gscSubmitted: boolean;
  };
}

export interface ManageTasksInput {
  action: 'create' | 'update' | 'complete' | 'block' | 'unblock' | 'delete';
  taskId?: string;
  articleId?: string;
  name?: string;
  assignee?: string;
  dueDate?: Date;
  status?: TaskStatus;
  description?: string;
  blockReason?: string;
  icon?: string;
}

export interface ManageTasksOutput {
  success: boolean;
  taskId?: string;
}

// Research types
export interface ResearchFinding {
  id: string;
  category: string;
  text: string;
  confidence: ConfidenceLevel;
  source?: string;
  selected?: boolean;
  annotation?: string;
}

export interface ResearchBrief {
  id: string;
  articleId: string;
  generatedAt: Date;
  findings: ResearchFinding[];
  approved?: boolean;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface CompetitorData {
  name: string;
  rank: number;
  wordCount: number;
  lastUpdated: Date;
  strengths: string[];
}

// Filter types
export interface PipelineFilters {
  entryPoint: EntryPoint | 'All';
  priority: Priority | 'All';
  assignee: string;
  eeat: 'All' | 'Experience Sourced' | 'No Experience';
  blocked: 'All' | 'Has Blockers' | 'No Blockers';
}

export interface RefreshQueueFilters {
  search: string;
  assignee: string;
  priority: Priority | 'All';
  refreshReason: RefreshReasonType | 'All';
  blocked: 'All' | 'Has Blockers' | 'No Blockers';
  dateRange: 'All' | 'Last 7 days' | 'Last 30 days' | 'Last 60 days' | 'Last 90 days' | 'Custom';
  customDateStart?: Date;
  customDateEnd?: Date;
}

export interface ContentLibraryFilters {
  health: 'All' | 'Healthy' | 'Monitor' | 'Needs Attention';
  cluster: string;
  author: string;
  publishedDateStart?: Date;
  publishedDateEnd?: Date;
  position: 'All' | 'Page 1' | 'Page 2' | 'Page 3+' | 'Not Ranking';
  lastRefreshed: 'All' | 'Never Refreshed' | '90+ days ago';
  search: string;
}

// Link Suggestion
export interface LinkSuggestion {
  id: string;
  sourceArticle: string;
  sourceUrl: string;
  anchorText: string;
  placement: string;
  newPillar: string;
  relevance: number;
  status: LinkSuggestionStatus;
  approvedBy?: string;
  approvedDate?: Date;
  rejectedBy?: string;
  rejectedDate?: Date;
  linkStatus?: LinkStatus;
}