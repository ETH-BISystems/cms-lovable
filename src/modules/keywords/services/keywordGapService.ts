/**
 * MOCK keyword-gap service — in-memory replacement for the production
 * Firestore readers over `keyword-gaps` and `keyword-gap-analyses`.
 *
 * production:
 *   getGapResults(analysisId)   → getDocs(query(collection(db,'keyword-gaps'), where('analysisId','==',analysisId)))
 *   getGapAnalysisRun(id)       → getDoc(doc(db,'keyword-gap-analyses',id))
 *   getLatestGapAnalysis()      → getDocs(query(collection(db,'keyword-gap-analyses'), orderBy('createdAt','desc'), limit(1)))
 */

import { delay } from '@/services/_delay';
import { mockId } from '@/services/_delay';
import type { KeywordGap, GapAnalysisRun, GapType, KeywordIntent } from '../types';
import { hashString, rng, int, pick, pickN, KW, SERP_FEATURE_POOL, COMPETITOR_DOMAINS } from './_seed';

interface GapStore {
  runs: GapAnalysisRun[];
  gaps: KeywordGap[];
}

let gapStore: GapStore | null = null;

const GAP_KEYWORD_POOL = [...KW.cards, ...KW.travel, ...KW.strategy, ...KW.questions];

function generateGaps(analysisId: string, competitors: string[], rand: () => number): KeywordGap[] {
  const keywords = pickN(rand, GAP_KEYWORD_POOL, int(rand, 16, 22));
  return keywords.map((keyword, i) => {
    const gapType: GapType = pick(rand, ['missing', 'weak', 'untapped', 'strong', 'unique'] as const);
    const competitorPositions: Record<string, number> = {};
    for (const c of competitors) {
      if (rand() > 0.25) competitorPositions[c] = int(rand, 1, 30);
    }
    return {
      id: `${analysisId}_gap_${i}`,
      keyword,
      volume: int(rand, 300, 22000),
      kd: int(rand, 8, 75),
      cpc: Math.round((0.4 + rand() * 6) * 100) / 100,
      intent: pick(rand, ['Informational', 'Commercial', 'Transactional', 'Navigational'] as const) as KeywordIntent,
      ethPosition: gapType === 'weak' ? int(rand, 11, 45) : undefined,
      competitorPositions,
      gapType,
      topRankingDomain: pick(rand, competitors),
      recommendedFormat: pick(rand, ['Guide', 'Review', 'Comparison', 'Listicle'] as const),
      serpFeatures: pickN(rand, SERP_FEATURE_POOL, int(rand, 0, 3)) as KeywordGap['serpFeatures'],
      analysisId,
      createdAt: new Date(),
    };
  });
}

function createRun(ethDomain: string, competitors: string[]): GapAnalysisRun {
  const rand = rng(hashString(`${ethDomain}|${competitors.join(',')}`));
  const analysisId = mockId('analysis');
  const gaps = generateGaps(analysisId, competitors, rand);
  const counts: Record<GapType, number> = { missing: 0, weak: 0, strong: 0, unique: 0, untapped: 0 };
  for (const g of gaps) counts[g.gapType] += 1;
  const run: GapAnalysisRun = {
    analysisId,
    ethDomain,
    competitorDomains: competitors,
    totalKeywordsAnalyzed: int(rand, 4000, 14000),
    counts,
    totalGapTraffic: gaps.reduce((sum, g) => sum + g.volume, 0),
    createdAt: new Date(),
    createdBy: 'mock-admin',
  };
  gapStore!.runs.unshift(run);
  gapStore!.gaps.push(...gaps);
  return run;
}

function store(): GapStore {
  if (!gapStore) {
    gapStore = { runs: [], gaps: [] };
    // Seed one historical run (backdated) so the page opens with data.
    const run = createRun('elitetravelhackers.com', [...COMPETITOR_DOMAINS.slice(0, 3)]);
    run.createdAt = new Date(Date.now() - 4 * 864e5);
    for (const g of gapStore.gaps) g.createdAt = run.createdAt;
  }
  return gapStore;
}

/** Fetch keyword-gap documents for a specific analysis run. */
export async function getGapResults(analysisId: string): Promise<KeywordGap[]> {
  await delay(250);
  return store().gaps.filter(g => g.analysisId === analysisId);
}

/** Fetch gap analysis run metadata by analysisId. */
export async function getGapAnalysisRun(analysisId: string): Promise<GapAnalysisRun | null> {
  await delay(200);
  return store().runs.find(r => r.analysisId === analysisId) ?? null;
}

/** Fetch the most recent gap analysis run. */
export async function getLatestGapAnalysis(): Promise<GapAnalysisRun | null> {
  await delay(200);
  const runs = store().runs;
  return runs.length > 0 ? runs[0] : null;
}

/**
 * Internal hook for the mocked `analyzeKeywordGap` callable — production
 * writes these docs server-side; here the callable mock routes through this.
 */
export function _createGapAnalysis(ethDomain: string, competitorDomains: string[]): GapAnalysisRun {
  store();
  return createRun(ethDomain, competitorDomains);
}
