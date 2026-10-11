import type { Timestamp } from '@/services/timestamp';

// ─── Connection Status ───────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'not_connected' | 'error' | 'checking';

export interface ConnectionResult {
  status: ConnectionStatus;
  message: string;
  details: Record<string, unknown>;
}

// ─── Setting ID Registry ─────────────────────────────────────────────────────

export type SettingId =
  | 'general'
  | 'brandVoice'
  | 'aiConfig'
  | 'webflow'
  | 'beehiiv'
  | 'cmsSync'
  | 'slack'
  | 'seoApi'
  | 'socialAccounts'
  | 'adPlatforms'
  | 'contentRules'
  | 'compliance'
  | 'complianceRules'
  | 'notifications'
  | 'apiUsage'
  | 'kpiTargets'
  | 'competitorsRss'
  | 'scraper'
  | 'dataExport'
  | 'credentials'
  | 'trafficMarket'
  | 'aiFinalProcessing'
  | 'humanizerRules'
  | 'userManagement';

export const EDITOR_WRITABLE_SETTINGS: SettingId[] = [
  'brandVoice',
  'contentRules',
  'kpiTargets',
  'competitorsRss',
  'complianceRules',
];

// ─── Tab Configuration ───────────────────────────────────────────────────────

export type TabGroup = 'General' | 'Integrations' | 'Content' | 'Operations' | 'System';

export interface TabItem {
  id: string;
  label: string;
  slug: string;
  settingId: SettingId;
  group: TabGroup;
}

export const TAB_GROUPS: TabGroup[] = ['General', 'Integrations', 'Content', 'Operations', 'System'];

export const SETTINGS_TABS: TabItem[] = [
  // General
  { id: 'general', label: 'General', slug: 'general', settingId: 'general', group: 'General' },
  { id: 'brandVoice', label: 'Brand Voice', slug: 'brand-voice', settingId: 'brandVoice', group: 'General' },
  { id: 'aiConfig', label: 'AI Configuration', slug: 'ai-config', settingId: 'aiConfig', group: 'General' },
  // Integrations
  { id: 'webflow', label: 'Webflow', slug: 'webflow', settingId: 'webflow', group: 'Integrations' },
  { id: 'beehiiv', label: 'Beehiiv', slug: 'beehiiv', settingId: 'beehiiv', group: 'Integrations' },
  { id: 'cmsSync', label: 'CMS Sync', slug: 'cms-sync', settingId: 'cmsSync', group: 'Integrations' },
  { id: 'slack', label: 'Slack', slug: 'slack', settingId: 'slack', group: 'Integrations' },
  { id: 'seoApi', label: 'SEO API', slug: 'seo-api', settingId: 'seoApi', group: 'Integrations' },
  { id: 'socialAccounts', label: 'Social Accounts', slug: 'social-accounts', settingId: 'socialAccounts', group: 'Integrations' },
  { id: 'adPlatforms', label: 'Ad Platforms', slug: 'ad-platforms', settingId: 'adPlatforms', group: 'Integrations' },
  // Content
  { id: 'contentRules', label: 'Content Rules', slug: 'content-rules', settingId: 'contentRules', group: 'Content' },
  { id: 'compliance', label: 'Compliance', slug: 'compliance', settingId: 'compliance', group: 'Content' },
  { id: 'notifications', label: 'Notifications', slug: 'notifications', settingId: 'notifications', group: 'Content' },
  // Operations
  { id: 'apiUsage', label: 'API Cost Tracking', slug: 'api-usage', settingId: 'apiUsage', group: 'Operations' },
  { id: 'kpiTargets', label: 'KPI Targets', slug: 'kpi-targets', settingId: 'kpiTargets', group: 'Operations' },
  { id: 'competitorsRss', label: 'Competitors & RSS', slug: 'competitors-rss', settingId: 'competitorsRss', group: 'Operations' },
  { id: 'scraper', label: 'Scraper Management', slug: 'scraper', settingId: 'scraper', group: 'Operations' },
  { id: 'aiFinalProcessing', label: 'AI Final Processing', slug: 'ai-final-processing', settingId: 'aiFinalProcessing', group: 'Operations' },
  { id: 'credentials', label: 'API Credentials', slug: 'credentials', settingId: 'credentials', group: 'System' },
  // System
  { id: 'dataExport', label: 'Data Export', slug: 'data-export', settingId: 'dataExport', group: 'System' },
  { id: 'teamRoles', label: 'Team, Roles & Authors', slug: 'team-roles', settingId: 'general', group: 'System' },
  { id: 'auditLog', label: 'Audit Log', slug: 'audit-log', settingId: 'general', group: 'System' },
];

// ─── General Settings ────────────────────────────────────────────────────────

export interface SiteConfig {
  id: string;
  name: string;
  domain: string;
  webflowSiteId: string;
  purpose: 'Content & Blog' | 'Sales Funnel';
  primary: boolean;
  active: boolean;
}

export interface GeneralSettings {
  companyName: string;
  companyLogoUrl: string | null;
  tagline: string;
  sites: SiteConfig[];
  dashboard: {
    timezone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    weekStartsOn: 'Sunday' | 'Monday';
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Brand Voice Settings ────────────────────────────────────────────────────

export interface BrandVoiceSettings {
  toneDescription: string;
  personalityTraits: string[];
  exampleParagraphs: { label: string; text: string }[];
  hardRules: { id: string; rule: string; active: boolean }[];
  // Negative patterns ("signs of AI writing") every prose generator must avoid.
  // Mirrors BrandVoiceDoc in functions/src/shared/brandVoice.ts.
  aiWritingAvoidances: { id: string; pattern: string; example?: string; active: boolean }[];
  preferredTerminology: { insteadOf: string; useThis: string }[];
  formattingStandards: { rule: string; standard: string }[];
  // addedAt is an ISO string for entries added via the exemplar picker (callable
  // payloads can't carry Firestore Timestamps); older data may hold Timestamps
  exemplarArticles: { id: string; title: string; url: string; addedAt: Timestamp | string }[];
  exemplarNewsletters: { id: string; title: string; url: string; addedAt: Timestamp | string }[];
  versionHistory: { timestamp: Timestamp; changedBy: string; summary: string }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── AI Config Settings ──────────────────────────────────────────────────────

export interface AIConfigSettings {
  tier1: {
    provider: 'claude';
    model: string;
    monthlyTokenUsage: number;
  };
  tier2: {
    provider: 'gemini-flash';
    model: string;
    monthlyRequestCount: number;
  };
  agentAssignments: {
    agentId: string;
    agentName: string;
    model: string;
    tier: 1 | 2;
    overrideEnabled: boolean;
  }[];
  perplexity: {
    monthlyRequestCount: number;
  };
  stockPhotoProvider: {
    provider: string;
  };
  imageGeneration: {
    tier: 'standard' | 'fast' | 'pro';
    monthlyBudget: number;
    currentSpend: number;
    warningThreshold: number;
    disableOnBudgetExceeded: boolean;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Webflow Settings ────────────────────────────────────────────────────────

export interface WebflowSettings {
  connectionStatus: ConnectionStatus;
  siteName: string | null;
  planTier: string | null;
  rateLimit: string | null;
  verifiedAt: Timestamp | null;
  siteMapping: {
    siteId: string;
    siteName: string;
    domain: string;
    webflowSiteId: string;
    connectionStatus: 'connected' | 'disconnected' | 'error';
  }[];
  publishingDefaults: {
    defaultStatus: 'draft' | 'published';
    autoSubmitToGSC: boolean;
    postPublishVerification: boolean;
    verificationDelaySeconds: number;
  };
  cmsFieldMappings: {
    collectionName: string;
    firestoreCollection: string;
    mappings: {
      firestoreField: string;
      webflowField: string;
      type: string;
      syncDirection: 'push' | 'pull' | 'bidirectional';
    }[];
    itemCount: number;
    pendingItems: number;
    lastSyncTime: Timestamp | null;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Beehiiv Settings ────────────────────────────────────────────────────────

export interface BeehiivSettings {
  connectionStatus: ConnectionStatus;
  publicationId: string;
  planTier: string | null;
  subscriberCount: number | null;
  newsletterConfig: {
    defaultSendTime: string;
    defaultSenderName: string;
    defaultReplyTo: string;
    footer: string;
  };
  subscriberSync: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
    webhookUrl: string;
    webhookSecret: string;
    events: {
      newSubscriber: boolean;
      unsubscribe: boolean;
      emailOpen: boolean;
      emailClick: boolean;
      referral: boolean;
      tagChange: boolean;
    };
    lastSyncTime: Timestamp | null;
  };
  abTestDefaults: {
    subjectLineVariants: number;
    splitPercentage: number;
    winningMetric: 'open_rate' | 'click_rate';
    testDurationHours: number;
  };
  deliverability: {
    sendingDomainVerified: boolean;
    spfStatus: 'pass' | 'fail' | 'unknown';
    dkimStatus: 'pass' | 'fail' | 'unknown';
    dmarcStatus: 'pass' | 'fail' | 'unknown';
    canSpamCompliant: boolean;
    gdpr: {
      doubleOptIn: boolean;
      dataDeletionEndpoint: string;
      consentTracking: boolean;
    };
  };
  customFields: {
    id: string;
    name: string;
    type: string;
    subscribersWithValue: number;
    createdAt: Timestamp;
  }[];
  webhooks: {
    id: string;
    eventType: string;
    url: string;
    status: 'active' | 'inactive';
    lastTriggered: Timestamp | null;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── CMS Sync Settings ──────────────────────────────────────────────────────

export interface CMSSyncSettings {
  collections: {
    firestoreName: string;
    firestoreItemCount: number;
    webflowCollection: string;
    status: 'in_sync' | 'pending' | 'error';
    lastSynced: Timestamp | null;
    pendingCount: number;
    failedCount: number;
  }[];
  syncQueue: {
    id: string;
    title: string;
    collection: string;
    queuedAt: Timestamp;
    status: 'syncing' | 'queued';
  }[];
  errorLog: {
    id: string;
    timestamp: Timestamp;
    collection: string;
    title: string;
    errorType: string;
    message: string;
    status: 'failed' | 'retried' | 'resolved';
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Slack Settings ──────────────────────────────────────────────────────────

export interface SlackSettings {
  connected: boolean;
  workspaceName: string | null;
  connectedBy: string | null;
  connectedAt: Timestamp | null;
  oauthScopes: string[];
  channels: {
    id: string;
    name: string;
    description: string;
    events: string[];
    enabled: boolean;
  }[];
  dailyDigest: {
    channelId: string;
    sendTime: string;
    contentChecks: string[];
  };
  customAlerts: {
    id: string;
    name: string;
    triggerType: 'threshold' | 'schedule' | 'event';
    condition: string;
    channelId: string;
    priority: 'high' | 'medium' | 'low';
    active: boolean;
  }[];
  formatting: {
    messageFormat: 'rich' | 'simple';
    includeDashboardLinks: boolean;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── SEO API Settings ────────────────────────────────────────────────────────

export interface SeoApiSettings {
  provider: 'dataforseo' | 'semrush' | 'se_ranking';
  connectionStatus: ConnectionStatus;
  accountBalance: number | null;
  dailyRequestBudget: number;
  priorityAllocation: { module: string; percentage: number }[];
  googleSearchConsole: {
    connected: boolean;
    syncFrequency: 'hourly' | 'daily' | 'weekly';
    dataScope: {
      indexingStatus: boolean;
      searchPerformance: boolean;
      coreWebVitals: boolean;
    };
    urlInspectionQuota: number;
    lastSyncTime: Timestamp | null;
  };
  googleAnalytics4: {
    connected: boolean;
    trafficSyncFrequency: 'hourly' | 'daily' | 'weekly';
    engagementSyncFrequency: 'hourly' | 'daily' | 'weekly';
    lastSyncTime: Timestamp | null;
  };
  googleAds: {
    connected: boolean;
    syncFrequency: 'hourly' | 'daily' | 'weekly';
  };
  dataForSeoCapabilities: {
    planBadge: string;
    rateLimits: string;
    modules: { name: string; enabled: boolean; monthlyUsage: number; cost: number; budgetRemaining: number }[];
  };
  redirects: {
    id: string;
    oldUrl: string;
    newUrl: string;
    type: '301' | '302';
    createdAt: Timestamp;
    createdBy: string;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Traffic & Market Settings ───────────────────────────────────────────────

export interface TrafficMarketSettings {
  useSampleData?: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ─── Social Accounts Settings ────────────────────────────────────────────────

export interface SocialAccountsSettings {
  accounts: {
    platform: 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'facebook' | 'linkedin' | 'pinterest';
    connected: boolean;
    accountName: string | null;
    connectedAt: Timestamp | null;
    /** YouTube channel ID (UC...) — legacy, unused since the Zernio migration. */
    channelId?: string | null;
    /** Brand the account belongs to (EPM / CC / JF). */
    brand?: string;
    /** Zernio SocialAccount id — set when the account is OAuth-connected via
     * Zernio. Entries without it are pre-Zernio legacy handles and cannot
     * import until reconnected. */
    zernioAccountId?: string | null;
    /** Zernio definitively reported the OAuth token dead — reconnect via the
     * Zernio connect flow to recover. */
    needsReconnection?: boolean;
    /** Full profile URL on the platform (from Zernio). */
    zernioProfileUrl?: string | null;
    /** Profile picture URL on the platform (from Zernio). */
    zernioProfilePicture?: string | null;
    /** Outcome of the latest handle-level video import (connect backfill or
     * daily scheduled run) — written by Cloud Functions, read-only here.
     * status 'running' is written when an import starts; missing status on
     * older entries means completed. */
    lastImportStatus?: {
      at: Timestamp;
      trigger: 'backfill' | 'scheduled';
      imported: number;
      skipped: number;
      errors: string[];
      status?: 'running' | 'completed';
    } | null;
  }[];
  /** Zernio team profile id that owns every connected account. */
  zernioProfileId?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Ad Platforms Settings ───────────────────────────────────────────────────

export interface AdPlatformsSettings {
  platforms: {
    platform: 'google_ads' | 'meta_ads' | 'microsoft_ads';
    connected: boolean;
    accountName: string | null;
    connectedAt: Timestamp | null;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Content Rules Settings ──────────────────────────────────────────────────

export interface ContentRulesSettings {
  taxonomy: {
    id: string;
    name: string;
    subcategories: { id: string; name: string; articleCount: number }[];
    articleCount: number;
  }[];
  freeformTags: {
    id: string;
    name: string;
    usageCount: number;
  }[];
  consistencyEnforcement: boolean;
  articleTemplates: {
    id: string;
    name: string;
    targetLength: number;
    schemaType: string;
    articlesUsing: number;
  }[];
  expirationRules: {
    promotionExpiration: boolean;
    dealAlertExpiration: boolean;
    sunsetPolicy: {
      monthsThreshold: number;
      action: 'flag_for_review' | 'auto_redirect' | 'deindex_and_archive';
    };
  };
  canonicalUrlRules: {
    defaultBehavior: 'self_referencing' | 'blog_article_priority';
    autoDetection: boolean;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Compliance Settings ─────────────────────────────────────────────────────

export interface ComplianceSettings {
  ftcDisclosure: {
    text: string;
    position: 'top_of_article' | 'below_title' | 'before_first_affiliate_link';
    style: 'standard_box' | 'inline_text' | 'collapsible';
    autoInsert: boolean;
  };
  disclaimers: {
    id: string;
    name: string;
    triggerCondition: string;
    text: string;
    active: boolean;
  }[];
  financialAdviceGuardrails: string[];
  cardTermsVerification: {
    realTimeVerification: boolean;
    verificationFields: string[];
    haltBehavior: 'halt_and_alert' | 'halt_alert_and_flag';
  };
  auditSettings: {
    retentionPeriod: '1_year' | '2_years' | '3_years' | 'indefinite';
    autoComplianceReport: boolean;
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Compliance Rules Document (settings/complianceRules) ───────────────────
// The editable credit-card affiliate compliance rules document the pipeline's
// final-step compliance check (checkArticleCompliance) audits articles
// against. Seeded from DEFAULT_COMPLIANCE_RULES when never saved.

export interface ComplianceRulesSettings {
  rulesText: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Notifications Settings ──────────────────────────────────────────────────

export interface NotificationsSettings {
  defaults: {
    id: string;
    event: string;
    category: string;
    slack: boolean;
    dashboard: boolean;
    email: boolean;
    push: boolean;
    priority: 'high' | 'medium' | 'low';
  }[];
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
    weekendQuietHours: boolean;
  };
  digestPreferences: {
    dashboardDigest: 'realtime' | 'hourly' | 'daily';
    emailDigest: 'never' | 'daily' | 'weekly';
  };
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── API Usage Settings ──────────────────────────────────────────────────────

export interface ApiUsageSettings {
  monthlyBudget: number;
  currentSpend: number;
  projectedSpend: number;
  daysRemaining: number;
  services: {
    name: string;
    thisMonth: number;
    lastMonth: number;
    changePercent: number;
    dailyAvg: number;
    usageMetric: string;
    budget: number;
    dailyCosts: { date: string; cost: number }[];
  }[];
  alerts: {
    thresholdPercentages: number[];
    autoThrottleAt90: boolean;
  };
  costAnomalyDetection: boolean;
  optimizationRecommendations: string[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── KPI Targets Settings ────────────────────────────────────────────────────

export interface KPITargetsSettings {
  publishing: {
    weeklyArticleTarget: number;
    monthlyArticleTarget: number;
    avgQualityScoreTarget: number;
  };
  trafficSeo: {
    weeklyOrganicTraffic: number;
    keywordsOnPage1: number;
    domainRating: number;
  };
  newsletter: {
    subscriberMonthlyGrowth: number;
    openRate: number;
    clickRate: number;
  };
  operational: {
    articlesNeedingRefresh: number;
    pipelineBottleneck: number;
  };
  budget: {
    monthlyApiBudget: number;
  };
  changeHistory: {
    timestamp: Timestamp;
    field: string;
    oldValue: number;
    newValue: number;
    changedBy: string;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Competitors & RSS Settings ──────────────────────────────────────────────

export interface CompetitorsRSSSettings {
  competitors: {
    id: string;
    domain: string;
    name: string;
    metadata: Record<string, string>;
  }[];
  rssFeeds: {
    id: string;
    url: string;
    name: string;
    status: 'active' | 'paused' | 'error';
  }[];
  newsletterMonitoring: {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'paused';
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Scraper Settings ────────────────────────────────────────────────────────

export interface ScraperSettings {
  platformStatus: 'online' | 'offline' | 'degraded';
  cardsMonitored: number;
  successRate7Day: number;
  avgScrapeTime: number;
  schedules: {
    cardId: string;
    cardName: string;
    issuer: string;
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    lastScraped: Timestamp | null;
    lastChanged: Timestamp | null;
    status: 'active' | 'paused' | 'running';
    enabled: boolean;
  }[];
  platform: {
    selected: 'tinyfish' | 'firecrawl' | 'apify';
    tinyfish: { stepsRemaining: number; goalTemplate: string; stealthMode: boolean };
    firecrawl: { creditsRemaining: number };
    apify: { computeUnits: number; actorId: string; memoryMb: number };
  };
  defaultRunOptions: {
    timeoutSeconds: number;
    creditsBudgetPerRun: number;
  };
  recentRuns: {
    id: string;
    startedAt: Timestamp;
    duration: number;
    cardsScraped: number;
    changesDetected: number;
    status: 'success' | 'partial' | 'failed';
    cost: number;
  }[];
  rateSensitiveTriggers: {
    autoScrapeOnFedRate: boolean;
    upcomingFedDates: { date: string; countdown: number }[];
  };
  errorLog: {
    id: string;
    cardName: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Timestamp;
    retryInfo: string;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Data Export Settings ────────────────────────────────────────────────────

export interface DataExportSettings {
  exportHistory: {
    id: string;
    date: Timestamp;
    type: 'articles' | 'analytics' | 'card_data' | 'full_archive';
    format: 'json' | 'csv';
    size: string;
    downloadUrl: string | null;
  }[];
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  userName: string;
  actionType: string;
  targetEntity: string;
  settingArea: string | null;
  details: Record<string, unknown>;
  changedFields: string[];
}

// ─── Audit Log Filters ───────────────────────────────────────────────────────

export interface AuditLogFilters {
  userId?: string;
  actionType?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

// ─── Connection Provider ─────────────────────────────────────────────────────

export type ConnectionProvider = 'webflow' | 'beehiiv' | 'dataforseo' | 'slack';
