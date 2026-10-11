/**
 * MOCK Keyword Magic service — in-memory replacement for the production
 * `keywordMagicSearch` Cloud Function (DataForSEO Keyword Database) and the
 * pipeline draft hand-off.
 *
 * production:
 *   keywordMagicSearch → httpsCallable(functions, 'keywordMagicSearch', { timeout: 180000 })
 *   createArticleDraftFromKeywords → httpsCallable(functions, 'createArticle')  (pipeline module)
 * Every search is also snapshotted to the shared history store (production:
 * the function persists a keyword-magic history entry server-side).
 */

import { delay } from '@/services/_delay';
import { callFunction, registerMockFunction } from '@/services/functionsService';
import type { KeywordGroup, KeywordMagicInput, KeywordMagicResult, MagicKeyword } from '../types/magic';
import { hashString, rng, int, pick, pickN, trendSeries, DFS_FEATURE_POOL, KW } from './_seed';
import { addHistorySnapshot } from './_historyStore';

// The pipeline's article-creation callable — same registration the Content
// Gap page uses (production: httpsCallable(functions, 'createArticle')).
registerMockFunction('createArticle', async () => ({ success: true, articleId: 'article_mock' }));

const MODIFIERS = [
  '', 'review', 'vs', 'alternatives', 'benefits', 'how to apply', 'sign up bonus',
  'annual fee', 'worth it', 'for travel', 'for beginners', 'tips', 'guide',
  'requirements', 'credit score', 'vs cash back', '2026', 'explained', 'strategy',
];
const QUESTION_STARTS = ['how to', 'what is', 'can you', 'is', 'does', 'when should', 'which', 'why'];
const GROUP_WORDS = ['review', 'bonus', 'lounge', 'transfer', 'status', 'apply', 'fee', 'points', 'hotel', 'flight'];

function generateMagicKeywords(seed: string): MagicKeyword[] {
  const rand = rng(hashString(seed.toLowerCase()));
  const base = seed.toLowerCase().trim();
  const out = new Map<string, MagicKeyword>();

  const mk = (keyword: string, source: MagicKeyword['source']): void => {
    if (out.has(keyword)) return;
    const volume = int(rand, 90, 33000);
    const kd = int(rand, 4, 88);
    const features = pickN(rand, DFS_FEATURE_POOL, int(rand, 0, 4));
    out.set(keyword, {
      keyword,
      volume,
      kd,
      cpc: Math.round((0.25 + rand() * 7.5) * 100) / 100,
      competition: Math.round(rand() * 100) / 100,
      intent: pick(rand, ['informational', 'commercial', 'transactional', 'navigational'] as const),
      serpFeatures: features,
      trend: trendSeries(rand, volume),
      source,
      updatedAt: new Date(Date.now() - int(rand, 0, 21) * 864e5).toISOString(),
    });
  };

  // Suggestions: seed + modifiers.
  for (const mod of pickN(rand, MODIFIERS, 18)) {
    mk(mod ? `${base} ${mod}` : base, 'suggestions');
  }
  // Questions.
  for (const q of pickN(rand, QUESTION_STARTS, 8)) {
    mk(`${q} ${base}`, 'suggestions');
  }
  // Related: travel-niche vocabulary (the DFS "related" source).
  for (const rel of pickN(rand, [...KW.cards, ...KW.travel, ...KW.strategy], 16)) {
    mk(rel, 'related');
  }
  // Ideas (the DFS Keyword Database source — broader drift).
  for (const rel of pickN(rand, KW.questions, 10)) {
    mk(rel, 'ideas');
  }

  // Relevance-first ordering: exact/phrase seed matches lead, then volume.
  return [...out.values()].sort((a, b) => {
    const aExact = a.keyword === base ? 0 : a.keyword.includes(base) ? 1 : 2;
    const bExact = b.keyword === base ? 0 : b.keyword.includes(base) ? 1 : 2;
    if (aExact !== bExact) return aExact - bExact;
    return b.volume - a.volume;
  });
}

function buildGroups(keywords: MagicKeyword[]): KeywordGroup[] {
  const groups: KeywordGroup[] = [];
  for (const word of GROUP_WORDS) {
    const members = keywords.filter(k => k.keyword.split(/\s+/).some(t => t.replace(/[^a-z0-9]/g, '') === word));
    if (members.length > 0) {
      groups.push({
        name: word,
        count: members.length,
        totalVolume: members.reduce((s, k) => s + k.volume, 0),
      });
    }
  }
  return groups.sort((a, b) => b.count - a.count).slice(0, 8);
}

/**
 * Call the keywordMagicSearch Cloud Function.
 * Returns the full merged keyword set (suggestions + related + ideas) for a seed.
 */
export async function keywordMagicSearch(input: KeywordMagicInput): Promise<KeywordMagicResult> {
  await delay(900);
  const keywords = generateMagicKeywords(input.seed);
  const result: KeywordMagicResult = {
    seed: input.seed.trim(),
    keywords,
    totalCount: keywords.length + int(rng(hashString(input.seed + 'total')), 200, 900),
    groups: buildGroups(keywords),
  };
  // Production: the function snapshots every search to keyword-magic history.
  addHistorySnapshot({
    page: 'keyword-magic',
    section: 'search',
    domains: [result.seed],
    provider: 'dataforseo',
    payload: result,
  });
  return result;
}

// Seed: saved Keyword Magic searches so the standalone page's history gate
// has entries on first open (production accumulates these from real usage).
{
  const seedMagic = (seed: string, daysAgo: number) => {
    const keywords = generateMagicKeywords(seed);
    const result: KeywordMagicResult = {
      seed,
      keywords,
      totalCount: keywords.length + int(rng(hashString(seed + 'total')), 200, 900),
      groups: buildGroups(keywords),
    };
    addHistorySnapshot({
      page: 'keyword-magic',
      section: 'search',
      domains: [seed],
      provider: 'dataforseo',
      payload: result,
      createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    });
  };
  seedMagic('travel credit card', 1);
  seedMagic('amex transfer partners', 3);
}

function titleCase(keyword: string): string {
  return keyword.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Create one article draft in the pipeline from selected Keyword Magic
 * keywords — reuses the pipeline's `createArticle` callable (the same
 * function behind Content Gap's "export to pipeline" and the intelligence
 * engine's Create Draft action). The highest-volume keyword becomes the
 * target keyword and title; the rest become secondary keywords.
 */
export async function createArticleDraftFromKeywords(
  keywords: MagicKeyword[],
  seed: string,
): Promise<{ title: string; targetKeyword: string }> {
  if (keywords.length === 0) {
    throw new Error('Select at least one keyword first.');
  }
  const sorted = [...keywords].sort((a, b) => b.volume - a.volume);
  const primary = sorted[0];
  const secondary = sorted.slice(1).map(k => k.keyword);
  const title = titleCase(primary.keyword);

  const summary = sorted.slice(0, 12)
    .map(k => `"${k.keyword}" (${k.volume.toLocaleString()}/mo, KD ${k.kd})`)
    .join(', ');

  // production: httpsCallable(functions, 'createArticle')
  await callFunction('createArticle', {
    title,
    targetKeyword: primary.keyword,
    secondaryKeywords: secondary,
    assignee: { name: 'Unassigned', avatar: 'UN' },
    priority: primary.volume >= 1000 && primary.kd <= 49 ? 'High' : 'Medium',
    entryPoint: 'Keyword Magic',
    source: { type: 'Keyword Research', label: `Keyword Magic — "${seed}"` },
    editorialNotes: `Created from a Keyword Magic selection (seed "${seed}"): ${summary}${sorted.length > 12 ? ` +${sorted.length - 12} more` : ''}.`,
  });
  return { title, targetKeyword: primary.keyword };
}
