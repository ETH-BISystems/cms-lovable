// MOCK — every function below replaces a production httpsCallable of the same
// name (kept in comments) operating on the in-memory store in ./articleStore.
// Signatures match production exactly so hooks/components are unchanged.

import { delay } from '@/services/_delay';
import type {
  CreateArticleInput,
  ArticleStatus,
  ArticleStage,
  PublishToWebflowOutput,
  GenerateArticleDraftInput,
  GenerateTopicResearchInput,
  ResearchBrief,
  AddToRefreshQueueInput,
  ManageTasksInput,
  ManageTasksOutput,
  RefreshStatus,
} from '../types';
import { STATUS_TO_STAGE_MAP } from '../types';
import {
  storeCreateArticle,
  storeUpdateArticle,
  storeUpdateArticleStage,
  storeAddToRefreshQueue,
  storeUpdateRefreshItemStatus,
  storeManageTasks,
  storeRestoreVersion,
  storePatchArticle,
  storeBuildResearchBrief,
  storeAddVersionEntry,
  getArticleById,
} from './articleStore';

// production: httpsCallable(functions, 'createArticle')
// Integration seam: production's callable also marks the originating RSS
// item(s) 'researching' server-side — mirrored here via the rss-monitor
// mock store (CreateArticleInput.rssItemId / rssItemIds).
export async function callCreateArticle(input: CreateArticleInput): Promise<string> {
  await delay(400);
  const articleId = storeCreateArticle(input);
  const rssIds = [input.rssItemId, ...(input.rssItemIds ?? [])].filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  if (rssIds.length > 0) {
    const { markItemsResearching } = await import('@/modules/rss-monitor/services/rssService');
    markItemsResearching(rssIds);
  }
  return articleId;
}

// production: httpsCallable(functions, 'updateArticleStatus')
export async function callUpdateArticleStatus(articleId: string, newStatus: ArticleStatus): Promise<void> {
  await delay(250);
  const stage = STATUS_TO_STAGE_MAP[newStatus] ?? 'New Article';
  storeUpdateArticleStage(articleId, stage);
}

// production: httpsCallable(functions, 'updateArticleStage') — the kanban
// drag, the stage-action buttons and the detail panel's stage stepper all
// call this directly in production; the mock keeps the same behavior
// (stage + legacy status + version-history entry) via the store.
export async function callUpdateArticleStage(articleId: string, newStage: ArticleStage): Promise<{ success: boolean }> {
  await delay(300);
  storeUpdateArticleStage(articleId, newStage);
  return { success: true };
}

export interface UpdateArticleUpdates {
  title?: string;
  content?: string;
  priority?: 'High' | 'Medium' | 'Low';
  assignee?: { name: string; avatar: string };
  targetKeyword?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  topicCluster?: string;
  editorialNotes?: string;
  /** Article brief fields (Overview tab). Empty string clears a field. */
  context?: string;
  angle?: string;
  targetAudience?: string;
  /** Experience Q&A (CMS-52) — persists the author's answers. */
  experienceQuestions?: Array<{ id: string; question: string; answer: string }>;
  /** CMS-147: Source Material reference URLs (Overview tab) — full-list
   * replace; an empty array clears them. */
  sourceUrls?: { url: string; type?: string }[];
  /** Page template choice (CMS-47). Empty string clears it. */
  pageTemplateId?: string;
  selectedFindings?: string[];
  /** Per-finding editor steering notes (Deep Research approval) — full-map
   * replace; an empty map clears. */
  findingNotes?: Record<string, string>;
  /** CMS-154: per-primary-source steering notes (source URL → note) —
   * full-map replace; an empty map clears. */
  sourceNotes?: Record<string, string>;
  /** CMS-154: primary source URLs excluded in the plan review — full-list
   * replace; an empty array means "include all primary sources". */
  excludedSourceUrls?: string[];
  /** CMS-154: overall plan steering note — empty string clears. */
  planNote?: string;
  briefApprovalStatus?: 'draft' | 'approved';
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  /** Thumbnail / featured image URL. Empty string clears it. */
  featuredImage?: string;
  finalApprovalChecklist?: Record<string, boolean>;
  cardTags?: { cardId: string; name: string }[];
  topicTags?: string[];
  /** Source-image picks for this article (CMS-67) — full list replace. */
  selectedSourceImages?: {
    url: string;
    sourceUrl: string;
    alt: string;
    assetId?: string;
    editedFromUrl?: string;
  }[];
  /** Removed source-image URLs (CMS-67) — stay hidden across re-scans. */
  dismissedSourceImageUrls?: string[];
  compliance?: {
    ftcDisclosure: boolean;
    cardTermsVerified: boolean;
    disclaimerPresent: boolean;
    lastCheckedAt: string;
  };
}

// production: httpsCallable(functions, 'updateArticle')
export async function callUpdateArticle(articleId: string, updates: UpdateArticleUpdates): Promise<void> {
  await delay(300);
  storeUpdateArticle(articleId, updates as Record<string, unknown>);
}

export interface CardTagSuggestion {
  cardId: string;
  name: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

// production: httpsCallable(functions, 'suggestCardTags', { timeout: 120000 })
export async function callSuggestCardTags(articleId: string): Promise<CardTagSuggestion[]> {
  await delay(900);
  const article = getArticleById(articleId);
  if (!article) return [];
  const haystack = `${article.title} ${article.targetKeyword} ${article.content ?? ''}`.toLowerCase();
  const catalog: Array<CardTagSuggestion & { patterns: string[] }> = [
    { cardId: 'card-amex-platinum', name: 'American Express Platinum', reason: 'Article references Amex lounge and FHR benefits', confidence: 'high', patterns: ['amex', 'platinum', 'fine hotels', 'fhr', 'centurion'] },
    { cardId: 'card-chase-sapphire', name: 'Chase Sapphire Preferred', reason: 'Article compares Chase Ultimate Rewards earning', confidence: 'high', patterns: ['chase', 'sapphire', 'ultimate rewards'] },
    { cardId: 'card-amex-gold', name: 'American Express Gold', reason: 'Dining earn rates discussed in body copy', confidence: 'medium', patterns: ['amex gold', 'dining'] },
    { cardId: 'card-venture-x', name: 'Capital One Venture X', reason: 'Lounge access section names Venture X', confidence: 'medium', patterns: ['venture x', 'capital one'] },
    { cardId: 'card-alaska-visa', name: 'Alaska Airlines Visa Signature', reason: 'Alaska Mileage Plan redemptions covered', confidence: 'low', patterns: ['alaska'] },
  ];
  return catalog
    .filter((c) => c.patterns.some((p) => haystack.includes(p)))
    .map(({ patterns: _patterns, ...suggestion }) => suggestion);
}

export interface ComplianceCheckResponse {
  verdict: 'pass' | 'fail';
  summary: string;
  findings: Array<{
    severity: 'level1' | 'level2' | 'level3';
    rule: string;
    excerpt: string;
    explanation: string;
    suggestion: string;
  }>;
  checkedAt: string;
  checkedBy: string;
  rulesHash: string;
  model: string;
}

// production: httpsCallable(functions, 'checkArticleCompliance', { timeout: 300000 })
export async function callCheckArticleCompliance(articleId: string): Promise<ComplianceCheckResponse> {
  await delay(1500);
  const article = getArticleById(articleId);
  const response: ComplianceCheckResponse = {
    verdict: 'pass',
    summary: 'FTC disclosure present, affiliate relationships disclosed near the first card mention, card terms match the issuer pages checked, no compliance violations found.',
    findings: [],
    checkedAt: new Date().toISOString(),
    checkedBy: article?.assignee.name ?? 'Mock User',
    rulesHash: 'a1b2c3d4e5f6',
    model: 'claude-sonnet-4',
  };
  storePatchArticle(articleId, {
    complianceCheck: {
      verdict: response.verdict,
      summary: response.summary,
      findings: response.findings,
      checkedAt: new Date(response.checkedAt),
      checkedBy: response.checkedBy,
      rulesHash: response.rulesHash,
      model: response.model,
    },
  });
  return response;
}

// production: httpsCallable(functions, 'publishToWebflow')
export async function callPublishToWebflow(articleId: string): Promise<PublishToWebflowOutput> {
  await delay(1200);
  const article = getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  const slug = article.slug ?? article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  const webflowItemId = article.webflowItemId ?? `wf-${articleId}`;
  const publishedUrl = `https://www.elitetravelhackers.com/eth-articles/${slug}`;
  storePatchArticle(articleId, {
    webflowItemId,
    publishedUrl,
    publishingState: 'published',
    stage: 'Published',
    status: 'Published',
    stageEnteredAt: new Date(),
    monitoringData: {
      lastCheckedAt: new Date(),
      currentPosition: null,
      previousPosition: null,
      positionTrend: 'stable',
      weeklyTraffic: 0,
      previousWeekTraffic: 0,
      trafficTrend: 0,
      healthStatus: 'healthy',
      refreshTriggers: [],
    },
  });
  storeAddVersionEntry(articleId, article.assignee.name, 'Published to Webflow');
  return {
    success: true,
    webflowItemId,
    publishedUrl,
    verificationResults: { httpStatus: 200, schemaPresent: true, metaTagsValid: true, gscSubmitted: true },
  };
}

export interface FactCheckResponse {
  verdict: 'pass' | 'fail' | null;
  summary: string;
  issues: Array<{
    claim: string;
    issueType: 'incorrect' | 'outdated' | 'unverifiable';
    explanation: string;
    correction: string;
    source: string;
  }>;
  checkedAt: string | null;
  checkedBy: string;
  model: string;
  citations: string[];
}

// production: httpsCallable(functions, 'factCheckArticle', { timeout: 300000 })
export async function callFactCheckArticle(articleId: string): Promise<FactCheckResponse> {
  await delay(1800);
  const response: FactCheckResponse = {
    verdict: 'pass',
    summary: 'All 12 factual claims verified against current issuer and program sources.',
    issues: [],
    checkedAt: new Date().toISOString(),
    checkedBy: 'system',
    model: 'sonar-pro',
    citations: ['https://www.americanexpress.com/rewards', 'https://thepointsguy.com/valuations'],
  };
  storePatchArticle(articleId, {
    factCheck: {
      status: 'passed',
      verdict: response.verdict,
      summary: response.summary,
      issues: response.issues,
      checkedAt: new Date(),
      checkedBy: response.checkedBy,
      model: response.model,
      citations: response.citations,
    },
  });
  return response;
}

// production: httpsCallable(functions, 'unpublishFromWebflow')
export async function callUnpublishFromWebflow(articleId: string): Promise<{ success: boolean }> {
  await delay(600);
  storePatchArticle(articleId, { publishingState: 'archived' });
  return { success: true };
}

// production: httpsCallable(functions, 'generateArticleDraft')
export async function callGenerateArticleDraft(input: GenerateArticleDraftInput): Promise<void> {
  await delay(1600);
  const article = getArticleById(input.articleId);
  if (!article) throw new Error(`Article ${input.articleId} not found`);
  const kw = input.seoContext.targetKeyword || article.targetKeyword;
  const slug = article.slug ?? kw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const body = [
    `<p>Everything you need to know about ${kw} in 2026 — built from ${input.researchFindings.length} verified research findings.</p>`,
    `<h2>Why ${kw} matters</h2>`,
    `<p>${input.researchFindings[0]?.text ?? 'The landscape shifted this year and the winners are the travellers who adapt fastest.'}</p>`,
    `<figure><img src="https://picsum.photos/seed/${slug}-draft/800/450" alt="${kw}" /></figure>`,
    `<h2>The step-by-step strategy</h2>`,
    `<p>${input.researchFindings[1]?.text ?? 'Start with flexible currencies, confirm award space, then transfer.'}</p>`,
    input.personalExperience ? `<h2>Our first-hand experience</h2><p>${input.personalExperience}</p>` : '',
    `<h2>Mistakes to avoid</h2>`,
    `<p>Never transfer points speculatively, and always compare the cash fare before redeeming.</p>`,
  ].filter(Boolean).join('');
  storePatchArticle(input.articleId, { content: body });
  storeAddVersionEntry(input.articleId, 'AI Draft', 'Draft generated (Write Article)', body);
}

// production: httpsCallable(functions, 'generateTopicResearch')
export async function callGenerateTopicResearch(input: GenerateTopicResearchInput): Promise<ResearchBrief> {
  await delay(1400);
  return storeBuildResearchBrief(input.articleId, input.targetKeyword);
}

// production: httpsCallable(functions, 'generateSeoResearch')
export async function callGenerateSeoResearch(input: { articleId: string; targetKeyword: string }): Promise<unknown> {
  await delay(900);
  const seoResearch = {
    keyword: input.targetKeyword,
    metrics: { searchVolume: 3800, keywordDifficulty: 34, cpc: 1.65, competition: 0.38 },
    serp: [
      { position: 1, title: `${input.targetKeyword} — The Points Guy`, url: 'https://www.thepointsguy.com/guide', domain: 'thepointsguy.com', estimatedWordCount: 3100 },
      { position: 2, title: `${input.targetKeyword} explained`, url: 'https://onemileatatime.com/guide', domain: 'onemileatatime.com', estimatedWordCount: 2700 },
    ],
    featuredSnippet: { type: 'paragraph', currentHolder: 'thepointsguy.com', opportunity: true },
    peopleAlsoAsk: [`Is ${input.targetKeyword} worth it?`, `How does ${input.targetKeyword} work?`],
    recommendedStructure: {
      suggestedH1: `${input.targetKeyword}: The Complete 2026 Guide`,
      suggestedH2s: ['Overview', 'Strategy', 'Mistakes', 'FAQ'],
      targetWordCount: 2400,
    },
    generatedAt: new Date(),
  };
  storePatchArticle(input.articleId, { seoResearch });
  return seoResearch;
}

// production: httpsCallable(functions, 'addToRefreshQueue')
export async function callAddToRefreshQueue(input: AddToRefreshQueueInput): Promise<void> {
  await delay(400);
  storeAddToRefreshQueue(input);
}

// production: httpsCallable(functions, 'updateRefreshItemStatus') — called
// directly by RefreshQueuePage's kanban drag.
export async function callUpdateRefreshItemStatus(refreshItemId: string, newStatus: RefreshStatus): Promise<{ success: boolean }> {
  await delay(300);
  storeUpdateRefreshItemStatus(refreshItemId, newStatus);
  return { success: true };
}

// production: httpsCallable(functions, 'discoverKeywords', { timeout: 300_000 })
// called directly by StageActionPanel (New Article + Keyword Discovery stages).
export async function callDiscoverKeywords(articleId: string): Promise<{ success: boolean }> {
  await delay(1300);
  const article = getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  const kw = article.targetKeyword || article.title;
  storePatchArticle(articleId, {
    keywordDiscovery: {
      keywords: [
        { keyword: kw, volume: 4400, kd: 38, cpc: 1.85, serpFeatures: ['featured_snippet', 'people_also_ask'], intent: 'informational', competitorGap: true, achievabilityScore: 74, trend: [320, 340, 380, 360, 410, 430, 470, 460, 490, 520, 510, 540], updatedAt: 'just now', difficulty: 'possible' },
        { keyword: `${kw} guide`, volume: 1900, kd: 24, cpc: 1.2, serpFeatures: ['people_also_ask'], intent: 'informational', competitorGap: false, achievabilityScore: 86, difficulty: 'easy' },
        { keyword: `best ${kw} 2026`, volume: 1300, kd: 31, cpc: 2.1, serpFeatures: ['featured_snippet', 'video'], intent: 'commercial', competitorGap: true, achievabilityScore: 68, difficulty: 'possible' },
        { keyword: `how does ${kw} work`, volume: 880, kd: 18, cpc: 0.9, serpFeatures: ['people_also_ask'], intent: 'informational', competitorGap: false, achievabilityScore: 91, difficulty: 'very_easy' },
        { keyword: `${kw} vs alternatives`, volume: 720, kd: 27, cpc: 1.5, serpFeatures: ['video'], intent: 'commercial', competitorGap: true, achievabilityScore: 72, difficulty: 'easy' },
      ],
      competitorGaps: [
        { keyword: kw, competitorDomain: 'thepointsguy.com', competitorPosition: 4, ourPosition: null, opportunity: 'No Australia-specific angle ranks in the top 10.' },
        { keyword: `best ${kw} 2026`, competitorDomain: 'nerdwallet.com', competitorPosition: 6, ourPosition: null, opportunity: 'Incumbent content is 14 months stale.' },
      ],
      generatedAt: new Date(),
    },
  });
  return { success: true };
}

// production: httpsCallable(functions, 'runSEOVerification') — the "Run SEO
// Check" button in the Add Photos + SEO Check stage panel.
export async function callRunSEOVerification(articleId: string): Promise<{ success: boolean }> {
  await delay(1100);
  const article = getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  const issues = [];
  if (!article.featuredImage) {
    issues.push({ category: 'images' as const, severity: 'error' as const, message: 'Featured image is missing' });
  }
  if (!article.metaDescription) {
    issues.push({ category: 'metadata' as const, severity: 'warning' as const, message: 'Meta description not set — one will be auto-generated at publish' });
  }
  if ((article.content ?? '').length < 1200) {
    issues.push({ category: 'keywords' as const, severity: 'info' as const, message: 'Body is under the 2,400-word target for this keyword' });
  }
  storePatchArticle(articleId, {
    seoCheckResult: {
      passed: !issues.some((i) => i.severity === 'error'),
      issues,
      acknowledgedWarnings: false,
      checkedAt: new Date(),
    },
  });
  return { success: true };
}

// production: httpsCallable(functions, 'refreshArticleSections') — the
// "Regenerate refresh" action on a refreshing article's detail panel.
export async function callRefreshArticleSections(articleId: string): Promise<{ success: boolean }> {
  await delay(1500);
  const article = getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  const refreshed =
    (article.content ?? '') +
    `<h2>2026 refresh: what changed</h2><p>Updated figures, a refreshed comparison table, and the latest program rules as of ${new Date().toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}.</p>`;
  storePatchArticle(articleId, { refreshedContent: refreshed, refreshChangePercent: 14 });
  return { success: true };
}

// production: httpsCallable<{articleId, instruction, sectionText?},
//   {success, rewrittenContent}>(functions, 'rewriteArticleSection', { timeout: 120000 })
// — ContentEditToolbar's selection/full rewrite action.
export async function callRewriteArticleSection(input: {
  articleId: string;
  instruction: string;
  sectionText?: string;
}): Promise<{ success: boolean; rewrittenContent: string }> {
  await delay(1400);
  const article = getArticleById(input.articleId);
  if (!article) throw new Error(`Article ${input.articleId} not found`);
  const original = input.sectionText ?? article.content ?? '';
  const rewritten = input.sectionText
    ? `<p>${original.replace(/<[^>]+>/g, ' ').trim()} — tightened per instruction: “${input.instruction}”.</p>`
    : `${original}<p><em>Rewritten per instruction: “${input.instruction}”.</em></p>`;
  const newContent = input.sectionText
    ? (article.content ?? '').replace(input.sectionText, rewritten)
    : rewritten;
  storePatchArticle(input.articleId, { content: newContent });
  storeAddVersionEntry(input.articleId, 'AI Rewrite', `Rewrite: ${input.instruction.slice(0, 60)}`, newContent);
  return { success: true, rewrittenContent: newContent };
}

/** Generate experience-related interview questions about the article topic
 * (CMS-52). Regenerating keeps answered questions and replaces unanswered
 * ones. production: httpsCallable(functions, 'generateExperienceQuestions') */
export async function callGenerateExperienceQuestions(
  articleId: string
): Promise<Array<{ id: string; question: string; answer: string }>> {
  await delay(800);
  const article = getArticleById(articleId);
  const existing = article?.experienceQuestions ?? [];
  const answered = existing.filter((q) => q.answer.trim().length > 0);
  const kw = article?.targetKeyword ?? 'this topic';
  const fresh = [
    { id: `eq-${Date.now()}-1`, question: `Have you personally used ${kw}? What happened?`, answer: '' },
    { id: `eq-${Date.now()}-2`, question: `What surprised you most the first time you dealt with ${kw}?`, answer: '' },
    { id: `eq-${Date.now()}-3`, question: `What would you tell a friend to avoid when it comes to ${kw}?`, answer: '' },
  ];
  const questions = [...answered, ...fresh];
  storePatchArticle(articleId, { experienceQuestions: questions });
  return questions;
}

/** Scan the article's stored source pages and extract the image URLs they
 * use. production: httpsCallable(functions, 'extractSourceImages') */
export async function callExtractSourceImages(
  articleId: string
): Promise<{ success: boolean; images: Array<{ url: string; sourceUrl: string; alt: string }> }> {
  await delay(1200);
  const article = getArticleById(articleId);
  if (!article) throw new Error(`Article ${articleId} not found`);
  const slug = article.slug ?? articleId;
  const sources = (article.sourceUrls ?? []).map((s) => s.url);
  const images = sources.flatMap((sourceUrl, i) => [
    { url: `https://picsum.photos/seed/${slug}-src${i}a/800/450`, sourceUrl, alt: `${article.targetKeyword} — source image ${i + 1}a` },
    { url: `https://picsum.photos/seed/${slug}-src${i}b/800/450`, sourceUrl, alt: `${article.targetKeyword} — source image ${i + 1}b` },
  ]);
  storePatchArticle(articleId, {
    sourceImages: {
      images,
      scannedUrls: sources,
      failedPages: 0,
      extractedAt: new Date(),
    },
  });
  return { success: true, images };
}

/** Restore the article body to a previous version's content snapshot.
 * production: httpsCallable(functions, 'restoreArticleVersion') */
export async function callRestoreArticleVersion(
  articleId: string,
  versionId: string
): Promise<{ success: boolean; restoredVersionId: string }> {
  await delay(500);
  const restoredVersionId = storeRestoreVersion(articleId, versionId);
  return { success: true, restoredVersionId };
}

// production: httpsCallable(functions, 'manageTasks') — TaskInlineEditors also
// posts action 'comment' (task comments subcollection) to the same callable;
// the store handles that runtime action too.
export async function callManageTasks(input: ManageTasksInput): Promise<ManageTasksOutput> {
  await delay(300);
  const taskId = storeManageTasks(input as ManageTasksInput & { commentText?: string });
  return { success: true, taskId };
}
