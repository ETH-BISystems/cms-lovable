/**
 * MOCK keyword Functions service — in-memory replacement for the production
 * keyword Cloud Function callables (DataForSEO-backed).
 *
 * production callables (kept for the wiring pass):
 *   callImportKeywords     → httpsCallable(functions, 'importKeywords')
 *   callAnalyzeKeywordGap  → httpsCallable(functions, 'analyzeKeywordGap', { timeout: 300_000 })
 *   callRefreshKeywordData → httpsCallable(functions, 'refreshKeywordData')
 *   callExploreKeywords    → httpsCallable(functions, 'exploreKeywords')
 *   callAnalyzeTopPages    → httpsCallable(functions, 'analyzeTopPages', { timeout: 180_000 })
 */

import { delay } from '@/services/_delay';
import type {
  ImportKeywordsInput,
  ImportKeywordsOutput,
  AnalyzeKeywordGapInput,
  AnalyzeKeywordGapOutput,
  RefreshKeywordDataOutput,
  ExploreKeywordsInput,
  ExploreKeywordsOutput,
  AnalyzeTopPagesInput,
  AnalyzeTopPagesOutput,
  ExplorerKeyword,
  TopPage,
} from '../types';
import { hashString, rng, int, pick, pickN, trendSeries, SERP_FEATURE_POOL, COMPETITOR_DOMAINS, KW } from './_seed';
import { _createGapAnalysis } from './keywordGapService';
import { _touchKeywordStore } from './keywordsService';

const MATCH_TYPES = ['broad', 'phrase', 'exact', 'related', 'question'] as const;
const QUESTION_STARTS = ['how to', 'what is', 'why does', 'can you', 'is', 'where to', 'when does', 'which'];

function generateExplorerKeywords(seed: string): ExplorerKeyword[] {
  const rand = rng(hashString(seed.toLowerCase()));
  const base = seed.toLowerCase().trim();
  const modifiers = [
    '', ' review', ' vs alternatives', ' for beginners', ' guide', ' explained', ' worth it',
    ' 2026', ' tips', ' best practices', ' pros and cons', ' step by step',
  ];
  const keywords: ExplorerKeyword[] = [];
  const usedCombos = new Set<string>();

  // Seed row itself (exact match, always present).
  const mkRow = (keyword: string, matchType: ExplorerKeyword['matchType'], questionType?: ExplorerKeyword['questionType']): ExplorerKeyword => {
    const volume = int(rand, 180, 24000);
    const ranking = rand() > 0.7;
    return {
      id: `exp_${hashString(keyword).toString(36)}`,
      keyword,
      volume,
      kd: int(rand, 6, 82),
      cpc: Math.round((0.3 + rand() * 6.5) * 100) / 100,
      cpcTrend: pick(rand, ['rising', 'falling', 'stable'] as const),
      intent: pick(rand, ['Informational', 'Commercial', 'Transactional', 'Navigational'] as const),
      matchType,
      questionType,
      cluster: pick(rand, ['Overview', 'Cards', 'Airlines', 'Hotels', 'Strategy', 'Lounges'] as const),
      serpFeatureCount: 0, // set below
      serpFeatures: pickN(rand, SERP_FEATURE_POOL, int(rand, 0, 3)) as ExplorerKeyword['serpFeatures'],
      trend: trendSeries(rand, volume),
      ethPosition: ranking ? int(rand, 2, 38) : undefined,
      ethStatus: ranking ? 'ranking' : 'no-content',
    };
  };

  keywords.push({ ...mkRow(base, 'exact') });
  for (const mod of modifiers.slice(1)) {
    const kw = `${base}${mod}`;
    if (usedCombos.has(kw)) continue;
    usedCombos.add(kw);
    keywords.push(mkRow(kw, pick(rand, ['broad', 'phrase'] as const)));
  }
  for (const q of pickN(rand, QUESTION_STARTS, 5)) {
    const kw = `${q} ${base}`;
    const qType = q.split(' ')[0] as ExplorerKeyword['questionType'];
    keywords.push(mkRow(kw, 'question', qType));
  }
  // A few related-topic rows from the travel vocab.
  for (const rel of pickN(rand, [...KW.travel, ...KW.strategy], 6)) {
    keywords.push(mkRow(rel, 'related'));
  }
  return keywords.map(k => ({ ...k, serpFeatureCount: k.serpFeatures.length }));
}

function generateTopPages(domain: string): TopPage[] {
  const rand = rng(hashString(domain));
  const paths = [
    '/best-travel-credit-cards', '/amex-platinum-review', '/chase-sapphire-reserve-review',
    '/airline-transfer-partners', '/best-airport-lounges', '/hotel-elite-status-guide',
    '/beginners-guide-to-points', '/capital-one-venture-x-review', '/marriott-bonvoy-guide',
    '/how-to-fly-business-class', '/priority-pass-guide', '/award-chart-sweet-spots',
    '/credit-card-sign-up-bonuses', '/hyatt-globalist-guide', '/delta-skymiles-guide',
    '/round-the-world-award', '/stopover-and-open-jaw-guide', '/best-cash-back-cards',
  ];
  return paths.slice(0, int(rand, 12, 16)).map((path, i) => {
    const traffic = int(rand, 900, 48000) / (i + 1);
    const ethRoll = rand();
    const ethStatus: TopPage['ethStatus'] = ethRoll > 0.66 ? 'leading' : ethRoll > 0.4 ? 'weaker' : 'no-content';
    return {
      rank: i + 1,
      pagePath: path,
      fullUrl: `https://www.${domain}${path}`,
      domain,
      estimatedTraffic: Math.round(traffic),
      trafficDiff: int(rand, -2200, 3600),
      trafficPercentage: 0, // filled below
      keywordsCount: int(rand, 40, 1800),
      topKeyword: pick(rand, [...KW.cards, ...KW.travel]),
      referringDomains: int(rand, 15, 900),
      backlinks: int(rand, 60, 12000),
      ethStatus,
      ethPosition: ethStatus === 'no-content' ? undefined : int(rand, 1, 24),
    };
  }).map((p, _i, arr) => {
    const total = arr.reduce((s, x) => s + x.estimatedTraffic, 0);
    return { ...p, trafficPercentage: Math.round((p.estimatedTraffic / total) * 1000) / 10 };
  });
}

export const keywordFunctionsService = {
  /** production: httpsCallable(functions, 'importKeywords') */
  async callImportKeywords(input: ImportKeywordsInput): Promise<ImportKeywordsOutput> {
    await delay(700);
    void input;
    return { imported: 12, updated: 34 };
  },

  /** production: httpsCallable(functions, 'analyzeKeywordGap', { timeout: 300_000 }) */
  async callAnalyzeKeywordGap(input: AnalyzeKeywordGapInput): Promise<AnalyzeKeywordGapOutput> {
    await delay(1500); // the real function chews through the full extraction
    const run = _createGapAnalysis(
      input.ethDomain,
      input.competitorDomains.length > 0 ? input.competitorDomains : [...COMPETITOR_DOMAINS.slice(0, 3)],
    );
    return {
      analysisId: run.analysisId,
      totalAnalyzed: run.totalKeywordsAnalyzed,
      counts: run.counts,
      totalGapTraffic: run.totalGapTraffic,
    };
  },

  /** production: httpsCallable(functions, 'refreshKeywordData') */
  async callRefreshKeywordData(): Promise<RefreshKeywordDataOutput> {
    await delay(800);
    _touchKeywordStore();
    return { refreshed: 26, flagged: 3 };
  },

  /** production: httpsCallable(functions, 'exploreKeywords') */
  async callExploreKeywords(input: ExploreKeywordsInput): Promise<ExploreKeywordsOutput> {
    await delay(650);
    const keywords = generateExplorerKeywords(input.seed);
    const clusters: Record<string, number> = {};
    for (const k of keywords) clusters[k.cluster] = (clusters[k.cluster] ?? 0) + 1;
    return { keywords, clusters };
  },

  /** production: httpsCallable(functions, 'analyzeTopPages', { timeout: 180_000 }) */
  async callAnalyzeTopPages(input: AnalyzeTopPagesInput): Promise<AnalyzeTopPagesOutput> {
    await delay(1000);
    const pages = generateTopPages(input.domain);
    return {
      pages,
      stats: {
        totalPages: pages.length,
        monthlyTraffic: pages.reduce((s, p) => s + p.estimatedTraffic, 0),
        page1Keywords: pages.reduce((s, p) => s + Math.round(p.keywordsCount * 0.3), 0),
        avgAuthority: int(rng(hashString(input.domain + 'auth')), 38, 76),
      },
    };
  },
};
