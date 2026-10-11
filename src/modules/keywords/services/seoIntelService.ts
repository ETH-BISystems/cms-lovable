/**
 * MOCK SEO Intelligence service — in-memory replacement for the production
 * seoIntel_* Cloud Functions + Firestore subscriptions.
 *
 * production:
 *   snapshots/recommendations/link suggestions/prompts/AI runs → onSnapshot on
 *     `seo_snapshots`, `recommendations`, `link_suggestions`, `ai_prompts`,
 *     `ai_visibility_runs`
 *   runSnapshot          → httpsCallable(functions, 'seoIntel_runSnapshot', { timeout: 540000 })
 *   actionRecommendation → httpsCallable(functions, 'seoIntel_actionRecommendation')
 *   updateConfig         → httpsCallable(functions, 'seoIntel_updateConfig')
 *   runLinkAudit         → httpsCallable(functions, 'seoIntel_runLinkAudit', { timeout: 300000 })
 *   actionLinkSuggestion → httpsCallable(functions, 'seoIntel_actionLinkSuggestion')
 *   managePrompt         → httpsCallable(functions, 'seoIntel_managePrompts')
 *   runAiVisibility      → httpsCallable(functions, 'seoIntel_runAiVisibility', { timeout: 540000 })
 *   generateBrief        → httpsCallable(functions, 'seoIntel_generateBrief', { timeout: 120000 })
 */

import { delay, mockId } from '@/services/_delay';
import type {
  AiTrackedPrompt,
  AiVisibilityRun,
  IntelActionName,
  IntelActionPayload,
  LinkSuggestion,
  Recommendation,
  RecommendationType,
  SeoSnapshot,
} from '../types/intel';
import { KW, COMPETITOR_DOMAINS, hashString, rng, int, pick, pickN } from './_seed';

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

function currentWeekId(): string {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - start.getTime()) / 864e5 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

interface RecSeed {
  type: RecommendationType;
  title: string;
  keyword: string;
  volume: number;
  kd: number;
  position: number | null;
  competitor?: string;
}

const REC_SEEDS: RecSeed[] = [
  { type: 'new_content', title: 'Write "Virgin Atlantic Flying Club sweet spots"', keyword: 'virgin atlantic sweet spots', volume: 1400, kd: 21, position: null, competitor: 'thepointsguy.com' },
  { type: 'refresh', title: 'Refresh "Best Travel Credit Cards" (slipped to #6)', keyword: 'best travel credit cards', volume: 33100, kd: 72, position: 6, competitor: 'nerdwallet.com' },
  { type: 'keyword_striking_distance', title: 'Push "qsuites award availability" into the top 3', keyword: 'qatar airways qsuites award availability', volume: 2100, kd: 25, position: 8 },
  { type: 'internal_link_cluster', title: 'Build an internal-link cluster around transfer partners', keyword: 'amex transfer partners', volume: 6600, kd: 41, position: 5 },
  { type: 'backlink_gap', title: 'Close the backlink gap on "chase 5/24 rule"', keyword: 'chase 5/24 rule', volume: 9900, kd: 34, position: 2, competitor: 'doctorofcredit.com' },
  { type: 'backlink_reclaim', title: 'Reclaim 3 broken links to the lounge guide', keyword: 'priority pass guide', volume: 4400, kd: 29, position: 5 },
  { type: 'ai_gap', title: 'LLMs cite competitors for "best beginner travel card"', keyword: 'best beginner travel credit card', volume: 2900, kd: 38, position: 12, competitor: 'thepointsguy.com' },
  { type: 'ai_overview_gap', title: 'Win the AI Overview for "venture x vs sapphire reserve"', keyword: 'venture x vs sapphire reserve', volume: 3600, kd: 45, position: 4 },
  { type: 'cannibalization_merge', title: 'Merge the two competing lounge-access posts', keyword: 'credit cards with lounge access', volume: 5400, kd: 44, position: 9 },
  { type: 'linkable_asset', title: 'Publish a transfer-partner award chart tool', keyword: 'award chart comparison', volume: 950, kd: 18, position: null },
  { type: 'ai_refresh', title: 'Refresh the Hilton Diamond guide for LLM answers', keyword: 'hilton diamond status', volume: 3600, kd: 33, position: 14 },
  { type: 'brand_reputation', title: 'Address negative forum sentiment on card links', keyword: 'elitetravelhackers reviews', volume: 210, kd: 8, position: 3 },
  { type: 'new_content', title: 'Write "Etihad Guest sweet spots 2026"', keyword: 'etihad guest sweet spots', volume: 720, kd: 14, position: null, competitor: 'onemileatatime.com' },
];

function buildRecommendation(seed: RecSeed, i: number): Recommendation {
  const rand = rng(hashString(seed.title));
  const impact = int(rand, 3, 10);
  const effort = int(rand, 2, 9);
  const confidence = int(rand, 4, 10);
  const priorityScore = Math.round((impact * 0.5 + confidence * 0.3 + (10 - effort) * 0.2) * 10);
  const status: Recommendation['status'] = i >= 10 ? (i === 10 ? 'in_progress' : 'done') : 'open';
  return {
    id: `rec_${String(i + 1).padStart(2, '0')}`,
    type: seed.type,
    title: seed.title,
    reason: `"${seed.keyword}" has ${seed.volume.toLocaleString()} monthly searches at KD ${seed.kd}${seed.position ? ` and we currently rank #${seed.position}` : ' and we have no content'}${seed.competitor ? `; ${seed.competitor} leads the SERP` : ''}.`,
    expectedBenefit: `Estimated +${int(rand, 200, 4200).toLocaleString()} monthly organic visits and ${int(rand, 1, 4)} additional page-1 keywords within a quarter.`,
    priorityScore,
    impact,
    effort,
    confidence,
    scoreExplanation: `Impact ${impact}/10 × confidence ${confidence}/10, tempered by effort ${effort}/10 (priority = ${priorityScore}).`,
    evidence: {
      keywords: [{
        keyword: seed.keyword,
        volume: seed.volume,
        kd: seed.kd,
        position: seed.position,
        bestCompetitorPosition: seed.competitor ? int(rand, 1, 5) : null,
        competitorDomain: seed.competitor ?? null,
        url: `https://www.elitetravelhackers.com/${seed.keyword.replace(/\s+/g, '-')}`,
      }],
      urls: [`https://www.elitetravelhackers.com/${seed.keyword.split(' ')[0]}-guide`],
      domains: (seed.competitor ? [seed.competitor] : pickN(rand, [...COMPETITOR_DOMAINS], 2)).map(domain => ({
        domain,
        rank: int(rand, 100, 2500),
        note: 'Ranks consistently for this cluster',
      })),
    },
    relatedArticleIds: seed.position ? [`article_${int(rand, 4, 40)}`] : [],
    contentBrief: null,
    status,
    dismissReason: null,
    actionedAs: status === 'in_progress' ? { articleId: `article_${int(rand, 4, 40)}` } : status === 'done' ? { taskId: `task_${int(rand, 100, 999)}` } : {},
    realizedImpact: status === 'done'
      ? { keywordsImproved: int(rand, 2, 9), keywordsDeclined: int(rand, 0, 2), estTrafficDelta: int(rand, 300, 2600), measuredWeek: currentWeekId() }
      : null,
    createdWeek: currentWeekId(),
    updatedAt: new Date(Date.now() - int(rand, 0, 5) * 864e5),
  };
}

interface IntelStore {
  snapshot: SeoSnapshot;
  recommendations: Recommendation[];
  linkSuggestions: LinkSuggestion[];
  prompts: AiTrackedPrompt[];
  aiRuns: AiVisibilityRun[];
  config: { domain: string; brandPhrase: string; competitors: string[] };
}

let intel: IntelStore | null = null;

function buildStore(): IntelStore {
  const recommendations = REC_SEEDS.map(buildRecommendation);
  const counts: Partial<Record<RecommendationType, number>> = {};
  for (const r of recommendations.filter(r => r.status === 'open')) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
  }
  const rand = rng(hashString('intel-store'));
  const clusters = ['Transfer Partners', 'Lounges', 'Airlines', 'Hotels', 'Strategy'];
  const linkSuggestions: LinkSuggestion[] = Array.from({ length: 9 }, (_, i) => {
    const cluster = pick(rand, clusters);
    const src = pick(rand, [...KW.cards, ...KW.travel]);
    const tgt = pick(rand, [...KW.strategy, ...KW.travel]);
    return {
      id: `link_${i + 1}`,
      sourceArticleId: `article_${i + 11}`,
      sourceTitle: `${src.replace(/\b\w/g, c => c.toUpperCase())} — Complete Guide`,
      sourceUrl: `https://www.elitetravelhackers.com/${src.replace(/\s+/g, '-')}`,
      targetArticleId: `article_${i + 31}`,
      targetTitle: `${tgt.replace(/\b\w/g, c => c.toUpperCase())} Explained`,
      targetUrl: `https://www.elitetravelhackers.com/${tgt.replace(/\s+/g, '-')}`,
      anchorText: pick(rand, [tgt, `our ${tgt} guide`, `${tgt} guide`] as const),
      reason: `Both posts sit in the "${cluster}" cluster and the source has no contextual link to the target.`,
      score: int(rand, 52, 97),
      clusterId: `cluster_${clusters.indexOf(cluster) + 1}`,
      clusterName: cluster,
      status: i < 7 ? 'open' : 'accepted',
      taskId: null,
      createdWeek: currentWeekId(),
    };
  });
  const prompts: AiTrackedPrompt[] = [
    'what is the best travel credit card for beginners',
    'amex platinum vs chase sapphire reserve which is better',
    'how do i get into airport lounges for free',
    'best airline transfer partners for amex points',
    'is the capital one venture x worth the annual fee',
    'best hotel credit card for free nights',
  ].map((prompt, i) => ({
    id: `prompt_${i + 1}`,
    prompt,
    topic: pick(rand, ['Cards', 'Lounges', 'Transfer Partners', 'Hotels'] as const),
    active: i < 5,
    createdAt: new Date(Date.now() - (i + 2) * 7 * 864e5),
  }));
  const aiRuns: AiVisibilityRun[] = [];
  const providers = ['chat_gpt', 'gemini', 'claude', 'perplexity'] as const;
  for (let w = 0; w < 3; w++) {
    const weekDate = new Date(Date.now() - w * 7 * 864e5);
    const weekStart = new Date(weekDate.getFullYear(), 0, 1);
    const week = `${weekDate.getFullYear()}-W${String(Math.ceil(((weekDate.getTime() - weekStart.getTime()) / 864e5 + 1) / 7)).padStart(2, '0')}`;
    for (const prompt of prompts.filter(p => p.active)) {
      for (const provider of pickN(rand, providers, 2)) {
        const mentioned = rand() > 0.5;
        aiRuns.push({
          id: `airun_${aiRuns.length + 1}`,
          week,
          promptId: prompt.id,
          prompt: prompt.prompt,
          provider,
          model: { chat_gpt: 'gpt-5.2', gemini: 'gemini-3-pro', claude: 'claude-opus-4.8', perplexity: 'sonar-pro' }[provider],
          status: 'ok',
          mentioned,
          cited: mentioned && rand() > 0.45,
          competitorsCited: mentioned ? pickN(rand, [...COMPETITOR_DOMAINS], int(rand, 0, 2)) : pickN(rand, [...COMPETITOR_DOMAINS], int(rand, 1, 3)),
          citations: mentioned ? [{ url: 'https://www.elitetravelhackers.com/best-travel-credit-cards', domain: 'elitetravelhackers.com', title: 'Best Travel Credit Cards' }] : [],
          snippet: mentioned
            ? `…Elite Travel Hackers recommends comparing transfer partners before applying…`
            : `…The Points Guy and NerdWallet both publish strong comparisons here…`,
        });
      }
    }
  }
  return {
    snapshot: {
      week: currentWeekId(),
      domain: 'elitetravelhackers.com',
      competitors: [...COMPETITOR_DOMAINS.slice(0, 3)],
      metrics: {
        organicTraffic: 412000,
        organicKeywords: 86400,
        top3: 1250,
        top10: 5900,
        backlinks: 286000,
        referringDomains: 21400,
      },
      deltas: {
        organicTraffic: 3.8,
        organicKeywords: 1.2,
        top3: 40,
        top10: 210,
        backlinks: 1800,
        referringDomains: 240,
      },
      segments: { strikingDistance: 34, declining: 12, gaps: 41, cannibalized: 3, top3: 1250, top10: 5900 },
      recommendationCounts: counts,
      brand: { phrase: 'Elite Travel Hackers', mentions: 96, positive: 51, negative: 8, neutral: 37 },
      createdAt: new Date(Date.now() - 2 * 864e5),
    },
    recommendations,
    linkSuggestions,
    prompts,
    aiRuns,
    config: {
      domain: 'elitetravelhackers.com',
      brandPhrase: 'Elite Travel Hackers',
      competitors: [...COMPETITOR_DOMAINS.slice(0, 3)],
    },
  };
}

function store(): IntelStore {
  if (!intel) intel = buildStore();
  return intel;
}

// ---------------------------------------------------------------------------
// Listener plumbing (mirrors Firestore onSnapshot re-emission)
// ---------------------------------------------------------------------------

type Listener<T> = (value: T) => void;
const snapshotListeners = new Set<Listener<SeoSnapshot | null>>();
const openRecListeners = new Set<Listener<Recommendation[]>>();
const actionedRecListeners = new Set<Listener<Recommendation[]>>();
const recListeners = new Map<string, Set<Listener<Recommendation | null>>>();
const linkListeners = new Set<Listener<LinkSuggestion[]>>();
const promptListeners = new Set<Listener<AiTrackedPrompt[]>>();
const aiRunListeners = new Set<Listener<AiVisibilityRun[]>>();

function openRecs(): Recommendation[] {
  return store().recommendations.filter(r => r.status === 'open').sort((a, b) => b.priorityScore - a.priorityScore);
}
function actionedRecs(): Recommendation[] {
  return store().recommendations
    .filter(r => r.status === 'in_progress' || r.status === 'done')
    .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}
function linkSugs(): LinkSuggestion[] {
  return store().linkSuggestions
    .filter(s => s.status === 'open' || s.status === 'accepted')
    .sort((a, b) => b.score - a.score);
}
function promptsSorted(): AiTrackedPrompt[] {
  return [...store().prompts].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

function emitAll(): void {
  const s = store();
  snapshotListeners.forEach(cb => cb(s.snapshot));
  const open = openRecs();
  const actioned = actionedRecs();
  openRecListeners.forEach(cb => cb(open));
  actionedRecListeners.forEach(cb => cb(actioned));
  recListeners.forEach((cbs, id) => {
    const rec = s.recommendations.find(r => r.id === id) ?? null;
    cbs.forEach(cb => cb(rec));
  });
  const links = linkSugs();
  linkListeners.forEach(cb => cb(links));
  const prompts = promptsSorted();
  promptListeners.forEach(cb => cb(prompts));
  aiRunListeners.forEach(cb => cb([...s.aiRuns]));
}

function subscribe<T>(set: Set<Listener<T>>, cb: Listener<T>, current: () => T): () => void {
  set.add(cb);
  const timer = setTimeout(() => {
    if (set.has(cb)) cb(current());
  }, 300);
  return () => {
    clearTimeout(timer);
    set.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const seoIntelService = {
  /** Latest weekly snapshot (or null before the first run). */
  subscribeToLatestSnapshot(
    onData: (snapshot: SeoSnapshot | null) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(snapshotListeners, onData, () => store().snapshot);
  },

  /** Open recommendations, sorted client-side by priorityScore. */
  subscribeToOpenRecommendations(
    onData: (recs: Recommendation[]) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(openRecListeners, onData, openRecs);
  },

  /** Recommendations that have been actioned (in progress or completed). */
  subscribeToActionedRecommendations(
    onData: (recs: Recommendation[]) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(actionedRecListeners, onData, actionedRecs);
  },

  /** Single recommendation for the detail page. */
  subscribeToRecommendation(
    id: string,
    onData: (rec: Recommendation | null) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    let set = recListeners.get(id);
    if (!set) {
      set = new Set();
      recListeners.set(id, set);
    }
    const unsub = subscribe(set, onData, () => store().recommendations.find(r => r.id === id) ?? null);
    return () => {
      unsub();
      if (set!.size === 0) recListeners.delete(id);
    };
  },

  /** production: httpsCallable(functions, 'seoIntel_runSnapshot', { timeout: 540000 }) */
  async runSnapshot(mock = false): Promise<{ week: string; recommendationsWritten: number }> {
    await delay(1400);
    const s = store();
    s.snapshot = { ...s.snapshot, week: currentWeekId(), createdAt: new Date(), mock: mock || undefined };
    emitAll();
    return { week: s.snapshot.week, recommendationsWritten: openRecs().length };
  },

  /** production: httpsCallable(functions, 'seoIntel_actionRecommendation') */
  async actionRecommendation(
    recommendationId: string,
    action: IntelActionName,
    payload?: IntelActionPayload,
  ): Promise<Record<string, unknown>> {
    await delay(450);
    const rec = store().recommendations.find(r => r.id === recommendationId);
    if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
    switch (action) {
      case 'create_article':
        rec.status = 'in_progress';
        rec.actionedAs = { articleId: mockId('article') };
        break;
      case 'add_to_refresh_queue':
        rec.status = 'in_progress';
        rec.actionedAs = { refreshQueueId: mockId('refresh') };
        break;
      case 'create_task':
        rec.status = 'in_progress';
        rec.actionedAs = { taskId: mockId('task') };
        break;
      case 'snooze':
        rec.status = 'snoozed';
        break;
      case 'dismiss':
        rec.status = 'dismissed';
        rec.dismissReason = payload?.reason ?? 'Not relevant right now';
        break;
      case 'reopen':
        rec.status = 'open';
        rec.dismissReason = null;
        rec.actionedAs = {};
        break;
    }
    rec.updatedAt = new Date();
    emitAll();
    return { ok: true, status: rec.status };
  },

  /** production: httpsCallable(functions, 'seoIntel_updateConfig') */
  async updateConfig(input: { domain?: string; brandPhrase?: string; competitors?: string[] }): Promise<void> {
    await delay(350);
    Object.assign(store().config, input);
  },

  // ---- Internal linking (Phase 3) ----

  subscribeToLinkSuggestions(
    onData: (suggestions: LinkSuggestion[]) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(linkListeners, onData, linkSugs);
  },

  /** production: httpsCallable(functions, 'seoIntel_runLinkAudit', { timeout: 300000 }) */
  async runLinkAudit(mock = false): Promise<{ suggestions: number; clusters: number }> {
    await delay(1000);
    void mock;
    return { suggestions: linkSugs().length, clusters: 5 };
  },

  /** production: httpsCallable(functions, 'seoIntel_actionLinkSuggestion') */
  async actionLinkSuggestion(suggestionId: string, action: 'accept' | 'dismiss' | 'reopen'): Promise<Record<string, unknown>> {
    await delay(350);
    const sug = store().linkSuggestions.find(s => s.id === suggestionId);
    if (!sug) throw new Error(`Link suggestion ${suggestionId} not found`);
    sug.status = action === 'accept' ? 'accepted' : action === 'dismiss' ? 'dismissed' : 'open';
    emitAll();
    return { ok: true, status: sug.status };
  },

  // ---- Tracked AI visibility (Phase 5) ----

  subscribeToPrompts(
    onData: (prompts: AiTrackedPrompt[]) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(promptListeners, onData, promptsSorted);
  },

  subscribeToAiRuns(
    onData: (runs: AiVisibilityRun[]) => void,
    onError: (error: Error) => void,
  ) {
    void onError;
    return subscribe(aiRunListeners, onData, () => [...store().aiRuns]);
  },

  /** production: httpsCallable(functions, 'seoIntel_managePrompts') */
  async managePrompt(input: {
    action: 'create' | 'update' | 'delete';
    promptId?: string;
    prompt?: string;
    topic?: string;
    active?: boolean;
  }): Promise<Record<string, unknown>> {
    await delay(350);
    const s = store();
    if (input.action === 'create' && input.prompt) {
      s.prompts.unshift({
        id: mockId('prompt'),
        prompt: input.prompt,
        topic: input.topic ?? null,
        active: input.active ?? true,
        createdAt: new Date(),
      });
    } else if (input.action === 'update' && input.promptId) {
      const p = s.prompts.find(x => x.id === input.promptId);
      if (!p) throw new Error(`Prompt ${input.promptId} not found`);
      if (input.prompt !== undefined) p.prompt = input.prompt;
      if (input.topic !== undefined) p.topic = input.topic;
      if (input.active !== undefined) p.active = input.active;
    } else if (input.action === 'delete' && input.promptId) {
      s.prompts = s.prompts.filter(x => x.id !== input.promptId);
    }
    emitAll();
    return { ok: true };
  },

  /** production: httpsCallable(functions, 'seoIntel_runAiVisibility', { timeout: 540000 }) */
  async runAiVisibility(): Promise<{ week: string; prompts: number; gaps: number }> {
    await delay(1200);
    const active = store().prompts.filter(p => p.active).length;
    return { week: currentWeekId(), prompts: active, gaps: int(rng(hashString('gaps' + Date.now())), 1, 4) };
  },

  // ---- Content briefs (Phase 4) ----

  /** production: httpsCallable(functions, 'seoIntel_generateBrief', { timeout: 120000 }) */
  async generateBrief(recommendationId: string): Promise<void> {
    await delay(800);
    const rec = store().recommendations.find(r => r.id === recommendationId);
    if (!rec) throw new Error(`Recommendation ${recommendationId} not found`);
    const kw = rec.evidence.keywords?.[0]?.keyword ?? rec.title;
    rec.contentBrief = {
      suggestedTitle: rec.title.replace(/^Write /, '').replace(/^"|"$/g, ''),
      targetKeyword: kw,
      secondaryKeywords: [`${kw} guide`, `${kw} explained`, `best ${kw}`, `${kw} 2026`],
      outline: [
        `What is ${kw} and why it matters`,
        'Current best options compared',
        'Step-by-step strategy with real numbers',
        'Common mistakes to avoid',
        'Our recommendation + card links',
      ],
    };
    rec.updatedAt = new Date();
    emitAll();
  },
};
