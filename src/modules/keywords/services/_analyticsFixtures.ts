/**
 * MOCK-ONLY — shared fixture builders for the seoAnalytics_* result shapes.
 * Used by seoAnalyticsService (live calls) and keywordHistoryService (saved
 * snapshots), so a history entry's payload is indistinguishable from a fresh
 * search for the same input.
 */

import type {
  DomainOverviewResult,
  KeywordOverviewResult,
  KeywordSerpRow,
  IdeaKeyword,
} from '../types/analytics';
import { hashString, rng, int, pick, pickN, trendSeries, trailingMonths, KW, DFS_FEATURE_POOL, COMPETITOR_DOMAINS } from './_seed';

const RANKING_BUCKETS = ['1-3', '4-10', '11-20', '21-50', '51-100'];

export function buildIdeaKeywords(rand: () => number, seed: string, count: number): IdeaKeyword[] {
  const mods = ['', 'review', 'guide', 'vs', 'best', 'how to', 'tips', 'worth it', '2026', 'explained', 'for beginners'];
  const out = new Map<string, IdeaKeyword>();
  for (const mod of pickN(rand, mods, Math.min(count, mods.length))) {
    const keyword = mod ? `${seed} ${mod}` : seed;
    out.set(keyword, {
      keyword,
      volume: int(rand, 100, 18000),
      kd: int(rand, 5, 80),
      cpc: Math.round((0.3 + rand() * 6) * 100) / 100,
      intent: pick(rand, ['informational', 'commercial', 'transactional', 'navigational'] as const),
    });
  }
  return [...out.values()];
}

export function buildSerpRows(rand: () => number, keyword: string, count = 10): KeywordSerpRow[] {
  const domains = pickN(rand, COMPETITOR_DOMAINS, Math.min(count, COMPETITOR_DOMAINS.length));
  const rows: KeywordSerpRow[] = [];
  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    const title = `${keyword.replace(/\b\w/g, c => c.toUpperCase())} — ${domain.split('.')[0].replace(/^\w/, c => c.toUpperCase())}`;
    rows.push({
      position: i + 1,
      title,
      url: `https://www.${domain}/${keyword.replace(/\s+/g, '-')}`,
      domain,
      description: `Everything you need to know about ${keyword}: strategies, comparisons, and expert picks for ${new Date().getFullYear()}.`,
      features: pickN(rand, DFS_FEATURE_POOL, int(rand, 0, 2)),
    });
  }
  return rows;
}

export function buildKeywordOverview(keyword: string): KeywordOverviewResult {
  const rand = rng(hashString(keyword.toLowerCase()));
  const months = trailingMonths(12);
  const volume = int(rand, 800, 26000);
  const kd = int(rand, 8, 78);
  const cpc = Math.round((0.5 + rand() * 6) * 100) / 100;
  const trend = trendSeries(rand, volume).map((v, i) => ({ date: months[i], volume: v }));
  const countries = [
    { country: 'United States', code: 'us', share: 0.62 },
    { country: 'United Kingdom', code: 'gb', share: 0.11 },
    { country: 'Canada', code: 'ca', share: 0.08 },
    { country: 'Australia', code: 'au', share: 0.07 },
    { country: 'Germany', code: 'de', share: 0.04 },
    { country: 'India', code: 'in', share: 0.03 },
  ];
  const serpFeatures = pickN(rand, DFS_FEATURE_POOL, int(rand, 2, 5));
  return {
    keyword,
    volume,
    adsVolume: {
      volume,
      competitionLevel: pick(rand, ['LOW', 'MEDIUM', 'HIGH'] as const),
      competitionIndex: int(rand, 5, 95),
      cpc,
      lowBid: Math.round(cpc * 0.4 * 100) / 100,
      highBid: Math.round(cpc * 1.8 * 100) / 100,
    },
    kdSource: 'labs',
    kd,
    cpc,
    competition: Math.round(rand() * 100) / 100,
    competitionLevel: pick(rand, ['LOW', 'MEDIUM', 'HIGH'] as const),
    intent: pick(rand, ['informational', 'commercial', 'transactional', 'navigational'] as const),
    foreignIntents: rand() > 0.5 ? ['informational'] : [],
    resultsCount: int(rand, 2_000_000, 180_000_000),
    serpFeatures,
    avgBacklinks: int(rand, 40, 900),
    avgReferringDomains: int(rand, 15, 220),
    globalVolume: countries.map(c => ({ country: c.country, code: c.code, volume: Math.round(volume * c.share * (0.8 + rand() * 0.4)) })),
    trend,
    variations: buildIdeaKeywords(rand, keyword, 8),
    variationsTotal: int(rand, 120, 1400),
    questions: pickN(rand, KW.questions, 6).map(k => ({
      keyword: k,
      volume: int(rand, 80, 3400),
      kd: int(rand, 4, 55),
      cpc: Math.round((0.2 + rand() * 3) * 100) / 100,
      intent: 'informational',
    })),
    related: pickN(rand, [...KW.cards, ...KW.travel], 8).map(k => ({
      keyword: k,
      volume: int(rand, 200, 21000),
      kd: int(rand, 10, 75),
      cpc: Math.round((0.4 + rand() * 5) * 100) / 100,
      intent: pick(rand, ['informational', 'commercial'] as const),
    })),
    serp: buildSerpRows(rand, keyword),
    totalCount: int(rand, 400, 2600),
    pulledCount: 60,
  };
}

export function buildDomainOverview(domain: string): DomainOverviewResult {
  const rand = rng(hashString(domain));
  const organicKeywords = int(rand, 18000, 240000);
  const organicTraffic = int(rand, 120000, 2400000);
  const topKeywords = pickN(rand, [...KW.cards, ...KW.travel, ...KW.strategy], 12).map(keyword => ({
    keyword,
    position: int(rand, 1, 32),
    volume: int(rand, 400, 30000),
    kd: int(rand, 10, 80),
    cpc: Math.round((0.4 + rand() * 6) * 100) / 100,
    traffic: int(rand, 150, 14000),
    url: `https://www.${domain}/${keyword.replace(/\s+/g, '-')}`,
    intent: pick(rand, ['informational', 'commercial', 'transactional'] as const),
  }));
  const bucketCounts = [0.06, 0.14, 0.22, 0.33, 0.25].map(f => Math.round(organicKeywords * f));
  return {
    domain,
    metrics: {
      organicTraffic,
      paidTraffic: int(rand, 2000, 90000),
      organicKeywords,
      paidKeywords: int(rand, 300, 8000),
      backlinks: int(rand, 40000, 900000),
      domainRank: int(rand, 120, 9000),
    },
    rankingDistribution: RANKING_BUCKETS.map((bucket, i) => ({ bucket, count: bucketCounts[i] })),
    topKeywords: topKeywords.sort((a, b) => b.traffic - a.traffic),
    intentDistribution: [
      { intent: 'informational', count: Math.round(organicKeywords * 0.58), volume: Math.round(organicTraffic * 0.5) },
      { intent: 'commercial', count: Math.round(organicKeywords * 0.27), volume: Math.round(organicTraffic * 0.33) },
      { intent: 'transactional', count: Math.round(organicKeywords * 0.1), volume: Math.round(organicTraffic * 0.12) },
      { intent: 'navigational', count: Math.round(organicKeywords * 0.05), volume: Math.round(organicTraffic * 0.05) },
    ],
    competitors: COMPETITOR_DOMAINS.filter(d => d !== domain).slice(0, 5).map(d => ({
      domain: d,
      commonKeywords: int(rand, 1200, 26000),
      organicTraffic: int(rand, 80000, 1800000),
      organicKeywords: int(rand, 15000, 210000),
      avgPosition: Math.round((8 + rand() * 22) * 10) / 10,
    })),
    totalCount: organicKeywords,
    pulledCount: 1000,
  };
}
