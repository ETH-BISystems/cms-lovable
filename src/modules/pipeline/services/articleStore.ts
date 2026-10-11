// MOCK-ONLY — central in-memory article store for the pipeline module.
//
// Production backs every one of these collections with Firestore onSnapshot
// listeners (see the original services/firestoreSubscriptions.ts) and mutates
// them exclusively through callable Cloud Functions (articleService.ts keeps
// the production callable names in comments above each mock).
//
// This store exists so every hook in the module (useArticles, useRefreshQueue,
// useArticleTasks, useArticleVersions, useVoiceNotes, the contexts built on
// them, and the ai-final-processing module's queue counts) stays live across
// the session: mutations emit to all subscribers, exactly like onSnapshot.

import type {
  PipelineArticle,
  RefreshQueueItem,
  ArticleTask,
  ArticleVersion,
  ArticleStage,
  CreateArticleInput,
  AddToRefreshQueueInput,
  ManageTasksInput,
  RefreshStatus,
  ResearchBrief,
  ResearchFinding,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Pub/sub core
// ─────────────────────────────────────────────────────────────────────────────

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

function emit(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch (err) {
      console.error('[articleStore] listener error', err);
    }
  });
}

export function subscribeToStore(listener: StoreListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 864e5;
const now = () => Date.now();

function daysAgo(n: number): Date {
  return new Date(now() - n * DAY);
}
function daysAhead(n: number): Date {
  return new Date(now() + n * DAY);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function heroImage(slug: string): string {
  return `https://picsum.photos/seed/${slug}/800/450`;
}

const ASSIGNEES = {
  daynis: { name: 'Daynis Olman', avatar: 'DO' },
  sarah: { name: 'Sarah Mitchell', avatar: 'SM' },
  james: { name: 'James Carter', avatar: 'JC' },
  emma: { name: 'Emma Rodriguez', avatar: 'ER' },
} as const;

function sampleContent(title: string, keyword: string, slug: string): string {
  return [
    `<p>If you are serious about ${keyword}, this guide walks through everything that matters in 2026 — the earning rates, the transfer partners, and the mistakes that cost people thousands of points.</p>`,
    `<h2>Why ${keyword} matters right now</h2>`,
    `<p>Award pricing has shifted across every major program this year. The travellers who win are the ones who understand where the value actually sits — not the headline offer, but the cents-per-point you can realistically extract.</p>`,
    `<figure><img src="${heroImage(slug + '-inline')}" alt="${title}" /><figcaption>${title}</figcaption></figure>`,
    `<h2>The strategy we recommend</h2>`,
    `<p>Start with the flexible currencies. Points that transfer to multiple partners protect you against any single program devaluing, and they let you pounce when award space opens. We break down the exact transfer ratios and booking windows below.</p>`,
    `<h2>Common mistakes to avoid</h2>`,
    `<p>Do not transfer points speculatively. Confirm award availability first, understand the cancellation rules, and always compare the cash price before you burn a balance you spent months building.</p>`,
  ].join('');
}

function researchBriefFor(keyword: string, approved: boolean): PipelineArticle['researchBrief'] {
  const findings: ResearchFinding[] = [
    { id: 'f1', category: 'Earning Rates', text: `${keyword}: top cards earn 3–5x on the primary category, but caps apply after $1,500/quarter on rotating offers.`, confidence: 'verified', source: 'https://www.thepointsguy.com/research', selected: true },
    { id: 'f2', category: 'Transfer Partners', text: 'Three of the five strongest partners devalued between 8–15% in the last 18 months; flexibility matters more than headline ratios.', confidence: 'verified', source: 'https://onemileatatime.com/analysis', selected: true },
    { id: 'f3', category: 'Award Availability', text: 'Premium cabin space to Australia opens 330–355 days out and is typically gone within 72 hours of release.', confidence: 'likely', source: 'https://www.australianfrequentflyer.com.au', selected: true },
    { id: 'f4', category: 'Reader Intent', text: 'Searches skew 70% informational / 30% transactional — the article should lead with education and convert via comparison tables.', confidence: 'needs_verification', selected: false },
  ];
  return {
    id: `brief-${slugify(keyword)}`,
    findings,
    selectedFindings: findings.filter((f) => f.selected).map((f) => f.id),
    findingNotes: { f1: 'Double-check the quarterly cap figure against issuer terms.' },
    citations: [
      'https://www.thepointsguy.com/research',
      'https://onemileatatime.com/analysis',
      'https://www.australianfrequentflyer.com.au',
    ],
    approvalStatus: approved ? 'approved' : 'draft',
    lockedAt: approved ? daysAgo(3) : null,
    approvedBy: approved ? 'Sarah Mitchell' : null,
    generatedAt: daysAgo(4),
    keyword,
  };
}

function seoResearchFor(keyword: string): PipelineArticle['seoResearch'] {
  return {
    keyword,
    metrics: { searchVolume: 4400, keywordDifficulty: 38, cpc: 1.85, competition: 0.42 },
    serp: [
      { position: 1, title: `${keyword} — The Points Guy`, url: 'https://www.thepointsguy.com/guide', domain: 'thepointsguy.com', estimatedWordCount: 3200 },
      { position: 2, title: `Best ${keyword} strategies`, url: 'https://onemileatatime.com/guide', domain: 'onemileatatime.com', estimatedWordCount: 2800 },
      { position: 3, title: `${keyword} explained`, url: 'https://www.nerdwallet.com/article', domain: 'nerdwallet.com', estimatedWordCount: 2400 },
    ],
    featuredSnippet: { type: 'list', currentHolder: 'thepointsguy.com', opportunity: true },
    peopleAlsoAsk: [
      `Is ${keyword} worth it in 2026?`,
      `How long does ${keyword} take?`,
      `What is the best card for ${keyword}?`,
    ],
    recommendedStructure: {
      suggestedH1: `${keyword}: The Complete 2026 Guide`,
      suggestedH2s: ['Why it matters', 'Step-by-step strategy', 'Common mistakes', 'FAQ'],
      targetWordCount: 2600,
    },
    generatedAt: daysAgo(5),
  };
}

function humanisePassed(): NonNullable<PipelineArticle['humanise']> {
  return {
    status: 'passed',
    executionId: null,
    attempts: 1,
    initialAiScore: 84,
    finalAiScore: 17,
    zeroGptAttempts: 1,
    gemmaAttempts: 1,
    keywordsTotal: 5,
    keywordsPreserved: 5,
    urlsVerified: true,
    failureReason: null,
    failureStage: null,
    rewrittenContent: null,
    reviewRequired: false,
    completedAt: daysAgo(2),
  };
}

function finalProcessingReady(): NonNullable<PipelineArticle['finalProcessing']> {
  return {
    status: 'ready_to_publish',
    executionId: null,
    attempts: 1,
    initialAiScore: 24,
    postHumanizeAiScore: 9,
    finalAiScore: 9,
    zeroGptAttempts: 1,
    gemmaAttempts: 1,
    keywordsTotal: 6,
    keywordsPreserved: 6,
    urlsVerified: true,
    failureReason: null,
    failureStage: null,
    rewrittenContent: null,
    reviewRequired: false,
    completedAt: daysAgo(1),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: articles spanning every stage of the pipeline
// ─────────────────────────────────────────────────────────────────────────────

interface SeedSpec {
  id: string;
  title: string;
  stage: ArticleStage;
  keyword: string;
  priority: PipelineArticle['priority'];
  assignee: keyof typeof ASSIGNEES;
  entryPoint?: PipelineArticle['entryPoint'];
  revenuePotential?: PipelineArticle['revenuePotential'];
  hasExperience?: boolean;
  createdDaysAgo: number;
  stageDaysAgo: number;
}

function buildArticle(spec: SeedSpec): PipelineArticle {
  const slug = slugify(spec.title);
  const createdAt = daysAgo(spec.createdDaysAgo);
  const stageEnteredAt = daysAgo(spec.stageDaysAgo);
  const stage = spec.stage;

  const pastResearch = ['Deep Research', 'Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish', 'Published', 'Needs Refresh', 'Refreshing'].includes(stage);
  const hasDraft = ['Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish', 'Published', 'Needs Refresh', 'Refreshing'].includes(stage);
  const pastHumanise = ['Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish', 'Published', 'Needs Refresh', 'Refreshing'].includes(stage);
  const pastFinalProcessing = ['Fact Check', 'Final Approval', 'Publish', 'Published', 'Needs Refresh', 'Refreshing'].includes(stage);

  const STAGE_TO_STATUS: Record<string, PipelineArticle['status']> = {
    'New Article': 'Discovered',
    'Keyword Discovery': 'Discovered',
    'Select Keywords': 'Discovered',
    'Deep Research': 'Researching',
    'Write Article': 'Writing',
    'Humanise': 'Writing',
    'Review & Edit': 'In Review',
    'Add Photos + SEO Check': 'In Review',
    'Final Approval': 'Approved',
    'Watermark Removal': 'Approved',
    'Fact Check': 'Approved',
    'Publish': 'Approved',
    'Published': 'Published',
    'Needs Refresh': 'Needs Refresh',
    'Refreshing': 'Refreshing',
    'Archived': 'Archived',
  };

  const article: PipelineArticle = {
    id: spec.id,
    title: spec.title,
    status: STAGE_TO_STATUS[stage],
    stage,
    entryPoint: spec.entryPoint ?? 'Manual',
    source: { type: 'Original Idea', label: 'Editorial planning' },
    qualityScore: 62 + (slug.length % 30),
    assignee: ASSIGNEES[spec.assignee],
    targetKeyword: spec.keyword,
    primaryKeyword: pastResearch ? spec.keyword : null,
    secondaryKeywords: pastResearch ? [`${spec.keyword} guide`, `best ${spec.keyword} 2026`, `${spec.keyword} tips`] : [],
    updatedAt: stageEnteredAt,
    createdAt,
    stageEnteredAt,
    priority: spec.priority,
    hasExperience: spec.hasExperience ?? false,
    revenuePotential: spec.revenuePotential ?? 'medium',
    scheduledPublishDate: null,
    publishTime: null,
    lastRefreshed: null,
    taskProgress: { completed: 0, total: 0, hasBlocked: false },
    compliance: { ftcDisclosure: true, cardTermsVerified: pastFinalProcessing, disclaimerPresent: true },
    topicTags: pastResearch ? ['points', 'travel-hacking'] : [],
    sourceUrls: [
      { url: 'https://www.thepointsguy.com/research', type: 'Competitor Article' },
      { url: 'https://onemileatatime.com/analysis', type: 'Reference Material' },
    ],
    metaTitle: pastFinalProcessing ? `${spec.title} | Elite Travel Hackers` : undefined,
    metaDescription: pastFinalProcessing ? `Everything you need to know about ${spec.keyword} in 2026 — strategies, sweet spots, and mistakes to avoid.` : undefined,
    slug: pastFinalProcessing ? slug : undefined,
    format: 'Guide',
    context: `Readers searching for ${spec.keyword} are overwhelmed by conflicting advice. This piece should be the definitive, current answer.`,
    angle: 'Data-backed, Australia-focused, zero fluff.',
    targetAudience: 'Intermediate points collectors with at least one transferable-currency card.',
    outline: pastResearch ? ['Why it matters', 'The strategy', 'Step by step', 'Mistakes to avoid', 'FAQ'] : undefined,
    keywordDiscovery: pastResearch || stage === 'Keyword Discovery' || stage === 'Select Keywords'
      ? {
          keywords: [
            { keyword: spec.keyword, volume: 4400, kd: 38, cpc: 1.85, serpFeatures: ['featured_snippet', 'people_also_ask'], intent: 'informational', competitorGap: true, achievabilityScore: 74, trend: [320, 340, 380, 360, 410, 430, 470, 460, 490, 520, 510, 540], updatedAt: '3 days ago', difficulty: 'possible' },
            { keyword: `${spec.keyword} guide`, volume: 1900, kd: 24, cpc: 1.2, serpFeatures: ['people_also_ask'], intent: 'informational', competitorGap: false, achievabilityScore: 86, difficulty: 'easy' },
            { keyword: `best ${spec.keyword} 2026`, volume: 1300, kd: 31, cpc: 2.1, serpFeatures: ['featured_snippet', 'video'], intent: 'commercial', competitorGap: true, achievabilityScore: 68, difficulty: 'possible' },
          ],
          competitorGaps: [
            { keyword: spec.keyword, competitorDomain: 'thepointsguy.com', competitorPosition: 4, ourPosition: null, opportunity: 'No Australia-specific angle ranks in the top 10.' },
          ],
          generatedAt: daysAgo(spec.createdDaysAgo - 1),
        }
      : null,
    seoResearch: hasDraft || stage === 'Select Keywords' ? seoResearchFor(spec.keyword) : undefined,
    researchBrief: pastResearch ? researchBriefFor(spec.keyword, stage !== 'Deep Research') : undefined,
    content: hasDraft ? sampleContent(spec.title, spec.keyword, slug) : undefined,
    featuredImage: hasDraft ? heroImage(slug) : undefined,
    humanise: pastHumanise ? humanisePassed() : null,
    finalProcessing: pastFinalProcessing ? finalProcessingReady() : null,
    factCheck: null,
  };

  return article;
}

function seedArticles(): PipelineArticle[] {
  const articles: PipelineArticle[] = [
    // ── The 12 creation stages, one article each ──────────────────────────
    buildArticle({ id: 'art-001', title: 'Chase Sapphire Preferred vs Amex Gold: Which Earns More on Dining?', stage: 'New Article', keyword: 'chase sapphire preferred vs amex gold dining', priority: 'High', assignee: 'james', entryPoint: 'Keyword', revenuePotential: 'high', createdDaysAgo: 2, stageDaysAgo: 0.4 }),
    buildArticle({ id: 'art-002', title: 'Best Business Credit Cards for Travel in 2026', stage: 'Keyword Discovery', keyword: 'best business credit cards travel', priority: 'High', assignee: 'sarah', entryPoint: 'Keyword', revenuePotential: 'high', createdDaysAgo: 4, stageDaysAgo: 0.8 }),
    buildArticle({ id: 'art-003', title: 'How to Transfer Amex MR Points to ANA Mileage Club', stage: 'Select Keywords', keyword: 'amex membership rewards to ana', priority: 'Medium', assignee: 'james', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 6, stageDaysAgo: 1 }),
    buildArticle({ id: 'art-004', title: 'The Complete Guide to Hyatt Suite Upgrade Awards', stage: 'Deep Research', keyword: 'hyatt suite upgrade awards', priority: 'Medium', assignee: 'sarah', entryPoint: 'RSS', revenuePotential: 'medium', hasExperience: true, createdDaysAgo: 8, stageDaysAgo: 0.5 }),
    buildArticle({ id: 'art-005', title: 'Capital One Venture X Lounge Access: Every Location Ranked', stage: 'Write Article', keyword: 'capital one venture x lounge access', priority: 'Medium', assignee: 'james', revenuePotential: 'high', createdDaysAgo: 10, stageDaysAgo: 0.3 }),
    buildArticle({ id: 'art-006', title: 'Qantas Status Credits: The Fastest Ways to Retain Gold', stage: 'Humanise', keyword: 'qantas status credits fast', priority: 'High', assignee: 'daynis', revenuePotential: 'medium', createdDaysAgo: 12, stageDaysAgo: 0.6 }),
    buildArticle({ id: 'art-007', title: 'Singapore Airlines KrisFlyer Sweet Spots to Australia', stage: 'Review & Edit', keyword: 'krisflyer sweet spots australia', priority: 'High', assignee: 'sarah', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 14, stageDaysAgo: 1.2 }),
    buildArticle({ id: 'art-008', title: 'Amex Fine Hotels + Resorts: Real Value Breakdown', stage: 'Add Photos + SEO Check', keyword: 'amex fine hotels and resorts value', priority: 'Medium', assignee: 'james', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 16, stageDaysAgo: 0.9 }),
    buildArticle({ id: 'art-009', title: 'Virgin Australia Velocity Points to Singapore Suites', stage: 'Watermark Removal', keyword: 'velocity points singapore suites', priority: 'High', assignee: 'daynis', revenuePotential: 'high', createdDaysAgo: 18, stageDaysAgo: 0.4 }),
    buildArticle({ id: 'art-010', title: 'Best No-Annual-Fee Cards That Still Earn Transferable Points', stage: 'Fact Check', keyword: 'no annual fee cards transferable points', priority: 'Medium', assignee: 'sarah', revenuePotential: 'medium', createdDaysAgo: 20, stageDaysAgo: 0.7 }),
    buildArticle({ id: 'art-011', title: 'Emirates Skywards: First Class Awards with Points', stage: 'Final Approval', keyword: 'emirates skywards first class awards', priority: 'High', assignee: 'daynis', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 22, stageDaysAgo: 1.5 }),
    buildArticle({ id: 'art-012', title: 'How to Use Alaska Miles for Qantas First Class', stage: 'Publish', keyword: 'alaska miles qantas first class', priority: 'High', assignee: 'sarah', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 24, stageDaysAgo: 0.2 }),

    // ── Published (the Content Library) ───────────────────────────────────
    buildArticle({ id: 'art-013', title: 'Ultimate Guide to Amex Membership Rewards Transfer Partners', stage: 'Published', keyword: 'amex membership rewards transfer partners', priority: 'High', assignee: 'sarah', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 95, stageDaysAgo: 70 }),
    buildArticle({ id: 'art-014', title: 'Chase Ultimate Rewards: Every Sweet Spot Ranked', stage: 'Published', keyword: 'chase ultimate rewards sweet spots', priority: 'High', assignee: 'james', revenuePotential: 'high', hasExperience: true, createdDaysAgo: 120, stageDaysAgo: 100 }),
    buildArticle({ id: 'art-015', title: 'Qantas Frequent Flyer: Classic Reward Availability Guide', stage: 'Published', keyword: 'qantas classic reward availability', priority: 'Medium', assignee: 'daynis', revenuePotential: 'medium', createdDaysAgo: 60, stageDaysAgo: 45 }),
    buildArticle({ id: 'art-016', title: 'Hilton Honors Award Pricing: The Complete Calendar', stage: 'Published', keyword: 'hilton honors award pricing', priority: 'Low', assignee: 'emma', revenuePotential: 'low', createdDaysAgo: 40, stageDaysAgo: 12 }),

    // ── Refresh lifecycle ─────────────────────────────────────────────────
    buildArticle({ id: 'art-017', title: 'Best Travel Cards for Beginners 2025', stage: 'Needs Refresh', keyword: 'best travel cards beginners', priority: 'High', assignee: 'james', revenuePotential: 'high', createdDaysAgo: 320, stageDaysAgo: 6 }),
    buildArticle({ id: 'art-018', title: 'Marriott Bonvoy Fifth Night Free Explained', stage: 'Refreshing', keyword: 'marriott fifth night free', priority: 'Medium', assignee: 'sarah', revenuePotential: 'medium', createdDaysAgo: 400, stageDaysAgo: 2 }),
  ];

  const byId = new Map(articles.map((a) => [a.id, a]));

  // Stage-specific state --------------------------------------------------

  // art-005: drafting in flight
  patch(byId, 'art-005', {
    subProgress: [
      { label: 'Outline', status: 'done' },
      { label: 'Draft', status: 'active' },
      { label: 'Internal links', status: 'pending' },
    ],
  });

  // art-006: Humanise pass running (Gemma rewrite in flight)
  patch(byId, 'art-006', {
    humanise: {
      status: 'gemma_processing',
      executionId: 'exec-mock-001',
      attempts: 1,
      initialAiScore: 87,
      finalAiScore: null,
      zeroGptAttempts: 1,
      gemmaAttempts: 1,
      keywordsTotal: 5,
      keywordsPreserved: 5,
      urlsVerified: false,
      failureReason: null,
      failureStage: null,
      rewrittenContent: null,
      reviewRequired: false,
      completedAt: null,
    },
  });

  // art-009: Watermark Removal running
  patch(byId, 'art-009', {
    finalProcessing: {
      status: 'gemma_processing',
      executionId: 'exec-mock-002',
      attempts: 1,
      initialAiScore: 22,
      postHumanizeAiScore: null,
      finalAiScore: null,
      zeroGptAttempts: 1,
      gemmaAttempts: 1,
      keywordsTotal: 6,
      keywordsPreserved: 6,
      urlsVerified: false,
      failureReason: null,
      failureStage: null,
      rewrittenContent: null,
      reviewRequired: false,
      completedAt: null,
    },
  });

  // art-010: fact check running on stage entry
  patch(byId, 'art-010', {
    factCheck: {
      status: 'running',
      verdict: null,
      summary: '',
      issues: [],
      checkedAt: null,
      checkedBy: 'system',
      model: 'sonar-pro',
    },
  });

  // art-011: fact check passed, checklist partially complete
  patch(byId, 'art-011', {
    factCheck: {
      status: 'passed',
      verdict: 'pass',
      summary: 'All 14 factual claims verified against current sources.',
      issues: [],
      checkedAt: daysAgo(1.4),
      checkedBy: 'system',
      model: 'sonar-pro',
      citations: ['https://www.emirates.com/au/english/skywards/', 'https://www.seatguru.com/emirates'],
    },
    finalApprovalChecklist: {
      contentReviewed: true,
      imagesAdded: true,
      seoVerified: true,
      metadataComplete: false,
      schemaPresent: false,
      approvedBy: null,
      approvedAt: null,
    },
  });

  // art-012: fully approved, ready to publish
  patch(byId, 'art-012', {
    factCheck: {
      status: 'passed',
      verdict: 'pass',
      summary: 'All 11 factual claims verified against current sources.',
      issues: [],
      checkedAt: daysAgo(0.8),
      checkedBy: 'system',
      model: 'sonar-pro',
      citations: ['https://www.alaskaair.com/mileage-plan', 'https://www.qantas.com/frequent-flyer'],
    },
    finalApprovalChecklist: {
      contentReviewed: true,
      imagesAdded: true,
      seoVerified: true,
      metadataComplete: true,
      schemaPresent: true,
      approvedBy: 'Daynis Olman',
      approvedAt: daysAgo(0.3),
    },
    complianceCheck: {
      verdict: 'pass',
      summary: 'FTC disclosure present, card terms current, no compliance violations found.',
      findings: [],
      checkedAt: daysAgo(0.3),
      checkedBy: 'Daynis Olman',
      rulesHash: 'a1b2c3d4e5f6',
      model: 'claude-sonnet-4',
    },
    cardTags: [{ cardId: 'card-alaska-visa', name: 'Alaska Airlines Visa Signature' }],
    scheduledPublishDate: daysAhead(2),
    publishTime: '9:00 AM',
  });

  // Published library entries ---------------------------------------------

  const published: Array<[string, { position: number; prev: number; trend: 'up' | 'down' | 'stable'; traffic: number; prevTraffic: number; health: 'healthy' | 'monitor' | 'attention'; publishedDaysAgo: number; lastRefreshed: Date | null; seo: number }]> = [
    ['art-013', { position: 3, prev: 4, trend: 'up', traffic: 12400, prevTraffic: 11200, health: 'healthy', publishedDaysAgo: 70, lastRefreshed: daysAgo(20), seo: 92 }],
    ['art-014', { position: 6, prev: 5, trend: 'down', traffic: 8100, prevTraffic: 8600, health: 'monitor', publishedDaysAgo: 100, lastRefreshed: null, seo: 84 }],
    ['art-015', { position: 12, prev: 9, trend: 'down', traffic: 3200, prevTraffic: 4100, health: 'attention', publishedDaysAgo: 45, lastRefreshed: null, seo: 71 }],
    ['art-016', { position: 2, prev: 2, trend: 'stable', traffic: 5600, prevTraffic: 5500, health: 'healthy', publishedDaysAgo: 12, lastRefreshed: daysAgo(12), seo: 88 }],
  ];

  for (const [id, p] of published) {
    const a = byId.get(id);
    if (!a) continue;
    const slug = slugify(a.title);
    const originalPublishDate = daysAgo(p.publishedDaysAgo);
    a.webflowItemId = `wf-${id}`;
    a.publishedUrl = `https://www.elitetravelhackers.com/eth-articles/${slug}`;
    a.publishingState = 'published';
    a.scheduledPublishDate = null;
    a.publishTime = null;
    a.lastRefreshed = p.lastRefreshed;
    a.monitoringData = {
      lastCheckedAt: daysAgo(1),
      currentPosition: p.position,
      previousPosition: p.prev,
      positionTrend: p.trend,
      weeklyTraffic: p.traffic,
      previousWeekTraffic: p.prevTraffic,
      trafficTrend: Math.round(((p.traffic - p.prevTraffic) / p.prevTraffic) * 1000) / 10,
      healthStatus: p.health,
      refreshTriggers:
        p.health === 'attention'
          ? [{ id: 'trig-1', type: 'traffic_decay', detectedAt: daysAgo(2), details: 'Weekly traffic down 22% over 3 weeks', magnitude: 22, resolved: false }]
          : [],
    };
    a.refreshMeta = {
      flaggedBy: 'Health Monitor',
      flaggedDate: daysAgo(1),
      originalPublishDate,
      lastRefreshed: p.lastRefreshed,
      liveUrl: a.publishedUrl,
      currentPosition: p.position,
      targetPosition: null,
      traffic: p.traffic,
      trafficTrend: p.trend,
      seoScore: p.seo,
      daysInQueue: 0,
    };
    a.factCheck = {
      status: 'passed',
      verdict: 'pass',
      summary: 'All claims verified at publish time.',
      issues: [],
      checkedAt: daysAgo(p.publishedDaysAgo),
      checkedBy: 'system',
      model: 'sonar-pro',
    };
    a.finalApprovalChecklist = {
      contentReviewed: true,
      imagesAdded: true,
      seoVerified: true,
      metadataComplete: true,
      schemaPresent: true,
      approvedBy: 'Daynis Olman',
      approvedAt: daysAgo(p.publishedDaysAgo),
    };
  }

  // art-017: flagged for refresh (pairs with refresh-queue item rq-001)
  const a17 = byId.get('art-017');
  if (a17) {
    const slug = slugify(a17.title);
    a17.publishedUrl = `https://www.elitetravelhackers.com/eth-articles/${slug}`;
    a17.webflowItemId = 'wf-art-017';
    a17.publishingState = 'published';
    a17.refreshInfo = {
      reason: 'Ranking Drop',
      detail: 'Dropped from position 4 to 11 over 6 weeks; two competitors refreshed with 2026 card lineups.',
      severity: 'high',
      notes: ['Update annual fee figures', 'Replace the withdrawn Citi card section'],
    };
    a17.refreshMeta = {
      flaggedBy: 'Health Monitor',
      flaggedDate: daysAgo(6),
      originalPublishDate: daysAgo(300),
      lastRefreshed: null,
      liveUrl: a17.publishedUrl,
      currentPosition: 11,
      targetPosition: 5,
      traffic: 4100,
      trafficTrend: 'down',
      seoScore: 68,
      daysInQueue: 6,
    };
  }

  // art-018: refresh in flight (pairs with rq-002)
  const a18 = byId.get('art-018');
  if (a18) {
    const slug = slugify(a18.title);
    a18.publishedUrl = `https://www.elitetravelhackers.com/eth-articles/${slug}`;
    a18.webflowItemId = 'wf-art-018';
    a18.publishingState = 'update_pending';
    a18.refreshedContent = sampleContent(a18.title, a18.targetKeyword, slug) + '<p><strong>2026 update:</strong> Marriott now caps the fifth-night-free benefit on peak pricing dates — see the updated table below.</p>';
    a18.refreshChangePercent = 18;
    a18.refreshMeta = {
      flaggedBy: 'Sarah Mitchell',
      flaggedDate: daysAgo(9),
      originalPublishDate: daysAgo(380),
      lastRefreshed: null,
      liveUrl: a18.publishedUrl,
      currentPosition: 8,
      targetPosition: 4,
      traffic: 2900,
      trafficTrend: 'down',
      seoScore: 74,
      daysInQueue: 9,
    };
  }

  return articles;
}

function patch(map: Map<string, PipelineArticle>, id: string, p: Partial<PipelineArticle>): void {
  const a = map.get(id);
  if (a) Object.assign(a, p);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: refresh queue (production collection: refresh-queue)
// ─────────────────────────────────────────────────────────────────────────────

function seedRefreshQueue(): RefreshQueueItem[] {
  return [
    {
      id: 'rq-001',
      articleId: 'art-017',
      title: 'Best Travel Cards for Beginners 2025',
      keyword: 'best travel cards beginners',
      position: 11,
      targetPosition: 5,
      traffic: 4100,
      trafficTrend: 'down',
      status: 'Needs Refresh',
      priority: 'High',
      assignedTo: 'James Carter',
      seoScore: 68,
      qualityScore: 74,
      refreshReason: 'Ranking Drop',
      flaggedBy: 'Health Monitor',
      flaggedDate: daysAgo(6),
      publishedDate: daysAgo(300),
      lastRefreshed: null,
      liveUrl: 'https://www.elitetravelhackers.com/eth-articles/best-travel-cards-for-beginners-2025',
      daysInQueue: 6,
      refreshNotes: ['Update annual fee figures', 'Replace the withdrawn Citi card section'],
      aiRecommendations: [
        { category: 'Content', severity: 'high', text: 'Add 2026 card lineup — two competitors now outrank with newer offers.' },
        { category: 'SEO', severity: 'medium', text: 'Refresh meta title year token from 2025 to 2026.' },
      ],
      voiceNote: false,
      refreshScope: ['Body content', 'Metadata'],
      dueDate: daysAhead(5),
    },
    {
      id: 'rq-002',
      articleId: 'art-018',
      title: 'Marriott Bonvoy Fifth Night Free Explained',
      keyword: 'marriott fifth night free',
      position: 8,
      targetPosition: 4,
      traffic: 2900,
      trafficTrend: 'down',
      status: 'Rewriting',
      priority: 'Medium',
      assignedTo: 'Sarah Mitchell',
      seoScore: 74,
      qualityScore: 79,
      refreshReason: 'Traffic Decay',
      flaggedBy: 'Sarah Mitchell',
      flaggedDate: daysAgo(9),
      publishedDate: daysAgo(380),
      lastRefreshed: null,
      liveUrl: 'https://www.elitetravelhackers.com/eth-articles/marriott-bonvoy-fifth-night-free-explained',
      daysInQueue: 9,
      editorialDirection: 'Lead with the 2026 peak-pricing cap change; keep the worked examples.',
      refreshScope: ['Body content'],
      dueDate: daysAhead(3),
    },
    {
      id: 'rq-003',
      title: 'How to Maximize the Amex $200 Airline Fee Credit',
      keyword: 'amex airline fee credit',
      position: 9,
      targetPosition: 6,
      traffic: 1800,
      trafficTrend: 'stable',
      status: 'In Review',
      priority: 'Low',
      assignedTo: 'Emma Rodriguez',
      seoScore: 77,
      qualityScore: 81,
      refreshReason: 'AI Overview',
      flaggedBy: 'Daynis Olman',
      flaggedDate: daysAgo(14),
      publishedDate: daysAgo(210),
      lastRefreshed: daysAgo(95),
      liveUrl: 'https://www.elitetravelhackers.com/eth-articles/how-to-maximize-the-amex-200-airline-fee-credit',
      daysInQueue: 14,
      aiRecommendations: [
        { category: 'SERP', severity: 'medium', text: 'Google AI Overview now answers the basic query — add the gift-workaround depth it skips.' },
      ],
    },
    {
      id: 'rq-004',
      title: 'Velocity Points to Asia: Best Redemptions',
      keyword: 'velocity points asia redemptions',
      position: 5,
      targetPosition: 3,
      traffic: 3600,
      trafficTrend: 'up',
      status: 'Re-Published',
      priority: 'Medium',
      assignedTo: 'James Carter',
      seoScore: 86,
      qualityScore: 88,
      refreshReason: 'Stale Card Data',
      flaggedBy: 'Health Monitor',
      flaggedDate: daysAgo(18),
      publishedDate: daysAgo(150),
      lastRefreshed: daysAgo(4),
      completedAt: daysAgo(4),
      positionImprovement: 3,
      liveUrl: 'https://www.elitetravelhackers.com/eth-articles/velocity-points-to-asia-best-redemptions',
      daysInQueue: 14,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: tasks (production collection: article-tasks)
// ─────────────────────────────────────────────────────────────────────────────

function seedTasks(): ArticleTask[] {
  return [
    // art-007 (Review & Edit) — the copyedit round
    { id: 'task-001', articleId: 'art-007', icon: 'pencil', name: 'Copyedit', status: 'In Progress', assignee: 'Sarah Mitchell', avatar: 'SM', dueDate: daysAhead(1), comments: 1, description: 'Tighten the intro and verify every transfer ratio against the partner table.', autoAssigned: true },
    { id: 'task-002', articleId: 'art-007', icon: 'shield', name: 'Fact-Check', status: 'Pending', assignee: 'James Carter', avatar: 'JC', dueDate: daysAhead(2), comments: 0, autoAssigned: true },
    { id: 'task-003', articleId: 'art-007', icon: 'search', name: 'SEO Review', status: 'Blocked', assignee: 'Sarah Mitchell', avatar: 'SM', dueDate: daysAgo(1), comments: 2, blockReason: 'Waiting on updated SERP screenshot from DataForSEO pull', blocksAdvancement: true, autoAssigned: true },
    // art-008 (Add Photos + SEO Check) — media tasks
    { id: 'task-004', articleId: 'art-008', icon: 'image', name: 'Add Media', status: 'Pending', assignee: 'James Carter', avatar: 'JC', dueDate: daysAhead(2), comments: 0, isImagesTask: true, blocksAdvancement: true, autoAssigned: true },
    { id: 'task-005', articleId: 'art-008', icon: 'pencil', name: 'Alt text pass', status: 'Complete', assignee: 'Emma Rodriguez', avatar: 'ER', dueDate: daysAgo(1), comments: 0 },
    // art-005 (Write Article) — draft task
    { id: 'task-006', articleId: 'art-005', icon: 'pencil', name: 'Write Draft', status: 'In Progress', assignee: 'James Carter', avatar: 'JC', dueDate: daysAhead(1), comments: 0, autoAssigned: true },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: versions (production collection: article-versions)
// ─────────────────────────────────────────────────────────────────────────────

function seedVersions(): ArticleVersion[] {
  const a7 = seedContentForVersions('art-007');
  return [
    { id: 'ver-001', articleId: 'art-007', author: 'James Carter', timestamp: daysAgo(4), action: 'Draft generated (Write Article)', wordCount: 2210, contentSnapshot: a7.v1 },
    { id: 'ver-002', articleId: 'art-007', author: 'Gemma Humanise', timestamp: daysAgo(3), action: 'Humanise pass completed', wordCount: 2240, contentSnapshot: a7.v2 },
    { id: 'ver-003', articleId: 'art-007', author: 'Sarah Mitchell', timestamp: daysAgo(1), action: 'Manual edit — intro tightened', wordCount: 2185, contentSnapshot: a7.v3 },
    { id: 'ver-004', articleId: 'art-013', author: 'Sarah Mitchell', timestamp: daysAgo(70), action: 'Published to Webflow', wordCount: 3100 },
    { id: 'ver-005', articleId: 'art-013', author: 'James Carter', timestamp: daysAgo(20), action: 'Refresh re-published', wordCount: 3350 },
  ];
}

function seedContentForVersions(articleId: string): { v1: string; v2: string; v3: string } {
  void articleId;
  return {
    v1: '<p>KrisFlyer offers some of the best-value redemptions to Australia — if you know where to look. This guide covers the sweet spots.</p><h2>Why KrisFlyer</h2><p>Singapore Airlines releases more premium award space to its own members than to any partner.</p>',
    v2: '<p>KrisFlyer has genuinely excellent redemptions to Australia when you know where to look. Here are the sweet spots worth your points.</p><h2>Why KrisFlyer</h2><p>Singapore Airlines gives its own members far more premium award space than partner programs see.</p>',
    v3: '<p>KrisFlyer has genuinely excellent redemptions to Australia when you know where to look. Here are the three sweet spots actually worth your points in 2026.</p><h2>Why KrisFlyer</h2><p>Singapore Airlines gives its own members far more premium award space than partner programs ever see.</p>',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: voice notes (production subcollection: articles/{id}/voice-notes)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreVoiceNote {
  id: string;
  articleId: string;
  audioStoragePath: string | null;
  transcript: string;
  transcriptionStatus: 'pending' | 'completed' | 'error' | 'skipped';
  contributor: string;
  contributorUid: string;
  duration: number;
  recordedAt: Date;
  transcribedAt: Date | null;
  topicTags: string[];
  mode: 'recorded' | 'typed';
  noteType?: 'direction' | 'tip';
}

function seedVoiceNotes(): StoreVoiceNote[] {
  return [
    { id: 'vn-001', articleId: 'art-001', audioStoragePath: null, transcript: 'Lead with the dining earn-rate table — readers bounce when the answer is buried. Mention the $10 dining credit early.', transcriptionStatus: 'skipped', contributor: 'Daynis Olman', contributorUid: 'user-daynis', duration: 0, recordedAt: daysAgo(1), transcribedAt: null, topicTags: ['structure'], mode: 'typed', noteType: 'direction' },
    { id: 'vn-002', articleId: 'art-004', audioStoragePath: 'voice-notes/art-004/mock.webm', transcript: 'I used a suite upgrade at the Park Hyatt Sydney last March — the confirmation took 36 hours and cleared five days before check-in. Worth a first-person paragraph.', transcriptionStatus: 'completed', contributor: 'Sarah Mitchell', contributorUid: 'user-sarah', duration: 47, recordedAt: daysAgo(3), transcribedAt: daysAgo(3), topicTags: ['hyatt', 'experience'], mode: 'recorded' },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: task comments (production subcollection: article-tasks/{id}/comments)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreTaskComment {
  id: string;
  taskId: string;
  author: string;
  text: string;
  createdAt: Date;
}

function seedTaskComments(): StoreTaskComment[] {
  return [
    { id: 'tc-001', taskId: 'task-003', author: 'Sarah Mitchell', text: 'DataForSEO pull is queued — should have the screenshot tomorrow morning.', createdAt: daysAgo(0.5) },
    { id: 'tc-002', taskId: 'task-001', author: 'James Carter', text: 'Intro rewritten, down to 68 words. Ratios all checked against the June table.', createdAt: daysAgo(0.2) },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed: voice flags (production subcollection: articles/{id}/voiceFlags)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoreVoiceFlag {
  id: string;
  articleId: string;
  text: string;
  offsetStart: number;
  offsetEnd: number;
  isPattern: boolean;
  articleTitle: string;
  flaggedBy: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// The store itself
// ─────────────────────────────────────────────────────────────────────────────

let articles: PipelineArticle[] = seedArticles();
let refreshQueue: RefreshQueueItem[] = seedRefreshQueue();
let tasks: ArticleTask[] = seedTasks();
let versions: ArticleVersion[] = seedVersions();
let voiceNotes: StoreVoiceNote[] = seedVoiceNotes();
let taskComments: StoreTaskComment[] = seedTaskComments();
let voiceFlags: StoreVoiceFlag[] = [];

let idCounter = 100;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${String(idCounter).padStart(3, '0')}`;
}

// Legacy stage→status map, mirroring functions/src/pipeline/updateArticleStage.ts
const STAGE_TO_STATUS: Record<ArticleStage, PipelineArticle['status']> = {
  'New Article': 'Discovered',
  'Keyword Discovery': 'Discovered',
  'Select Keywords': 'Discovered',
  'Deep Research': 'Researching',
  'Write Article': 'Writing',
  'Humanise': 'Writing',
  'Review & Edit': 'In Review',
  'Add Photos + SEO Check': 'In Review',
  'Final Approval': 'Approved',
  'Watermark Removal': 'Approved',
  'Fact Check': 'Approved',
  'Publish': 'Approved',
  'Published': 'Published',
  'Needs Refresh': 'Needs Refresh',
  'Refreshing': 'Refreshing',
  'Archived': 'Archived',
};

function wordCount(html: string | undefined): number {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}

function recomputeTaskProgress(articleId: string): void {
  const a = articles.find((x) => x.id === articleId);
  if (!a) return;
  const ts = tasks.filter((t) => t.articleId === articleId);
  a.taskProgress = {
    completed: ts.filter((t) => t.status === 'Complete').length,
    total: ts.length,
    hasBlocked: ts.some((t) => t.status === 'Blocked'),
  };
}

function addVersion(articleId: string, author: string, action: string, contentSnapshot?: string, restoredFromVersionId?: string): ArticleVersion {
  const a = articles.find((x) => x.id === articleId);
  const v: ArticleVersion = {
    id: nextId('ver'),
    articleId,
    author,
    timestamp: new Date(),
    action,
    wordCount: wordCount(contentSnapshot ?? a?.content),
    contentSnapshot,
    restoredFromVersionId,
  };
  versions = [v, ...versions];
  return v;
}

// ── Snapshot getters (used by the subscription layer + other mock services) ──

export function getArticlesSnapshot(): PipelineArticle[] {
  return [...articles].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function getRefreshQueueSnapshot(): RefreshQueueItem[] {
  return [...refreshQueue].sort((a, b) => b.flaggedDate.getTime() - a.flaggedDate.getTime());
}

export function getTasksSnapshot(articleId: string): ArticleTask[] {
  return tasks.filter((t) => t.articleId === articleId);
}

export function getVersionsSnapshot(articleId: string): ArticleVersion[] {
  return versions
    .filter((v) => v.articleId === articleId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function getVoiceNotesSnapshot(articleId: string): StoreVoiceNote[] {
  return voiceNotes
    .filter((n) => n.articleId === articleId)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
}

export function getTaskCommentsSnapshot(taskId: string): StoreTaskComment[] {
  return taskComments
    .filter((c) => c.taskId === taskId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getArticleById(articleId: string): PipelineArticle | undefined {
  return articles.find((a) => a.id === articleId);
}

// ── Mutations (each emits — these back the mock callables) ──────────────────

export function storeCreateArticle(input: CreateArticleInput): string {
  const id = nextId('art');
  const ts = new Date();
  const article: PipelineArticle = {
    id,
    title: input.title,
    status: 'Discovered',
    stage: 'New Article',
    entryPoint: input.entryPoint,
    source: input.source,
    qualityScore: 0,
    assignee: input.assignee,
    targetKeyword: input.targetKeyword,
    primaryKeyword: null,
    secondaryKeywords: input.secondaryKeywords ?? [],
    updatedAt: ts,
    createdAt: ts,
    stageEnteredAt: ts,
    priority: input.priority,
    hasExperience: Boolean(input.experienceText || input.experienceCategory),
    revenuePotential: 'medium',
    scheduledPublishDate: input.targetDate ? new Date(input.targetDate) : null,
    publishTime: null,
    lastRefreshed: null,
    taskProgress: { completed: 0, total: 0, hasBlocked: false },
    topicCluster: input.topicCluster,
    editorialNotes: input.editorialNotes,
    format: input.format,
    context: input.context,
    angle: input.angle,
    targetAudience: input.targetAudience,
    outline: input.outline,
    pageTemplateId: input.pageTemplateId,
    content: input.content,
    sourceUrls: input.sourceUrls,
  };
  articles = [article, ...articles];
  addVersion(id, input.assignee.name, 'Article created');
  emit();
  return id;
}

/** production: updateArticleStage callable — stage + legacy status + version. */
export function storeUpdateArticleStage(articleId: string, newStage: ArticleStage): void {
  const a = articles.find((x) => x.id === articleId);
  if (!a) throw new Error(`Article ${articleId} not found`);
  const from = a.stage;
  const ts = new Date();
  a.stage = newStage;
  a.status = STAGE_TO_STATUS[newStage] ?? a.status;
  a.stageEnteredAt = ts;
  a.updatedAt = ts;

  // Mirror the server-side stage side-effects that matter to the UI:
  if (newStage === 'Humanise' && a.humanise == null) {
    a.humanise = {
      status: 'queued', executionId: null, attempts: 0, initialAiScore: null,
      finalAiScore: null, zeroGptAttempts: 0, gemmaAttempts: 0,
      keywordsTotal: 0, keywordsPreserved: 0, urlsVerified: false,
      failureReason: null, failureStage: null, rewrittenContent: null,
      completedAt: null,
    };
  }
  if (newStage === 'Watermark Removal' && a.finalProcessing == null) {
    a.finalProcessing = {
      status: 'queued', executionId: null, attempts: 0, initialAiScore: null,
      postHumanizeAiScore: null, finalAiScore: null, zeroGptAttempts: 0,
      gemmaAttempts: 0, keywordsTotal: 0, keywordsPreserved: 0,
      urlsVerified: false, failureReason: null, failureStage: null,
      rewrittenContent: null, completedAt: null,
    };
  }
  if (newStage === 'Fact Check') {
    a.factCheck = {
      status: 'running', verdict: null, summary: '', issues: [],
      checkedAt: null, checkedBy: 'system', model: 'sonar-pro',
    };
  }
  addVersion(articleId, a.assignee.name, `Stage changed: ${from} → ${newStage}`);
  emit();
}

/** Generic field merge backing the updateArticle callable. */
export function storeUpdateArticle(articleId: string, updates: Record<string, unknown>): void {
  const a = articles.find((x) => x.id === articleId);
  if (!a) throw new Error(`Article ${articleId} not found`);

  const briefKeys = ['selectedFindings', 'findingNotes', 'sourceNotes', 'excludedSourceUrls', 'planNote'];
  const briefPatch: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (briefKeys.includes(key)) {
      briefPatch[key] = value;
    } else if (key === 'briefApprovalStatus') {
      briefPatch.approvalStatus = value;
    } else if (key === 'content') {
      a.content = value as string;
    } else {
      (a as unknown as Record<string, unknown>)[key] = value;
    }
  }

  if (Object.keys(briefPatch).length > 0) {
    a.researchBrief = { ...(a.researchBrief ?? { findings: [] }), ...briefPatch } as PipelineArticle['researchBrief'];
  }

  a.updatedAt = new Date();
  emit();
}

export function storeAddVersionEntry(articleId: string, author: string, action: string, contentSnapshot?: string): void {
  addVersion(articleId, author, action, contentSnapshot);
  emit();
}

export function storeRestoreVersion(articleId: string, versionId: string): string {
  const a = articles.find((x) => x.id === articleId);
  const v = versions.find((x) => x.id === versionId && x.articleId === articleId);
  if (!a) throw new Error(`Article ${articleId} not found`);
  if (!v?.contentSnapshot) throw new Error('This version has no content snapshot to restore');
  a.content = v.contentSnapshot;
  a.updatedAt = new Date();
  const created = addVersion(articleId, a.assignee.name, `Restored from version ${versionId}`, v.contentSnapshot, versionId);
  emit();
  return created.id;
}

export function storeAddToRefreshQueue(input: AddToRefreshQueueInput): string {
  const id = nextId('rq');
  const item: RefreshQueueItem = {
    id,
    articleId: input.articleId,
    title: input.title,
    keyword: input.keyword,
    position: null,
    targetPosition: input.targetPosition ?? null,
    traffic: 0,
    trafficTrend: 'stable',
    status: 'Needs Refresh',
    priority: input.priority,
    assignedTo: input.assignedTo,
    seoScore: 0,
    qualityScore: 0,
    refreshReason: input.refreshReason,
    flaggedBy: 'Manual',
    flaggedDate: new Date(),
    lastRefreshed: null,
    daysInQueue: 0,
    editorialDirection: input.editorialDirection,
    refreshScope: input.refreshScope,
    sourceUrls: input.sourceUrls,
    dueDate: input.dueDate,
  };
  refreshQueue = [item, ...refreshQueue];
  if (input.articleId) {
    const a = articles.find((x) => x.id === input.articleId);
    if (a) {
      a.stage = 'Needs Refresh';
      a.status = 'Needs Refresh';
      a.stageEnteredAt = new Date();
      a.updatedAt = new Date();
    }
  }
  emit();
  return id;
}

export function storeUpdateRefreshItemStatus(refreshItemId: string, newStatus: RefreshStatus): void {
  const item = refreshQueue.find((i) => i.id === refreshItemId);
  if (!item) throw new Error(`Refresh item ${refreshItemId} not found`);
  item.status = newStatus;
  if (newStatus === 'Re-Published') {
    item.completedAt = new Date();
    item.positionImprovement = item.position != null && item.targetPosition != null
      ? Math.max(0, item.position - item.targetPosition)
      : null;
    item.lastRefreshed = new Date();
    if (item.articleId) {
      const a = articles.find((x) => x.id === item.articleId);
      if (a) {
        a.stage = 'Published';
        a.status = 'Published';
        a.lastRefreshed = new Date();
        a.refreshedContent = undefined;
        a.updatedAt = new Date();
      }
    }
  }
  emit();
}

export function storeManageTasks(input: ManageTasksInput & { commentText?: string }): string | undefined {
  const ts = new Date();
  switch (input.action) {
    case 'create': {
      if (!input.articleId || !input.name) throw new Error('create requires articleId and name');
      const id = nextId('task');
      const assignee = input.assignee ?? 'Unassigned';
      tasks = [...tasks, {
        id,
        articleId: input.articleId,
        icon: input.icon ?? 'pencil',
        name: input.name,
        status: 'Pending',
        assignee,
        avatar: assignee.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '–',
        dueDate: input.dueDate ?? ts,
        comments: 0,
        description: input.description,
      }];
      recomputeTaskProgress(input.articleId);
      emit();
      return id;
    }
    case 'update': {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      if (input.name !== undefined) t.name = input.name;
      if (input.assignee !== undefined) t.assignee = input.assignee;
      if (input.dueDate !== undefined) t.dueDate = input.dueDate;
      if (input.status !== undefined) t.status = input.status;
      if (input.description !== undefined) t.description = input.description;
      recomputeTaskProgress(t.articleId);
      emit();
      return input.taskId;
    }
    case 'complete': {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      t.status = 'Complete';
      recomputeTaskProgress(t.articleId);
      emit();
      return input.taskId;
    }
    case 'block': {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      t.status = 'Blocked';
      t.blockReason = input.blockReason ?? 'Blocked';
      recomputeTaskProgress(t.articleId);
      emit();
      return input.taskId;
    }
    case 'unblock': {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      if (t.blockReason) {
        t.resolvedBlockers = [...(t.resolvedBlockers ?? []), { reason: t.blockReason, resolvedAt: ts }];
      }
      t.status = 'Pending';
      t.blockReason = undefined;
      recomputeTaskProgress(t.articleId);
      emit();
      return input.taskId;
    }
    case 'delete': {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      tasks = tasks.filter((x) => x.id !== input.taskId);
      recomputeTaskProgress(t.articleId);
      emit();
      return undefined;
    }
    case 'comment' as never: {
      const t = tasks.find((x) => x.id === input.taskId);
      if (!t) throw new Error(`Task ${input.taskId} not found`);
      const text = (input as { commentText?: string }).commentText?.trim();
      if (!text) throw new Error('comment requires commentText');
      taskComments = [...taskComments, {
        id: nextId('tc'),
        taskId: t.id,
        author: 'You',
        text,
        createdAt: ts,
      }];
      t.comments += 1;
      emit();
      return input.taskId;
    }
    default:
      throw new Error(`Unknown manageTasks action: ${input.action}`);
  }
}

export function storeSaveVoiceNote(input: {
  articleId: string;
  audioStoragePath: string | null;
  transcript: string;
  duration: number;
  mode: 'recorded' | 'typed';
  noteType?: 'direction' | 'tip';
  contributor?: string;
}): { noteId: string; transcriptionStatus: string } {
  const id = nextId('vn');
  voiceNotes = [...voiceNotes, {
    id,
    articleId: input.articleId,
    audioStoragePath: input.audioStoragePath,
    transcript: input.transcript,
    transcriptionStatus: input.mode === 'recorded' ? 'pending' : 'skipped',
    contributor: input.contributor ?? 'You',
    contributorUid: 'mock-user',
    duration: input.duration,
    recordedAt: new Date(),
    transcribedAt: null,
    topicTags: [],
    mode: input.mode,
    noteType: input.noteType,
  }];
  emit();
  return { noteId: id, transcriptionStatus: input.mode === 'recorded' ? 'pending' : 'skipped' };
}

export function storeSaveVoiceFlag(articleId: string, flag: Omit<StoreVoiceFlag, 'id' | 'articleId' | 'createdAt'>): void {
  voiceFlags = [...voiceFlags, { ...flag, id: nextId('vf'), articleId, createdAt: new Date() }];
  emit();
}

/** Used by mock generators that write research/keyword data onto an article. */
export function storePatchArticle(articleId: string, patch: Partial<PipelineArticle>): void {
  const a = articles.find((x) => x.id === articleId);
  if (!a) throw new Error(`Article ${articleId} not found`);
  Object.assign(a, patch);
  a.updatedAt = new Date();
  emit();
}

export function storeBuildResearchBrief(articleId: string, keyword: string): ResearchBrief {
  const brief = researchBriefFor(keyword, false);
  const full: ResearchBrief = {
    id: brief?.id ?? nextId('brief'),
    articleId,
    generatedAt: new Date(),
    findings: brief?.findings ?? [],
    approved: false,
  };
  storePatchArticle(articleId, {
    researchBrief: {
      ...brief,
      generatedAt: new Date(),
    } as PipelineArticle['researchBrief'],
  });
  return full;
}
