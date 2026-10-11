// MOCK-ONLY — in-memory settings store backing the settings module.
// Replaces Firestore `settings/*` documents and the `audit-log` collection.
// Seeded with realistic ETH-domain state; mutated by settingsService mocks.
//
// production: Firestore `doc(db, 'settings', settingId)` + `collection(db, 'audit-log')`

import { Timestamp } from '@/services/timestamp';
import type {
  SettingId,
  AuditLogEntry,
  GeneralSettings,
  BrandVoiceSettings,
  AIConfigSettings,
  WebflowSettings,
  BeehiivSettings,
  CMSSyncSettings,
  SlackSettings,
  SeoApiSettings,
  SocialAccountsSettings,
  AdPlatformsSettings,
  ContentRulesSettings,
  ComplianceSettings,
  ComplianceRulesSettings,
  NotificationsSettings,
  ApiUsageSettings,
  KPITargetsSettings,
  CompetitorsRSSSettings,
  ScraperSettings,
  DataExportSettings,
  TrafficMarketSettings,
} from '../types';
import { DEFAULT_COMPLIANCE_RULES } from '../complianceDefaultRules';

const now = Date.now();
const day = 864e5;
const ts = (msOffset: number) => Timestamp.fromMillis(now + msOffset);
const iso = (msOffset: number) => new Date(now + msOffset).toISOString().slice(0, 10);

const EDITOR = 'daynis@elitetravelhackers.com';

// ─── Seed: settings documents ───────────────────────────────────────────────

const general: GeneralSettings = {
  companyName: 'Elite Travel Hackers',
  companyLogoUrl: 'https://picsum.photos/seed/eth-logo/240/80',
  tagline: 'Points, miles, and the art of travelling better.',
  sites: [
    { id: 'site_epm', name: 'Elite Points & Miles', domain: 'elitepointsandmiles.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f501', purpose: 'Content & Blog', primary: true, active: true },
    { id: 'site_cc', name: 'CardCurious', domain: 'cardcurious.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f502', purpose: 'Content & Blog', primary: false, active: true },
    { id: 'site_jf', name: 'Jetset Funnel', domain: 'jetsetfunnel.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f503', purpose: 'Sales Funnel', primary: false, active: false },
  ],
  dashboard: { timezone: 'Australia/Sydney', dateFormat: 'DD/MM/YYYY', weekStartsOn: 'Monday' },
  updatedAt: ts(-2 * day),
  updatedBy: EDITOR,
};

const brandVoice: BrandVoiceSettings = {
  toneDescription:
    'Confident, warm, and plainly expert. We write like a well-travelled friend who happens to work in loyalty — never salesy, never breathless, always concrete about the numbers.',
  personalityTraits: ['Concrete', 'Generous with specifics', 'Slightly dry humour', 'Anti-hype', 'Reader-first'],
  exampleParagraphs: [
    {
      label: 'Deal framing',
      text: 'At 1.8c per point this redemption clears our buy threshold by a wide margin. If you were already planning a Singapore stopover, this is the fare to build the trip around.',
    },
    {
      label: 'Card verdict',
      text: 'The $395 annual fee looks steep until you do the maths on the lounge passes and the travel credit — then it looks like the cheapest lounge membership in the country.',
    },
  ],
  hardRules: [
    { id: 'hr1', rule: 'Never call a redemption "free" — points have an opportunity cost.', active: true },
    { id: 'hr2', rule: 'Always state cents-per-point when valuing a redemption.', active: true },
    { id: 'hr3', rule: 'Annual fee must appear in the first three paragraphs of any card review.', active: true },
    { id: 'hr4', rule: 'No manufactured urgency ("hurry", "act fast") unless a genuine expiry date is stated.', active: true },
  ],
  aiWritingAvoidances: [
    { id: 'aw1', pattern: 'Delve into', example: 'Let\'s delve into the details', active: true },
    { id: 'aw2', pattern: 'Game-changer', example: 'This card is a game-changer', active: true },
    { id: 'aw3', pattern: 'Unlock (as a metaphor)', example: 'Unlock incredible value', active: true },
    { id: 'aw4', pattern: 'Whether you\'re a ... or a ...', example: 'Whether you\'re a seasoned pro or a newbie', active: true },
    { id: 'aw5', pattern: 'In today\'s fast-paced world', active: true },
  ],
  preferredTerminology: [
    { insteadOf: 'free flight', useThis: 'points redemption' },
    { insteadOf: 'hack', useThis: 'strategy' },
    { insteadOf: 'cheap', useThis: 'low-cost' },
  ],
  formattingStandards: [
    { rule: 'Currency', standard: 'AUD by default; USD in parentheses on first mention for US-issued cards' },
    { rule: 'Points values', standard: 'Always cents-per-point to one decimal (1.8c)' },
    { rule: 'Headings', standard: 'Sentence case, no trailing punctuation' },
  ],
  exemplarArticles: [
    { id: 'art_ex1', title: 'Is the Amex Platinum Edge still worth $195 in 2026?', url: 'https://elitepointsandmiles.com/amex-platinum-edge-review-2026', addedAt: ts(-40 * day) },
    { id: 'art_ex2', title: 'The 1.8c Singapore Airlines redemption hiding in plain sight', url: 'https://elitepointsandmiles.com/sq-redemption-sweet-spot', addedAt: ts(-22 * day) },
    { id: 'art_ex3', title: 'Velocity transfer partners, ranked by actual value', url: 'https://elitepointsandmiles.com/velocity-transfer-partners-ranked', addedAt: ts(-9 * day) },
  ],
  exemplarNewsletters: [
    { id: 'nl_ex1', title: 'Daily Drop: 90k Qantas bonus + the ANA sweet spot nobody prices correctly', url: 'https://newsletter.elitepointsandmiles.com/p/daily-drop-90k-qantas', addedAt: ts(-6 * day) },
    { id: 'nl_ex2', title: 'This week in points: the quiet devaluation at KrisFlyer', url: 'https://newsletter.elitepointsandmiles.com/p/krisflyer-devaluation', addedAt: ts(-13 * day) },
  ],
  versionHistory: [
    { timestamp: ts(-60 * day), changedBy: EDITOR, summary: 'Initial voice guide distilled from 12 top-performing articles.' },
    { timestamp: ts(-30 * day), changedBy: EDITOR, summary: 'Added AI-writing avoidances after humaniser score review.' },
    { timestamp: ts(-9 * day), changedBy: EDITOR, summary: 'Two new exemplar articles; tightened currency formatting standard.' },
  ],
  updatedAt: ts(-9 * day),
  updatedBy: EDITOR,
};

const aiConfig: AIConfigSettings = {
  tier1: { provider: 'claude', model: 'claude-sonnet-4-5', monthlyTokenUsage: 14_200_000 },
  tier2: { provider: 'gemini-flash', model: 'gemini-2.5-flash', monthlyRequestCount: 38_400 },
  agentAssignments: [
    { agentId: 'ag_draft', agentName: 'Article Drafter', model: 'claude-sonnet-4-5', tier: 1, overrideEnabled: false },
    { agentId: 'ag_card_prose', agentName: 'Card Prose Generator', model: 'claude-sonnet-4-5', tier: 1, overrideEnabled: false },
    { agentId: 'ag_tagger', agentName: 'Card Tagger', model: 'gemini-2.5-flash', tier: 2, overrideEnabled: false },
    { agentId: 'ag_social', agentName: 'Social Caption Writer', model: 'gemini-2.5-flash', tier: 2, overrideEnabled: true },
    { agentId: 'ag_transcribe', agentName: 'Transcript Summariser', model: 'gemini-2.5-flash', tier: 2, overrideEnabled: false },
  ],
  perplexity: { monthlyRequestCount: 1_240 },
  stockPhotoProvider: { provider: 'unsplash' },
  imageGeneration: { tier: 'standard', monthlyBudget: 120, currentSpend: 47.3, warningThreshold: 0.8, disableOnBudgetExceeded: true },
  updatedAt: ts(-15 * day),
  updatedBy: EDITOR,
};

const webflow: WebflowSettings = {
  connectionStatus: 'connected',
  siteName: 'Elite Points & Miles',
  planTier: 'CMS',
  rateLimit: '60 req/min',
  verifiedAt: ts(-3 * day),
  siteMapping: [
    { siteId: 'site_epm', siteName: 'Elite Points & Miles', domain: 'elitepointsandmiles.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f501', connectionStatus: 'connected' },
    { siteId: 'site_cc', siteName: 'CardCurious', domain: 'cardcurious.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f502', connectionStatus: 'connected' },
    { siteId: 'site_jf', siteName: 'Jetset Funnel', domain: 'jetsetfunnel.com', webflowSiteId: '66a1f2c9e4b0a1d2c3e4f503', connectionStatus: 'disconnected' },
  ],
  publishingDefaults: {
    defaultStatus: 'draft',
    autoSubmitToGSC: true,
    postPublishVerification: true,
    verificationDelaySeconds: 45,
  },
  cmsFieldMappings: [
    {
      collectionName: 'Articles',
      firestoreCollection: 'articles',
      itemCount: 312,
      pendingItems: 4,
      lastSyncTime: ts(-1 * day),
      mappings: [
        { firestoreField: 'title', webflowField: 'name', type: 'plain_text', syncDirection: 'push' },
        { firestoreField: 'slug', webflowField: 'slug', type: 'plain_text', syncDirection: 'push' },
        { firestoreField: 'prose', webflowField: 'post-body', type: 'rich_text', syncDirection: 'push' },
        { firestoreField: 'targetKeyword', webflowField: 'target-keyword', type: 'plain_text', syncDirection: 'bidirectional' },
      ],
    },
    {
      collectionName: 'Cards',
      firestoreCollection: 'card_data',
      itemCount: 128,
      pendingItems: 2,
      lastSyncTime: ts(-2 * day),
      mappings: [
        { firestoreField: 'cardName', webflowField: 'name', type: 'plain_text', syncDirection: 'push' },
        { firestoreField: 'annualFee', webflowField: 'annual-fee', type: 'number', syncDirection: 'push' },
        { firestoreField: 'signupBonus', webflowField: 'signup-bonus', type: 'rich_text', syncDirection: 'push' },
      ],
    },
    {
      collectionName: 'Authors',
      firestoreCollection: 'users',
      itemCount: 9,
      pendingItems: 0,
      lastSyncTime: ts(-5 * day),
      mappings: [
        { firestoreField: 'authorProfile.displayName', webflowField: 'name', type: 'plain_text', syncDirection: 'push' },
        { firestoreField: 'authorProfile.bio', webflowField: 'bio', type: 'rich_text', syncDirection: 'push' },
      ],
    },
  ],
  updatedAt: ts(-3 * day),
  updatedBy: EDITOR,
};

const beehiiv: BeehiivSettings = {
  connectionStatus: 'connected',
  publicationId: 'pub_4f2a9c1e-77d3-4e1a-9b2c-1a2b3c4d5e6f',
  planTier: 'Scale',
  subscriberCount: 18_432,
  newsletterConfig: {
    defaultSendTime: '06:00',
    defaultSenderName: 'Elite Travel Hackers',
    defaultReplyTo: 'crew@elitetravelhackers.com',
    footer: 'You\'re receiving this because you subscribed at elitepointsandmiles.com. Unsubscribe anytime.',
  },
  subscriberSync: {
    frequency: 'hourly',
    webhookUrl: 'https://api.elitetravelhackers.com/hooks/beehiiv',
    webhookSecret: 'whsec_••••••••••••3f9a',
    events: { newSubscriber: true, unsubscribe: true, emailOpen: false, emailClick: false, referral: true, tagChange: true },
    lastSyncTime: ts(-2 * 36e5),
  },
  abTestDefaults: { subjectLineVariants: 2, splitPercentage: 20, winningMetric: 'open_rate', testDurationHours: 4 },
  deliverability: {
    sendingDomainVerified: true,
    spfStatus: 'pass',
    dkimStatus: 'pass',
    dmarcStatus: 'pass',
    canSpamCompliant: true,
    gdpr: { doubleOptIn: true, dataDeletionEndpoint: 'https://api.elitetravelhackers.com/gdpr/delete', consentTracking: true },
  },
  customFields: [
    { id: 'cf1', name: 'home_airport', type: 'string', subscribersWithValue: 11_204, createdAt: ts(-210 * day) },
    { id: 'cf2', name: 'primary_program', type: 'string', subscribersWithValue: 9_870, createdAt: ts(-210 * day) },
    { id: 'cf3', name: 'signup_source', type: 'string', subscribersWithValue: 18_432, createdAt: ts(-400 * day) },
  ],
  webhooks: [
    { id: 'wh1', eventType: 'subscription.created', url: 'https://api.elitetravelhackers.com/hooks/beehiiv', status: 'active', lastTriggered: ts(-2 * 36e5) },
    { id: 'wh2', eventType: 'subscription.deleted', url: 'https://api.elitetravelhackers.com/hooks/beehiiv', status: 'active', lastTriggered: ts(-1 * day) },
    { id: 'wh3', eventType: 'post.sent', url: 'https://api.elitetravelhackers.com/hooks/beehiiv-analytics', status: 'inactive', lastTriggered: null },
  ],
  updatedAt: ts(-4 * day),
  updatedBy: EDITOR,
};

const cmsSync: CMSSyncSettings = {
  collections: [
    { firestoreName: 'articles', firestoreItemCount: 312, webflowCollection: 'Articles', status: 'in_sync', lastSynced: ts(-36e5), pendingCount: 2, failedCount: 0 },
    { firestoreName: 'card_data', firestoreItemCount: 128, webflowCollection: 'Cards', status: 'pending', lastSynced: ts(-2 * day), pendingCount: 5, failedCount: 1 },
    { firestoreName: 'users', firestoreItemCount: 9, webflowCollection: 'Authors', status: 'in_sync', lastSynced: ts(-5 * day), pendingCount: 0, failedCount: 0 },
    { firestoreName: 'transfer_partners', firestoreItemCount: 46, webflowCollection: 'Transfer Partners', status: 'in_sync', lastSynced: ts(-3 * day), pendingCount: 0, failedCount: 0 },
    { firestoreName: 'offers', firestoreItemCount: 210, webflowCollection: 'Offers', status: 'error', lastSynced: ts(-6 * day), pendingCount: 3, failedCount: 4 },
    { firestoreName: 'guides', firestoreItemCount: 58, webflowCollection: 'Guides', status: 'in_sync', lastSynced: ts(-12 * 36e5), pendingCount: 0, failedCount: 0 },
  ],
  syncQueue: [
    { id: 'sq1', title: 'Velocity transfer partners, ranked by actual value', collection: 'Articles', queuedAt: ts(-36e5), status: 'syncing' },
    { id: 'sq2', title: 'Amex Platinum Edge (2026 refresh)', collection: 'Cards', queuedAt: ts(-30e5), status: 'queued' },
    { id: 'sq3', title: 'October Daily Drop roundup', collection: 'Articles', queuedAt: ts(-18e5), status: 'queued' },
  ],
  errorLog: [
    { id: 'se1', timestamp: ts(-6 * day), collection: 'Offers', title: '90k Qantas offer embed', errorType: 'webflow_rate_limit', message: 'Webflow 429 — retry budget exhausted after 5 attempts.', status: 'retried' },
    { id: 'se2', timestamp: ts(-6 * day), collection: 'Offers', title: 'Velocity 40% transfer bonus', errorType: 'webflow_rate_limit', message: 'Webflow 429 — retry budget exhausted after 5 attempts.', status: 'resolved' },
    { id: 'se3', timestamp: ts(-2 * day), collection: 'Cards', title: 'Westpac Altitude Black', errorType: 'validation', message: 'annual-fee failed Webflow number validation (string "395.00").', status: 'failed' },
  ],
  updatedAt: ts(-36e5),
  updatedBy: 'system',
};

const slack: SlackSettings = {
  connected: true,
  workspaceName: 'Elite Travel Hackers',
  connectedBy: EDITOR,
  connectedAt: ts(-320 * day),
  oauthScopes: ['chat:write', 'channels:read', 'incoming-webhook'],
  channels: [
    { id: 'C01OPS', name: '#ops-alerts', description: 'Pipeline failures, scraper errors, sync problems', events: ['pipeline.error', 'scraper.error', 'sync.failed'], enabled: true },
    { id: 'C02PUB', name: '#published', description: 'Every article that goes live', events: ['article.published'], enabled: true },
    { id: 'C03DD', name: '#daily-drop', description: 'Daily Drop picks and newsletter status', events: ['newsletter.sent', 'offers.new'], enabled: true },
    { id: 'C04SEO', name: '#seo-wins', description: 'Rank movements and GSC anomalies', events: ['seo.rank_change'], enabled: false },
  ],
  dailyDigest: { channelId: 'C03DD', sendTime: '07:30', contentChecks: ['articles_published', 'scraper_health', 'api_spend'] },
  customAlerts: [
    { id: 'ca1', name: 'API spend over 80%', triggerType: 'threshold', condition: 'api_spend / monthly_budget > 0.8', channelId: 'C01OPS', priority: 'high', active: true },
    { id: 'ca2', name: 'Scraper success below 90%', triggerType: 'threshold', condition: 'scraper_success_7d < 0.9', channelId: 'C01OPS', priority: 'medium', active: true },
    { id: 'ca3', name: 'Weekly publish recap', triggerType: 'schedule', condition: 'cron(0 16 * * 5)', channelId: 'C02PUB', priority: 'low', active: true },
  ],
  formatting: { messageFormat: 'rich', includeDashboardLinks: true },
  updatedAt: ts(-20 * day),
  updatedBy: EDITOR,
};

const seoApi: SeoApiSettings = {
  provider: 'dataforseo',
  connectionStatus: 'connected',
  accountBalance: 212.44,
  dailyRequestBudget: 2_000,
  priorityAllocation: [
    { module: 'Keyword Intelligence', percentage: 45 },
    { module: 'SERP Tracking', percentage: 30 },
    { module: 'Backlinks', percentage: 15 },
    { module: 'LLM Citations', percentage: 10 },
  ],
  googleSearchConsole: {
    connected: true,
    syncFrequency: 'daily',
    dataScope: { indexingStatus: true, searchPerformance: true, coreWebVitals: true },
    urlInspectionQuota: 200,
    lastSyncTime: ts(-8 * 36e5),
  },
  googleAnalytics4: { connected: true, trafficSyncFrequency: 'hourly', engagementSyncFrequency: 'daily', lastSyncTime: ts(-36e5) },
  googleAds: { connected: false, syncFrequency: 'daily' },
  dataForSeoCapabilities: {
    planBadge: 'Standard',
    rateLimits: '2,000 req/min',
    modules: [
      { name: 'SERP API', enabled: true, monthlyUsage: 18_400, cost: 96.2, budgetRemaining: 53.8 },
      { name: 'Labs API', enabled: true, monthlyUsage: 6_120, cost: 61.4, budgetRemaining: 28.6 },
      { name: 'Backlinks API', enabled: true, monthlyUsage: 2_030, cost: 30.1, budgetRemaining: 19.9 },
      { name: 'AI Optimization API', enabled: true, monthlyUsage: 940, cost: 18.7, budgetRemaining: 11.3 },
    ],
  },
  redirects: [
    { id: 'rd1', oldUrl: '/blog/amex-platinum-edge-review', newUrl: '/amex-platinum-edge-review-2026', type: '301', createdAt: ts(-90 * day), createdBy: EDITOR },
    { id: 'rd2', oldUrl: '/deals/qantas-90k', newUrl: '/qantas-90k-signup-bonus', type: '301', createdAt: ts(-45 * day), createdBy: EDITOR },
  ],
  updatedAt: ts(-1 * day),
  updatedBy: EDITOR,
};

const socialAccounts: SocialAccountsSettings = {
  zernioProfileId: '6a8e826062a0261c65dbf696',
  accounts: [
    {
      platform: 'instagram', connected: true, accountName: '@elitepointsandmiles', brand: 'EPM',
      connectedAt: ts(-120 * day), zernioAccountId: 'za_ig_epm',
      zernioProfileUrl: 'https://instagram.com/elitepointsandmiles',
      zernioProfilePicture: 'https://picsum.photos/seed/ig-epm/96/96',
      lastImportStatus: { at: ts(-20 * 36e5), trigger: 'scheduled', imported: 3, skipped: 1, errors: [], status: 'completed' },
    },
    {
      platform: 'tiktok', connected: true, accountName: '@elitepointsandmiles', brand: 'EPM',
      connectedAt: ts(-118 * day), zernioAccountId: 'za_tt_epm',
      zernioProfileUrl: 'https://tiktok.com/@elitepointsandmiles',
      zernioProfilePicture: 'https://picsum.photos/seed/tt-epm/96/96',
      lastImportStatus: { at: ts(-20 * 36e5), trigger: 'scheduled', imported: 5, skipped: 0, errors: [], status: 'completed' },
    },
    {
      platform: 'youtube', connected: true, accountName: 'Elite Travel Hackers', brand: 'EPM',
      connectedAt: ts(-115 * day), zernioAccountId: 'za_yt_epm', channelId: 'UC4xK2m9eXAMPLE01',
      zernioProfileUrl: 'https://youtube.com/@elitetravelhackers',
      zernioProfilePicture: 'https://picsum.photos/seed/yt-epm/96/96',
      lastImportStatus: { at: ts(-44 * 36e5), trigger: 'backfill', imported: 12, skipped: 2, errors: ['1 video unavailable (private)'], status: 'completed' },
    },
    {
      platform: 'twitter', connected: true, accountName: '@elitetravelhack', brand: 'EPM',
      connectedAt: ts(-110 * day), zernioAccountId: 'za_tw_epm', needsReconnection: true,
      zernioProfileUrl: 'https://x.com/elitetravelhack',
      zernioProfilePicture: 'https://picsum.photos/seed/tw-epm/96/96',
      lastImportStatus: null,
    },
    {
      platform: 'facebook', connected: true, accountName: 'Elite Travel Hackers', brand: 'EPM',
      connectedAt: ts(-100 * day), zernioAccountId: 'za_fb_epm',
      zernioProfileUrl: 'https://facebook.com/elitetravelhackers',
      zernioProfilePicture: 'https://picsum.photos/seed/fb-epm/96/96',
      lastImportStatus: { at: ts(-68 * 36e5), trigger: 'scheduled', imported: 2, skipped: 4, errors: [], status: 'completed' },
    },
    { platform: 'linkedin', connected: false, accountName: null, connectedAt: null, brand: 'EPM' },
    { platform: 'pinterest', connected: false, accountName: null, connectedAt: null, brand: 'EPM' },
  ],
  updatedAt: ts(-20 * 36e5),
  updatedBy: 'system',
};

const adPlatforms: AdPlatformsSettings = {
  platforms: [
    { platform: 'google_ads', connected: false, accountName: null, connectedAt: null },
    { platform: 'meta_ads', connected: true, accountName: 'ETH Growth (act_77410293)', connectedAt: ts(-200 * day) },
    { platform: 'microsoft_ads', connected: false, accountName: null, connectedAt: null },
  ],
  updatedAt: ts(-60 * day),
  updatedBy: EDITOR,
};

const contentRules: ContentRulesSettings = {
  taxonomy: [
    {
      id: 'cat_points', name: 'Points & Miles', articleCount: 84,
      subcategories: [
        { id: 'sub_qantas', name: 'Qantas Frequent Flyer', articleCount: 31 },
        { id: 'sub_velocity', name: 'Velocity', articleCount: 27 },
        { id: 'sub_krisflyer', name: 'KrisFlyer', articleCount: 14 },
        { id: 'sub_amex_mr', name: 'Amex Membership Rewards', articleCount: 12 },
      ],
    },
    {
      id: 'cat_cards', name: 'Credit Cards', articleCount: 96,
      subcategories: [
        { id: 'sub_reviews', name: 'Card Reviews', articleCount: 52 },
        { id: 'sub_comparisons', name: 'Comparisons', articleCount: 24 },
        { id: 'sub_signup', name: 'Signup Bonuses', articleCount: 20 },
      ],
    },
    {
      id: 'cat_lounges', name: 'Lounges & Status', articleCount: 33,
      subcategories: [
        { id: 'sub_lounge_reviews', name: 'Lounge Reviews', articleCount: 21 },
        { id: 'sub_status', name: 'Status Runs & Matches', articleCount: 12 },
      ],
    },
    {
      id: 'cat_deals', name: 'Deal Alerts', articleCount: 61,
      subcategories: [
        { id: 'sub_flight_deals', name: 'Flight Deals', articleCount: 44 },
        { id: 'sub_hotel_deals', name: 'Hotel Deals', articleCount: 17 },
      ],
    },
  ],
  freeformTags: [
    { id: 'tag1', name: 'sweet-spot', usageCount: 38 },
    { id: 'tag2', name: 'transfer-bonus', usageCount: 22 },
    { id: 'tag3', name: 'devaluation', usageCount: 9 },
    { id: 'tag4', name: 'beginner', usageCount: 17 },
  ],
  consistencyEnforcement: true,
  articleTemplates: [
    { id: 'tpl1', name: 'Card Review', targetLength: 1800, schemaType: 'Review', articlesUsing: 52 },
    { id: 'tpl2', name: 'Deal Alert', targetLength: 600, schemaType: 'Article', articlesUsing: 44 },
    { id: 'tpl3', name: 'Program Guide', targetLength: 2600, schemaType: 'Article', articlesUsing: 18 },
    { id: 'tpl4', name: 'News Analysis', targetLength: 900, schemaType: 'NewsArticle', articlesUsing: 26 },
  ],
  expirationRules: {
    promotionExpiration: true,
    dealAlertExpiration: true,
    sunsetPolicy: { monthsThreshold: 18, action: 'flag_for_review' },
  },
  canonicalUrlRules: { defaultBehavior: 'self_referencing', autoDetection: true },
  updatedAt: ts(-11 * day),
  updatedBy: EDITOR,
};

const compliance: ComplianceSettings = {
  ftcDisclosure: {
    text: 'Some links on this page are affiliate links. If you apply and are approved, we may receive a commission at no extra cost to you. Our recommendations are editorially independent — banks never see a review before you do.',
    position: 'before_first_affiliate_link',
    style: 'standard_box',
    autoInsert: true,
  },
  disclaimers: [
    { id: 'dc1', name: 'Card terms change', triggerCondition: 'article mentions a signup bonus', text: 'Offers and signup bonuses change frequently. Verify current terms on the issuer\'s site before applying.', active: true },
    { id: 'dc2', name: 'Not financial advice', triggerCondition: 'article category is Credit Cards', text: 'This content is general information only and does not take your objectives, financial situation or needs into account. Consider whether it is appropriate for you.', active: true },
    { id: 'dc3', name: 'Points valuation', triggerCondition: 'article states a cents-per-point value', text: 'Point valuations are estimates based on typical redemption value, not a guaranteed cash equivalent.', active: true },
  ],
  financialAdviceGuardrails: [
    'Never recommend a specific card as suitable for an individual reader.',
    'Never suggest carrying a balance to earn points.',
    'Always note that credit approval is subject to the issuer\'s criteria.',
    'Annual fee and interest rate must appear wherever a signup bonus is quantified.',
  ],
  cardTermsVerification: {
    realTimeVerification: true,
    verificationFields: ['annualFee', 'signupBonus', 'purchaseRate', 'minSpend'],
    haltBehavior: 'halt_alert_and_flag',
  },
  auditSettings: { retentionPeriod: '3_years', autoComplianceReport: true },
  updatedAt: ts(-25 * day),
  updatedBy: EDITOR,
};

const complianceRules: ComplianceRulesSettings = {
  rulesText: DEFAULT_COMPLIANCE_RULES,
  updatedAt: ts(-25 * day),
  updatedBy: EDITOR,
};

const notifications: NotificationsSettings = {
  defaults: [
    { id: 'nt1', event: 'Article published', category: 'Pipeline', slack: true, dashboard: true, email: false, push: false, priority: 'medium' },
    { id: 'nt2', event: 'Pipeline stage failed', category: 'Pipeline', slack: true, dashboard: true, email: true, push: false, priority: 'high' },
    { id: 'nt3', event: 'Scraper run completed', category: 'Scraper', slack: false, dashboard: true, email: false, push: false, priority: 'low' },
    { id: 'nt4', event: 'Scraper error (high severity)', category: 'Scraper', slack: true, dashboard: true, email: true, push: true, priority: 'high' },
    { id: 'nt5', event: 'Newsletter sent', category: 'Newsletter', slack: true, dashboard: true, email: false, push: false, priority: 'medium' },
    { id: 'nt6', event: 'API budget threshold crossed', category: 'Billing', slack: true, dashboard: true, email: true, push: true, priority: 'high' },
    { id: 'nt7', event: 'New comment / review task', category: 'Tasks', slack: false, dashboard: true, email: false, push: true, priority: 'medium' },
    { id: 'nt8', event: 'Keyword entered page 1', category: 'SEO', slack: true, dashboard: true, email: false, push: false, priority: 'low' },
  ],
  quietHours: { enabled: true, startTime: '21:00', endTime: '07:00', timezone: 'Australia/Sydney', weekendQuietHours: false },
  digestPreferences: { dashboardDigest: 'realtime', emailDigest: 'daily' },
  updatedAt: ts(-8 * day),
  updatedBy: EDITOR,
};

const apiUsage: ApiUsageSettings = {
  monthlyBudget: 800,
  currentSpend: 482.17,
  projectedSpend: 731.5,
  daysRemaining: 19,
  services: [
    { name: 'Claude (Anthropic)', thisMonth: 214.6, lastMonth: 248.9, changePercent: -13.8, dailyAvg: 17.88, usageMetric: '14.2M tokens', budget: 350, dailyCosts: [] },
    { name: 'DataForSEO', thisMonth: 206.4, lastMonth: 188.2, changePercent: 9.7, dailyAvg: 17.2, usageMetric: '27.5k requests', budget: 260, dailyCosts: [] },
    { name: 'OpenAI (images)', thisMonth: 47.3, lastMonth: 52.1, changePercent: -9.2, dailyAvg: 3.94, usageMetric: '412 images', budget: 120, dailyCosts: [] },
    { name: 'Perplexity', thisMonth: 9.2, lastMonth: 11.4, changePercent: -19.3, dailyAvg: 0.77, usageMetric: '1,240 requests', budget: 40, dailyCosts: [] },
    { name: 'Deepgram', thisMonth: 4.67, lastMonth: 6.02, changePercent: -22.4, dailyAvg: 0.39, usageMetric: '9.6 hrs audio', budget: 30, dailyCosts: [] },
  ],
  alerts: { thresholdPercentages: [50, 80, 95], autoThrottleAt90: true },
  costAnomalyDetection: true,
  optimizationRecommendations: [
    'Route the card tagger to Gemini Flash for all runs (currently 20% still on Tier 1) — est. saving $31/mo.',
    'DataForSEO Labs: cache keyword-overview responses for 30 days — est. saving $18/mo.',
    'Image generation: drop DALL-E usage for thumbnails in favour of stock — est. saving $22/mo.',
  ],
  updatedAt: ts(-12 * 36e5),
  updatedBy: 'system',
};

// Fill dailyCosts for the last 14 days deterministically.
apiUsage.services.forEach((svc, i) => {
  svc.dailyCosts = Array.from({ length: 14 }, (_, d) => ({
    date: iso(-(13 - d) * day),
    cost: Math.round((svc.dailyAvg * (0.72 + (((d * 7 + i * 3) % 11) / 18))) * 100) / 100,
  }));
});

const kpiTargets: KPITargetsSettings = {
  publishing: { weeklyArticleTarget: 12, monthlyArticleTarget: 50, avgQualityScoreTarget: 85 },
  trafficSeo: { weeklyOrganicTraffic: 42_000, keywordsOnPage1: 180, domainRating: 58 },
  newsletter: { subscriberMonthlyGrowth: 900, openRate: 44, clickRate: 6.5 },
  operational: { articlesNeedingRefresh: 25, pipelineBottleneck: 2 },
  budget: { monthlyApiBudget: 800 },
  changeHistory: [
    { timestamp: ts(-90 * day), field: 'publishing.monthlyArticleTarget', oldValue: 40, newValue: 50, changedBy: EDITOR },
    { timestamp: ts(-45 * day), field: 'trafficSeo.keywordsOnPage1', oldValue: 150, newValue: 180, changedBy: EDITOR },
    { timestamp: ts(-12 * day), field: 'budget.monthlyApiBudget', oldValue: 700, newValue: 800, changedBy: EDITOR },
  ],
  updatedAt: ts(-12 * day),
  updatedBy: EDITOR,
};

const competitorsRss: CompetitorsRSSSettings = {
  competitors: [
    { id: 'cmp1', domain: 'thepointsguy.com', name: 'The Points Guy', metadata: { region: 'US', dr: '84' } },
    { id: 'cmp2', domain: 'onemileatatime.com', name: 'One Mile at a Time', metadata: { region: 'US', dr: '76' } },
    { id: 'cmp3', domain: 'pointhacks.com.au', name: 'Point Hacks', metadata: { region: 'AU', dr: '62' } },
    { id: 'cmp4', domain: 'australianfrequentflyer.com.au', name: 'Australian Frequent Flyer', metadata: { region: 'AU', dr: '58' } },
    { id: 'cmp5', domain: 'headforpoints.com', name: 'Head for Points', metadata: { region: 'UK', dr: '66' } },
  ],
  rssFeeds: [
    { id: 'rss1', url: 'https://thepointsguy.com/feed/', name: 'The Points Guy', status: 'active' },
    { id: 'rss2', url: 'https://onemileatatime.com/feed/', name: 'One Mile at a Time', status: 'active' },
    { id: 'rss3', url: 'https://www.pointhacks.com.au/feed/', name: 'Point Hacks', status: 'active' },
    { id: 'rss4', url: 'https://www.australianfrequentflyer.com.au/feed/', name: 'Australian Frequent Flyer', status: 'active' },
    { id: 'rss5', url: 'https://www.headforpoints.com/feed/', name: 'Head for Points', status: 'paused' },
    { id: 'rss6', url: 'https://frequentmiler.com/feed/', name: 'Frequent Miler', status: 'error' },
  ],
  newsletterMonitoring: [
    { id: 'nlm1', name: 'Daily Drop (US)', email: 'subscribe@dailydrop.com', status: 'active' },
    { id: 'nlm2', name: 'Point Hacks Weekly', email: 'weekly@pointhacks.com.au', status: 'active' },
    { id: 'nlm3', name: 'Frequent Miler Daily', email: 'daily@frequentmiler.com', status: 'paused' },
  ],
  updatedAt: ts(-7 * day),
  updatedBy: EDITOR,
};

const scraper: ScraperSettings = {
  platformStatus: 'online',
  cardsMonitored: 128,
  successRate7Day: 0.94,
  avgScrapeTime: 42,
  schedules: [
    { cardId: 'card_amex_pe', cardName: 'Amex Platinum Edge', issuer: 'American Express', frequency: 'daily', lastScraped: ts(-5 * 36e5), lastChanged: ts(-21 * day), status: 'active', enabled: true },
    { cardId: 'card_westpac_ab', cardName: 'Westpac Altitude Black', issuer: 'Westpac', frequency: 'daily', lastScraped: ts(-5 * 36e5), lastChanged: ts(-2 * day), status: 'active', enabled: true },
    { cardId: 'card_anz_ffb', cardName: 'ANZ Frequent Flyer Black', issuer: 'ANZ', frequency: 'weekly', lastScraped: ts(-3 * day), lastChanged: ts(-35 * day), status: 'active', enabled: true },
    { cardId: 'card_cba_ult', cardName: 'CommBank Ultimate Awards', issuer: 'CommBank', frequency: 'weekly', lastScraped: ts(-4 * day), lastChanged: null, status: 'paused', enabled: false },
    { cardId: 'card_nab_qantas', cardName: 'NAB Qantas Rewards Signature', issuer: 'NAB', frequency: 'daily', lastScraped: ts(-6 * 36e5), lastChanged: ts(-8 * day), status: 'running', enabled: true },
    { cardId: 'card_virgin_hvf', cardName: 'Virgin Australia Velocity High Flyer', issuer: 'Virgin Money', frequency: 'biweekly', lastScraped: ts(-9 * day), lastChanged: ts(-60 * day), status: 'active', enabled: true },
  ],
  platform: {
    selected: 'tinyfish',
    tinyfish: { stepsRemaining: 8_240, goalTemplate: 'Extract card name, annual fee, signup bonus, purchase rate, and min-spend requirement from {{url}}', stealthMode: true },
    firecrawl: { creditsRemaining: 12_400 },
    apify: { computeUnits: 310, actorId: 'apify/web-scraper', memoryMb: 4096 },
  },
  defaultRunOptions: { timeoutSeconds: 120, creditsBudgetPerRun: 25 },
  recentRuns: [
    { id: 'run1', startedAt: ts(-5 * 36e5), duration: 388, cardsScraped: 42, changesDetected: 2, status: 'success', cost: 4.1 },
    { id: 'run2', startedAt: ts(-29 * 36e5), duration: 402, cardsScraped: 42, changesDetected: 0, status: 'success', cost: 4.2 },
    { id: 'run3', startedAt: ts(-53 * 36e5), duration: 417, cardsScraped: 41, changesDetected: 5, status: 'partial', cost: 4.3 },
    { id: 'run4', startedAt: ts(-77 * 36e5), duration: 295, cardsScraped: 42, changesDetected: 1, status: 'success', cost: 3.9 },
    { id: 'run5', startedAt: ts(-101 * 36e5), duration: 88, cardsScraped: 9, changesDetected: 0, status: 'failed', cost: 1.2 },
  ],
  rateSensitiveTriggers: {
    autoScrapeOnFedRate: true,
    upcomingFedDates: [
      { date: iso(14 * day), countdown: 14 },
      { date: iso(56 * day), countdown: 56 },
    ],
  },
  errorLog: [
    { id: 'serr1', cardName: 'NAB Qantas Rewards Signature', message: 'Timeout after 120s on signup-bonus step', severity: 'medium', timestamp: ts(-53 * 36e5), retryInfo: 'Auto-retried 2/3 — succeeded on retry 3' },
    { id: 'serr2', cardName: 'CommBank Ultimate Awards', message: 'Selector .annual-fee not found (page redesign)', severity: 'high', timestamp: ts(-4 * day), retryInfo: 'Paused — awaiting goal template update' },
    { id: 'serr3', cardName: 'Westpac Altitude Black', message: 'Rate limited by origin (HTTP 429)', severity: 'low', timestamp: ts(-6 * day), retryInfo: 'Backed off 15 min — recovered' },
  ],
  updatedAt: ts(-5 * 36e5),
  updatedBy: 'system',
};

const dataExport: DataExportSettings = {
  exportHistory: [
    { id: 'ex1', date: ts(-3 * day), type: 'articles', format: 'json', size: '18.4 MB', downloadUrl: null },
    { id: 'ex2', date: ts(-17 * day), type: 'full_archive', format: 'json', size: '412 MB', downloadUrl: null },
    { id: 'ex3', date: ts(-31 * day), type: 'analytics', format: 'csv', size: '2.1 MB', downloadUrl: null },
    { id: 'ex4', date: ts(-58 * day), type: 'card_data', format: 'csv', size: '890 KB', downloadUrl: null },
  ],
  updatedAt: ts(-3 * day),
  updatedBy: EDITOR,
};

const trafficMarket: TrafficMarketSettings = {
  useSampleData: false,
  updatedAt: ts(-14 * day),
  updatedBy: EDITOR,
};

// ─── Seed: audit log ────────────────────────────────────────────────────────

const AUDIT_USERS = [
  { userId: 'u_daynis', userEmail: EDITOR, userName: 'Daynis Olman' },
  { userId: 'u_editor1', userEmail: 'sarah@elitetravelhackers.com', userName: 'Sarah Chen' },
  { userId: 'u_writer1', userEmail: 'marcus@elitetravelhackers.com', userName: 'Marcus Webb' },
];

const AUDIT_SEED: { hoursAgo: number; user: number; actionType: string; targetEntity: string; settingArea: string | null; details: Record<string, unknown>; changedFields: string[] }[] = [
  { hoursAgo: 2, user: 0, actionType: 'settings.update', targetEntity: 'settings/seoApi', settingArea: 'seoApi', details: { summary: 'Adjusted DataForSEO priority allocation' }, changedFields: ['priorityAllocation'] },
  { hoursAgo: 6, user: 1, actionType: 'article.publish', targetEntity: 'articles/art_velocity_ranked', settingArea: null, details: { title: 'Velocity transfer partners, ranked by actual value' }, changedFields: ['status'] },
  { hoursAgo: 9, user: 0, actionType: 'settings.update', targetEntity: 'settings/kpiTargets', settingArea: 'kpiTargets', details: { summary: 'Raised monthly API budget 700 → 800' }, changedFields: ['budget.monthlyApiBudget'] },
  { hoursAgo: 14, user: 2, actionType: 'article.update', targetEntity: 'articles/art_sq_sweet_spot', settingArea: null, details: { title: 'The 1.8c Singapore Airlines redemption' }, changedFields: ['prose', 'targetKeyword'] },
  { hoursAgo: 20, user: 1, actionType: 'settings.update', targetEntity: 'settings/brandVoice', settingArea: 'brandVoice', details: { summary: 'Added exemplar article; tightened currency standard' }, changedFields: ['exemplarArticles', 'formattingStandards'] },
  { hoursAgo: 26, user: 0, actionType: 'secret.rotate', targetEntity: 'secrets/TINYFISH_API_KEY', settingArea: 'credentials', details: { secretName: 'TINYFISH_API_KEY', appliedImmediately: true }, changedFields: [] },
  { hoursAgo: 31, user: 1, actionType: 'newsletter.send', targetEntity: 'newsletter-editions/nl_daily_1012', settingArea: null, details: { subject: 'Daily Drop: Velocity 40% transfer bonus' }, changedFields: ['status'] },
  { hoursAgo: 40, user: 0, actionType: 'settings.update', targetEntity: 'settings/notifications', settingArea: 'notifications', details: { summary: 'Enabled quiet hours 21:00–07:00' }, changedFields: ['quietHours.enabled'] },
  { hoursAgo: 49, user: 2, actionType: 'card.update', targetEntity: 'card_data/card_westpac_ab', settingArea: null, details: { cardName: 'Westpac Altitude Black' }, changedFields: ['signupBonus_scraped'] },
  { hoursAgo: 55, user: 0, actionType: 'settings.update', targetEntity: 'settings/scraper', settingArea: 'scraper', details: { summary: 'Paused CommBank Ultimate Awards schedule' }, changedFields: ['schedules'] },
  { hoursAgo: 70, user: 1, actionType: 'user.role_change', targetEntity: 'users/u_writer2', settingArea: 'userManagement', details: { targetUser: 'Priya Nair', from: 'viewer', to: 'writer' }, changedFields: ['role'] },
  { hoursAgo: 78, user: 0, actionType: 'settings.update', targetEntity: 'settings/contentRules', settingArea: 'contentRules', details: { summary: 'Added KrisFlyer subcategory' }, changedFields: ['taxonomy'] },
  { hoursAgo: 96, user: 0, actionType: 'export.create', targetEntity: 'exports/ex1', settingArea: 'dataExport', details: { type: 'articles', format: 'json' }, changedFields: [] },
  { hoursAgo: 110, user: 1, actionType: 'article.publish', targetEntity: 'articles/art_amex_edge_2026', settingArea: null, details: { title: 'Is the Amex Platinum Edge still worth $195 in 2026?' }, changedFields: ['status'] },
  { hoursAgo: 130, user: 0, actionType: 'settings.update', targetEntity: 'settings/slack', settingArea: 'slack', details: { summary: 'Added weekly publish recap alert' }, changedFields: ['customAlerts'] },
  { hoursAgo: 150, user: 0, actionType: 'settings.update', targetEntity: 'settings/humanizerRules', settingArea: 'humanizerRules', details: { summary: 'Added banned stock phrases from StoryScope pass' }, changedFields: ['bannedPhrases'] },
  { hoursAgo: 168, user: 1, actionType: 'settings.update', targetEntity: 'settings/competitorsRss', settingArea: 'competitorsRss', details: { summary: 'Paused Head for Points RSS feed' }, changedFields: ['rssFeeds'] },
  { hoursAgo: 190, user: 0, actionType: 'secret.rotate', targetEntity: 'secrets/ANTHROPIC_API_KEY', settingArea: 'credentials', details: { secretName: 'ANTHROPIC_API_KEY', appliedImmediately: false }, changedFields: [] },
  { hoursAgo: 210, user: 2, actionType: 'card.update', targetEntity: 'card_data/card_anz_ffb', settingArea: null, details: { cardName: 'ANZ Frequent Flyer Black' }, changedFields: ['annualFee_manual'] },
  { hoursAgo: 240, user: 0, actionType: 'settings.update', targetEntity: 'settings/compliance', settingArea: 'compliance', details: { summary: 'Updated FTC disclosure text' }, changedFields: ['ftcDisclosure.text'] },
];

const auditLog: AuditLogEntry[] = AUDIT_SEED.map((s, i) => {
  const u = AUDIT_USERS[s.user];
  return {
    id: `audit_${String(i + 1).padStart(3, '0')}`,
    timestamp: ts(-s.hoursAgo * 36e5),
    userId: u.userId,
    userEmail: u.userEmail,
    userName: u.userName,
    actionType: s.actionType,
    targetEntity: s.targetEntity,
    settingArea: s.settingArea,
    details: s.details,
    changedFields: s.changedFields,
  };
});

// ─── In-memory store ────────────────────────────────────────────────────────

type AnySettingsDoc = Record<string, unknown> & { updatedAt?: Timestamp; updatedBy?: string };

const settingsDocs = new Map<SettingId, AnySettingsDoc>([
  ['general', general as unknown as AnySettingsDoc],
  ['brandVoice', brandVoice as unknown as AnySettingsDoc],
  ['aiConfig', aiConfig as unknown as AnySettingsDoc],
  ['webflow', webflow as unknown as AnySettingsDoc],
  ['beehiiv', beehiiv as unknown as AnySettingsDoc],
  ['cmsSync', cmsSync as unknown as AnySettingsDoc],
  ['slack', slack as unknown as AnySettingsDoc],
  ['seoApi', seoApi as unknown as AnySettingsDoc],
  ['socialAccounts', socialAccounts as unknown as AnySettingsDoc],
  ['adPlatforms', adPlatforms as unknown as AnySettingsDoc],
  ['contentRules', contentRules as unknown as AnySettingsDoc],
  ['compliance', compliance as unknown as AnySettingsDoc],
  ['complianceRules', complianceRules as unknown as AnySettingsDoc],
  ['notifications', notifications as unknown as AnySettingsDoc],
  ['apiUsage', apiUsage as unknown as AnySettingsDoc],
  ['kpiTargets', kpiTargets as unknown as AnySettingsDoc],
  ['competitorsRss', competitorsRss as unknown as AnySettingsDoc],
  ['scraper', scraper as unknown as AnySettingsDoc],
  ['dataExport', dataExport as unknown as AnySettingsDoc],
  ['trafficMarket', trafficMarket as unknown as AnySettingsDoc],
]);

// Rotated secret values — stored masked, keyed by secret name.
// production: Google Secret Manager via the settingsRotateSecret callable.
const secretValues = new Map<string, string>();

const settingsListeners = new Map<SettingId, Set<(data: AnySettingsDoc | null) => void>>();
const auditListeners = new Set<() => void>();

export function getSettingsDoc(settingId: SettingId): AnySettingsDoc | null {
  return settingsDocs.get(settingId) ?? null;
}

export function setSettingsDoc(settingId: SettingId, updates: Record<string, unknown>): string[] {
  const existing = settingsDocs.get(settingId) ?? ({} as AnySettingsDoc);
  const changedFields = Object.keys(updates);
  const next: AnySettingsDoc = {
    ...existing,
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy: EDITOR,
  };
  settingsDocs.set(settingId, next);
  settingsListeners.get(settingId)?.forEach((cb) => cb(next));
  return changedFields;
}

export function onSettingsDoc(settingId: SettingId, cb: (data: AnySettingsDoc | null) => void): () => void {
  let set = settingsListeners.get(settingId);
  if (!set) {
    set = new Set();
    settingsListeners.set(settingId, set);
  }
  set.add(cb);
  return () => set!.delete(cb);
}

export function getAuditLog(): AuditLogEntry[] {
  return [...auditLog].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

export function appendAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  auditLog.unshift({
    ...entry,
    id: `audit_${Date.now().toString(36)}`,
    timestamp: Timestamp.now(),
  });
  auditListeners.forEach((cb) => cb());
}

export function onAuditLogChange(cb: () => void): () => void {
  auditListeners.add(cb);
  return () => auditListeners.delete(cb);
}

export function setSecretValue(name: string, value: string): string {
  secretValues.set(name, value);
  return `projects/elite-travel-hackers/secrets/${name}/versions/${secretValues.size + 3}`;
}

export function getSecretMasked(name: string): string | null {
  const v = secretValues.get(name);
  if (!v) return null;
  const tail = v.slice(-4);
  return `••••••••••••${tail}`;
}
