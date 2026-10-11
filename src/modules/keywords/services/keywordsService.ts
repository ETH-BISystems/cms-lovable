/**
 * MOCK keywords service — in-memory replacement for the production Firestore
 * `keywords` collection readers.
 *
 * production:
 *   getKeywords()         → getDocs(query(collection(db,'keywords'), orderBy('opportunityScore','desc')))
 *   subscribeToKeywords() → onSnapshot(same query)
 *   getKeywordById()      → getDoc(doc(db,'keywords',id))
 */

import { delay } from '@/services/_delay';
import type {
  CompetitorRanking,
  KeywordOpportunity,
  KeywordFormat,
  RelatedKeyword,
  SerpFeature,
  TopicCluster,
} from '../types';
import { hashString, rng, int, pick, pickN, trendSeries, COMPETITOR_DOMAINS, SERP_FEATURE_POOL } from './_seed';

const COLLECTION = 'keywords'; // production Firestore collection (kept for reference)

interface SeedRow {
  keyword: string;
  searchVolume: number;
  kd: number;
  cpc: number;
  cluster: TopicCluster;
  format: KeywordFormat;
  intent: KeywordOpportunity['intent'];
  revenue: KeywordOpportunity['revenuePotential'];
  ethPosition?: number; // undefined → no-content
  article?: string;
  cardLinks?: string[];
}

const SEED_ROWS: SeedRow[] = [
  { keyword: 'amex platinum vs chase sapphire reserve', searchVolume: 14800, kd: 58, cpc: 4.85, cluster: 'Amex Cards', format: 'Comparison', intent: 'Commercial', revenue: 'High', ethPosition: 7, article: 'Amex Platinum vs Chase Sapphire Reserve: 2026 Showdown', cardLinks: ['amex-platinum', 'chase-sapphire-reserve'] },
  { keyword: 'capital one venture x review', searchVolume: 22200, kd: 61, cpc: 5.4, cluster: 'Capital One', format: 'Review', intent: 'Commercial', revenue: 'High', ethPosition: 4, article: 'Capital One Venture X Review: Still the Easiest Premium Card', cardLinks: ['capital-one-venture-x'] },
  { keyword: 'chase 5/24 rule explained', searchVolume: 9900, kd: 34, cpc: 2.1, cluster: 'Chase Cards', format: 'Guide', intent: 'Informational', revenue: 'Medium', ethPosition: 2, article: 'Chase 5/24 Rule Explained: Every Exception', },
  { keyword: 'best amex transfer partners', searchVolume: 6600, kd: 41, cpc: 3.05, cluster: 'Transfer Partners', format: 'Guide', intent: 'Informational', revenue: 'High', ethPosition: 5, article: 'The 8 Best Amex Membership Rewards Transfer Partners', },
  { keyword: 'priority pass select vs lounge key', searchVolume: 1900, kd: 22, cpc: 1.35, cluster: 'Lounges', format: 'Comparison', intent: 'Commercial', revenue: 'Medium', },
  { keyword: 'how to book ana first class with points', searchVolume: 2400, kd: 27, cpc: 1.85, cluster: 'Airlines', format: 'Guide', intent: 'Informational', revenue: 'High', },
  { keyword: 'marriott bonvoy platinum benefits', searchVolume: 4400, kd: 36, cpc: 2.4, cluster: 'Hotels', format: 'Program Guide', intent: 'Informational', revenue: 'Medium', ethPosition: 11, article: 'Marriott Bonvoy Platinum Elite Benefits, Ranked', },
  { keyword: 'bilt mastercard review', searchVolume: 18100, kd: 55, cpc: 4.1, cluster: 'Strategy', format: 'Review', intent: 'Commercial', revenue: 'High', ethPosition: 9, article: 'Bilt Mastercard Review: Pay Rent, Earn Points', cardLinks: ['bilt-mastercard'] },
  { keyword: 'chase sapphire preferred sign up bonus', searchVolume: 12100, kd: 48, cpc: 6.25, cluster: 'Chase Cards', format: 'Deal Alert', intent: 'Transactional', revenue: 'High', ethPosition: 3, article: 'Chase Sapphire Preferred 75k Bonus: Worth It?', cardLinks: ['chase-sapphire-preferred'] },
  { keyword: 'amex gold vs amex platinum', searchVolume: 8100, kd: 52, cpc: 4.6, cluster: 'Amex Cards', format: 'Comparison', intent: 'Commercial', revenue: 'High', },
  { keyword: 'hyatt globalist status worth it', searchVolume: 1300, kd: 18, cpc: 1.15, cluster: 'Hotels', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
  { keyword: 'best credit card for airport lounge access', searchVolume: 5400, kd: 44, cpc: 3.9, cluster: 'Lounges', format: 'Listicle', intent: 'Commercial', revenue: 'High', ethPosition: 6, article: 'The 6 Best Credit Cards for Airport Lounge Access', },
  { keyword: 'fifth freedom flights explained', searchVolume: 1600, kd: 15, cpc: 0.85, cluster: 'Airlines', format: 'Guide', intent: 'Informational', revenue: 'Low', },
  { keyword: 'singapore airlines suites class points', searchVolume: 2900, kd: 31, cpc: 2.05, cluster: 'Airlines', format: 'Guide', intent: 'Informational', revenue: 'High', },
  { keyword: 'hilton honors diamond status', searchVolume: 3600, kd: 33, cpc: 2.2, cluster: 'Hotels', format: 'Program Guide', intent: 'Informational', revenue: 'Medium', ethPosition: 14, article: 'Hilton Honors Diamond Status: Full Benefits Guide', },
  { keyword: 'virgin atlantic flying club sweet spots', searchVolume: 1100, kd: 20, cpc: 1.05, cluster: 'Transfer Partners', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
  { keyword: 'ink business preferred 100k bonus', searchVolume: 2800, kd: 39, cpc: 5.05, cluster: 'Chase Cards', format: 'Deal Alert', intent: 'Transactional', revenue: 'High', },
  { keyword: 'how to avoid amex once per lifetime rule', searchVolume: 950, kd: 12, cpc: 0.95, cluster: 'Strategy', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
  { keyword: 'qatar airways qsuites award availability', searchVolume: 2100, kd: 25, cpc: 1.65, cluster: 'Airlines', format: 'Guide', intent: 'Informational', revenue: 'High', ethPosition: 8, article: 'How to Actually Find Qatar QSuites Award Space', },
  { keyword: 'amex centurion lounge locations', searchVolume: 4900, kd: 29, cpc: 1.5, cluster: 'Lounges', format: 'Listicle', intent: 'Navigational', revenue: 'Low', ethPosition: 5, article: 'Every Amex Centurion Lounge Location, Ranked', },
  { keyword: 'capital one transfer partners list', searchVolume: 3300, kd: 30, cpc: 2.55, cluster: 'Transfer Partners', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
  { keyword: 'united club infinite card benefits', searchVolume: 2600, kd: 37, cpc: 3.35, cluster: 'Airlines', format: 'Review', intent: 'Commercial', revenue: 'Medium', },
  { keyword: 'rakuten shopping portal amex points', searchVolume: 1400, kd: 16, cpc: 1.25, cluster: 'Deals', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
  { keyword: 'global entry vs tsa precheck', searchVolume: 27100, kd: 46, cpc: 2.75, cluster: 'Trusted Traveler', format: 'Comparison', intent: 'Informational', revenue: 'Low', ethPosition: 12, article: 'Global Entry vs TSA PreCheck: Which to Get', },
  { keyword: 'chase trifecta strategy', searchVolume: 1900, kd: 23, cpc: 1.95, cluster: 'Strategy', format: 'Guide', intent: 'Informational', revenue: 'High', },
  { keyword: 'etihad guest miles sweet spots', searchVolume: 720, kd: 14, cpc: 0.8, cluster: 'Transfer Partners', format: 'Guide', intent: 'Informational', revenue: 'Medium', },
];

function buildCompetitors(rand: () => number, keyword: string): CompetitorRanking[] {
  return pickN(rand, COMPETITOR_DOMAINS, 3).map((site, i) => ({
    site,
    position: i + 1 + int(rand, 0, 2),
    pageTitle: `${keyword.replace(/\b\w/g, c => c.toUpperCase())} — ${site.split('.')[0]}`,
    url: `https://www.${site}/${keyword.replace(/\s+/g, '-')}`,
    wordCount: int(rand, 1400, 4200),
    datePublished: new Date(Date.now() - int(rand, 30, 700) * 864e5).toISOString().slice(0, 10),
  }));
}

function buildRelated(rand: () => number, keyword: string, intent: KeywordOpportunity['intent']): RelatedKeyword[] {
  const mods = ['how to', 'best', 'vs', 'review', 'worth it', 'for beginners'];
  return pickN(rand, mods, 4).map(m => ({
    keyword: `${m} ${keyword}`,
    volume: int(rand, 150, 3200),
    intent: rand() > 0.5 ? intent : 'Informational',
  }));
}

function buildTopResults(rand: () => number, keyword: string) {
  return COMPETITOR_DOMAINS.slice(0, 5).map((domain) => ({
    title: `${keyword.replace(/\b\w/g, c => c.toUpperCase())} | ${domain.split('.')[0]}`,
    url: `https://www.${domain}/${keyword.replace(/\s+/g, '-')}`,
    wordCount: int(rand, 1200, 4800),
  }));
}

function buildKeyword(row: SeedRow, idx: number): KeywordOpportunity {
  const rand = rng(hashString(row.keyword));
  const createdAt = new Date(Date.now() - int(rand, 20, 300) * 864e5);
  const serpFeatures = pickN(rand, SERP_FEATURE_POOL, int(rand, 1, 3)) as SerpFeature[];
  const opportunityScore = Math.min(100, Math.round(
    (row.searchVolume / 300) + (100 - row.kd) * 0.55 + (row.revenue === 'High' ? 18 : row.revenue === 'Medium' ? 9 : 2),
  ));
  const ranking = row.ethPosition !== undefined;
  return {
    id: `kw_${String(idx + 1).padStart(3, '0')}`,
    keyword: row.keyword,
    searchVolume: row.searchVolume,
    kd: row.kd,
    cpc: row.cpc,
    revenuePotential: row.revenue,
    revenueRationale: row.revenue === 'High'
      ? 'Strong card-affiliate intent; readers are close to an application decision.'
      : row.revenue === 'Medium'
        ? 'Monetizable via card links and portal affiliates with the right CTA placement.'
        : 'Mostly informational; builds topical authority and internal-link equity.',
    opportunityScore,
    contentGapScore: int(rand, 20, 95),
    competitors: buildCompetitors(rand, row.keyword),
    ethStatus: ranking ? 'ranking' : 'no-content',
    ethRankPosition: row.ethPosition,
    ethArticleTitle: row.article,
    ethArticleId: row.article ? `article_${idx + 1}` : undefined,
    format: row.format,
    topicCluster: row.cluster,
    monthlyTrend: trendSeries(rand, row.searchVolume),
    relatedKeywords: buildRelated(rand, row.keyword, row.intent),
    aiRationale: `"${row.keyword}" sits in the ${row.cluster} cluster with ${row.searchVolume.toLocaleString()} monthly searches and a beatable KD of ${row.kd}. ${ranking ? `We already rank #${row.ethPosition} — a refresh could push it into the top 3.` : 'No ETH content yet — a focused guide could win this SERP.'}`,
    cardLinksTo: row.cardLinks,
    topGoogleResults: buildTopResults(rand, row.keyword),
    serpFeatures,
    intent: row.intent,
    backlinksToRank: int(rand, 5, 120),
    cpcTrend: pick(rand, ['rising', 'falling', 'stable'] as const),
    positionHistory: ranking ? trendSeries(rand, row.ethPosition!).map(v => Math.max(1, v)).slice(-8) : undefined,
    createdAt,
    updatedAt: new Date(createdAt.getTime() + int(rand, 5, 60) * 864e5),
    lastRefreshedAt: new Date(Date.now() - int(rand, 1, 14) * 864e5),
  };
}

// In-memory store (sorted like the production query: opportunityScore desc).
let keywordsStore: KeywordOpportunity[] | null = null;
function store(): KeywordOpportunity[] {
  if (!keywordsStore) {
    keywordsStore = SEED_ROWS.map(buildKeyword).sort((a, b) => b.opportunityScore - a.opportunityScore);
  }
  return keywordsStore;
}

type KeywordListener = (keywords: KeywordOpportunity[]) => void;
const listeners = new Set<KeywordListener>();

function emit(): void {
  const sorted = store();
  listeners.forEach(cb => cb(sorted));
}

/** Fetch all keyword opportunity documents (one-time read). */
export async function getKeywords(): Promise<KeywordOpportunity[]> {
  await delay(300);
  return store();
}

/**
 * Subscribe to the keywords collection. The mock emits the seed set once after
 * a short delay (and re-emits on any later in-memory mutation).
 */
export function subscribeToKeywords(
  callback: (keywords: KeywordOpportunity[]) => void,
  onError?: (error: Error) => void,
): () => void {
  void onError; // the mock store never errors
  listeners.add(callback);
  const timer = setTimeout(() => {
    if (listeners.has(callback)) callback(store());
  }, 350);
  return () => {
    clearTimeout(timer);
    listeners.delete(callback);
  };
}

/** Fetch a single keyword document by ID. */
export async function getKeywordById(id: string): Promise<KeywordOpportunity | null> {
  await delay(200);
  return store().find(k => k.id === id) ?? null;
}

/** Internal: allow other mocks (refresh callable) to poke the store. */
export function _touchKeywordStore(): void {
  keywordsStore = store().map(k => ({ ...k, lastRefreshedAt: new Date() }));
  emit();
}
