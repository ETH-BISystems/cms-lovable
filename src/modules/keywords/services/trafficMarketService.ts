/**
 * MOCK Traffic & Market service — in-memory replacement for the production
 * trafficMarket_* Cloud Functions (Similarweb adapter, Sessions 29–41).
 *
 * The mock serves the production "sample mode" contract: `meta.dataSource:
 * 'sample'` with clickstream sections populated, so every chart, sankey,
 * quadrant and gated card renders exactly like a fully keyed deployment.
 *
 * production callables (all httpsCallable(functions, name, { timeout: 180000 })):
 *   trafficMarket_summary, trafficMarket_channels, trafficMarket_journey,
 *   trafficMarket_structure, trafficMarket_geo, trafficMarket_marketOverview,
 *   trafficMarket_topPages, trafficMarket_aiTraffic, trafficMarket_channelView,
 *   trafficMarket_sources, trafficMarket_status, trafficMarket_setApiKey,
 *   trafficMarket_historyList, trafficMarket_historyGet, trafficMarket_historyDelete
 */

import { delay } from '@/services/_delay';
import type {
  AiEngine,
  AiTrafficResult,
  DistributionChannel,
  HistoryGetResult,
  HistoryListInput,
  HistoryListResult,
  SetApiKeyInput,
  SetApiKeyResult,
  TrafficChannel,
  TrafficMarketStatus,
  ChannelViewInput,
  ChannelViewResult,
  DomainSeries,
  MarketOverviewResult,
  SourcesDestinationsResult,
  TrafficChannelsResult,
  TrafficGeoResult,
  TrafficJourneyResult,
  TrafficMarketInput,
  TrafficMarketMeta,
  TrafficMetricKey,
  TrafficStructureResult,
  TrafficSummaryResult,
  TrafficTopPagesResult,
  TrendingPageCard,
  SeoHistoryPage,
} from '../types/trafficMarket';
import { hashString, rng, int, pick, pickN, trailingMonths, trendSeries, KW } from './_seed';
import { addHistorySnapshot, deleteHistory, getHistory, listHistory } from './_historyStore';

/** Input for single-domain surfaces (journey, structure, geo, top pages). */
export interface DomainScopedInput extends TrafficMarketInput {
  domain?: string;
}

const DEFAULT_DOMAINS = ['elitetravelhackers.com', 'thepointsguy.com', 'onemileatatime.com'];

const ALL_CHANNELS: TrafficChannel[] = [
  'direct', 'ai_traffic', 'referral', 'organic_search', 'google_ai_mode', 'paid_search',
  'organic_social', 'paid_social', 'email', 'display_ads', 'featured_snippet', 'local_pack',
];

const AI_ENGINES: AiEngine[] = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok', 'deepseek', 'copilot'];

function meta(input: TrafficMarketInput | undefined): TrafficMarketMeta {
  return {
    dataSource: 'sample',
    clickstream: true,
    region: input?.region ?? 'us',
    months: trailingMonths(input?.months ?? 12),
    lastUpdated: new Date().toISOString(),
  };
}

function domainsOf(input: TrafficMarketInput | undefined): string[] {
  return input?.domains && input.domains.length > 0 ? input.domains : DEFAULT_DOMAINS;
}

/** Per-domain base visit level, stable for a domain string. */
function domainBase(domain: string): number {
  const rand = rng(hashString(domain));
  return int(rand, 60000, 2400000);
}

function seriesFor(domains: string[], points: number, scale = 1): DomainSeries[] {
  return domains.map(domain => ({
    domain,
    values: trendSeries(rng(hashString(domain + '|trend')), Math.round(domainBase(domain) * scale), points),
  }));
}

function snapshot(page: SeoHistoryPage, section: string, domains: string[], payload: unknown, input?: TrafficMarketInput, channel?: DistributionChannel): void {
  if (input?.saveHistory === false) return;
  addHistorySnapshot({ page, section, domains, channel: channel ?? null, provider: 'mixed', payload });
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

function buildSummary(input: TrafficMarketInput): TrafficSummaryResult {
  const domains = domainsOf(input);
  const m = meta(input);
  const points = m.months.length;
  const rows = domains.map(domain => {
    const rand = rng(hashString(domain + '|summary'));
    const visits = domainBase(domain);
    const delta = () => Math.round((rand() * 16 - 6) * 10) / 10;
    return {
      domain,
      visits,
      visitsDeltaPct: delta(),
      organicVisits: Math.round(visits * (0.35 + rand() * 0.2)),
      paidVisits: Math.round(visits * (0.04 + rand() * 0.08)),
      uniqueVisitors: Math.round(visits * (0.55 + rand() * 0.2)),
      uniqueVisitorsDeltaPct: delta(),
      pagesPerVisit: Math.round((2.2 + rand() * 3.4) * 100) / 100,
      pagesPerVisitDeltaPct: delta(),
      avgVisitDuration: int(rand, 85, 420),
      avgVisitDurationDeltaPct: delta(),
      bounceRate: Math.round((0.28 + rand() * 0.34) * 1000) / 1000,
      bounceRateDeltaPct: delta(),
      desktopShare: Math.round((0.3 + rand() * 0.3) * 100) / 100,
      mobileShare: 0, // filled below
    };
  });
  for (const r of rows) r.mobileShare = Math.round((1 - (r.desktopShare ?? 0.5)) * 100) / 100;
  const trends = {
    visits: seriesFor(domains, points),
    uniqueVisitors: seriesFor(domains, points, 0.62),
    pagesPerVisit: seriesFor(domains, points, 0.000004),
    avgVisitDuration: seriesFor(domains, points, 0.0002),
    bounceRate: seriesFor(domains, points, 0.0000003),
  } as Record<TrafficMetricKey, DomainSeries[]>;
  return {
    meta: m,
    rows,
    trends,
    searchTrends: {
      organic: seriesFor(domains, points, 0.45),
      paid: seriesFor(domains, points, 0.06),
    },
  };
}

function buildChannels(input: TrafficMarketInput): TrafficChannelsResult {
  const domains = domainsOf(input);
  const m = meta(input);
  const shares: Record<TrafficChannel, number> = {
    direct: 0.22, ai_traffic: 0.03, referral: 0.08, organic_search: 0.34, google_ai_mode: 0.02,
    paid_search: 0.06, organic_social: 0.07, paid_social: 0.03, email: 0.05, display_ads: 0.02,
    featured_snippet: 0.05, local_pack: 0.03,
  };
  const distribution = ALL_CHANNELS.map(channel => {
    const visitsByDomain: Record<string, number> = {};
    for (const d of domains) {
      visitsByDomain[d] = Math.round(domainBase(d) * shares[channel] * (0.75 + rng(hashString(d + channel))() * 0.5));
    }
    return { channel, visitsByDomain };
  });
  const trends: Partial<Record<TrafficChannel, DomainSeries[]>> = {};
  for (const c of ALL_CHANNELS) trends[c] = seriesFor(domains, m.months.length, shares[c]);
  return { meta: m, availableChannels: ALL_CHANNELS, distribution, trends };
}

const SOURCE_NAMES: Array<{ name: string; channel: TrafficChannel }> = [
  { name: 'google.com', channel: 'organic_search' },
  { name: 'reddit.com', channel: 'referral' },
  { name: 'flyertalk.com', channel: 'referral' },
  { name: 'facebook.com', channel: 'organic_social' },
  { name: 'newsletter', channel: 'email' },
  { name: 'bing.com', channel: 'organic_search' },
  { name: 'chatgpt.com', channel: 'ai_traffic' },
  { name: 'youtube.com', channel: 'referral' },
];
const DEST_NAMES: Array<{ name: string; channel: TrafficChannel }> = [
  { name: 'americanexpress.com', channel: 'referral' },
  { name: 'creditcards.chase.com', channel: 'referral' },
  { name: 'capitalone.com', channel: 'referral' },
  { name: 'google.com', channel: 'organic_search' },
  { name: 'airlines', channel: 'direct' },
  { name: 'hotel sites', channel: 'direct' },
];

function buildJourney(input: DomainScopedInput): TrafficJourneyResult {
  const domain = input.domain ?? domainsOf(input)[0];
  const rand = rng(hashString(domain + '|journey'));
  const flows = (names: typeof SOURCE_NAMES) => {
    let remaining = 1;
    return names.map((n, i) => {
      const share = i === names.length - 1 ? remaining : Math.round(remaining * (0.15 + rand() * 0.35) * 1000) / 1000;
      remaining = Math.max(0, Math.round((remaining - share) * 1000) / 1000);
      return { name: n.name, share, deltaPct: Math.round((rand() * 6 - 2.5) * 10) / 10, channel: n.channel };
    });
  };
  return { meta: meta(input), domain, sources: flows(SOURCE_NAMES), destinations: flows(DEST_NAMES) };
}

function buildStructure(input: DomainScopedInput): TrafficStructureResult {
  const domain = input.domain ?? domainsOf(input)[0];
  const rand = rng(hashString(domain + '|structure'));
  const mkRows = (prefixes: string[]) => {
    let remaining = 1;
    return prefixes.map((page, i) => {
      const share = i === prefixes.length - 1 ? remaining : Math.round(remaining * (0.2 + rand() * 0.3) * 1000) / 1000;
      remaining = Math.max(0, Math.round((remaining - share) * 1000) / 1000);
      const visitors = Math.round(domainBase(domain) * share);
      return { page, trafficShare: share, uniquePageviews: Math.round(visitors * 1.4), uniqueVisitors: visitors };
    });
  };
  return {
    meta: meta(input),
    domain,
    pages: mkRows([
      '/best-travel-credit-cards', '/amex-platinum-review', '/chase-sapphire-reserve-review',
      '/airline-transfer-partners', '/priority-pass-guide', '/hotel-elite-status-guide',
      '/venture-x-review', '/award-booking-basics',
    ]),
    subfolders: mkRows(['/reviews/', '/guides/', '/credit-cards/', '/airlines/', '/hotels/', '/deals/']),
    subdomains: mkRows([domain, `blog.${domain}`, `guides.${domain}`]),
  };
}

function buildGeo(input: DomainScopedInput): TrafficGeoResult {
  const domain = input.domain ?? domainsOf(input)[0];
  const rand = rng(hashString(domain + '|geo'));
  const countries = [
    { code: 'us', name: 'United States', share: 0.52 },
    { code: 'gb', name: 'United Kingdom', share: 0.11 },
    { code: 'ca', name: 'Canada', share: 0.09 },
    { code: 'au', name: 'Australia', share: 0.07 },
    { code: 'de', name: 'Germany', share: 0.05 },
    { code: 'in', name: 'India', share: 0.04 },
    { code: 'sg', name: 'Singapore', share: 0.03 },
    { code: 'ae', name: 'United Arab Emirates', share: 0.02 },
  ];
  const base = domainBase(domain);
  return {
    meta: meta(input),
    domain,
    countries: countries.map(c => ({
      countryCode: c.code,
      countryName: c.name,
      share: c.share,
      visits: Math.round(base * c.share),
      desktopShare: Math.round((0.3 + rand() * 0.35) * 100) / 100,
      mobileShare: 0,
      uniqueVisitors: Math.round(base * c.share * 0.62),
    })).map(c => ({ ...c, mobileShare: Math.round((1 - (c.desktopShare ?? 0.5)) * 100) / 100 })),
  };
}

function buildMarketOverview(input: TrafficMarketInput): MarketOverviewResult {
  const domains = domainsOf(input).length > 3 ? domainsOf(input) : [...DEFAULT_DOMAINS, 'viewfromthewing.com', 'upgradedpoints.com'];
  const m = meta(input);
  const rand = rng(hashString(domains.join('|') + '|market'));
  const players = domains.map(domain => {
    const visits = domainBase(domain);
    const channelEntry = (c: TrafficChannel, f: number) => [c, { visits: Math.round(visits * f), diffPct: Math.round((rand() * 14 - 5) * 10) / 10 }] as const;
    return {
      domain,
      marketSharePct: 0, // filled below
      visits,
      visitsDeltaPct: Math.round((rand() * 18 - 7) * 10) / 10,
      channels: Object.fromEntries([
        channelEntry('organic_search', 0.36),
        channelEntry('direct', 0.24),
        channelEntry('referral', 0.09),
        channelEntry('paid_search', 0.05),
        channelEntry('organic_social', 0.08),
        channelEntry('ai_traffic', 0.03),
      ]),
    };
  });
  const total = players.reduce((s, p) => s + p.visits, 0);
  for (const p of players) p.marketSharePct = Math.round((p.visits / total) * 1000) / 10;
  const axisOptions = [
    { id: 'visits', label: 'Visits' },
    { id: 'growth', label: 'Growth %' },
    { id: 'pagesPerVisit', label: 'Pages / Visit' },
    { id: 'bounceRate', label: 'Bounce Rate' },
  ];
  return {
    meta: m,
    domainsCount: players.length,
    marketTraffic: total,
    marketTrafficDeltaPct: Math.round((rand() * 10 - 3) * 10) / 10,
    keyPlayers: [...players].sort((a, b) => b.visits - a.visits).slice(0, 3),
    players,
    quadrant: {
      axisOptions,
      points: players.map(p => ({
        domain: p.domain,
        metrics: {
          visits: p.visits,
          growth: p.visitsDeltaPct ?? 0,
          pagesPerVisit: Math.round((2 + rand() * 3.5) * 100) / 100,
          bounceRate: Math.round((0.3 + rand() * 0.3) * 100) / 100,
        },
      })),
    },
    marketTrafficTrend: seriesFor(['market'], m.months.length, total),
  };
}

function trendingCards(rand: () => number, domain: string): TrendingPageCard[] {
  const pages = pickN(rand, [
    '/qatar-qsuites-award-guide', '/amex-centurion-lounge-list', '/chase-5-24-rule',
    '/bilt-card-review', '/virgin-atlantic-sweet-spots', '/hyatt-globalist-guide',
    '/award-chart-tool', '/rakuten-portal-guide',
  ], 5);
  return pages.map((page, i) => ({
    page,
    visits: int(rand, 800, 22000),
    changePct: i < 2 ? int(rand, 30, 240) : i < 4 ? -int(rand, 10, 55) : null,
    trend: trendSeries(rand, int(rand, 800, 22000), 12),
    bucket: i < 2 ? 'growing' : i < 4 ? 'declining' : 'new',
  }));
}

function buildTopPages(input: DomainScopedInput): TrafficTopPagesResult {
  const domain = input.domain ?? domainsOf(input)[0];
  const rand = rng(hashString(domain + '|tm-top-pages'));
  const paths = [
    '/best-travel-credit-cards', '/amex-platinum-review', '/chase-sapphire-reserve-review',
    '/airline-transfer-partners', '/priority-pass-guide', '/hotel-status-matcher',
    '/venture-x-review', '/marriott-bonvoy-guide', '/award-booking-basics',
    '/centurion-lounge-locations', '/hyatt-globalist-benefits', '/monthly-card-bonuses',
    '/bilt-review', '/united-mileageplus-guide', '/5-24-rule-explained', '/stopover-guide',
  ];
  let remaining = 1;
  const rows = paths.map((page, i) => {
    const share = i === paths.length - 1 ? remaining : Math.round(remaining * (0.14 + rand() * 0.3) * 1000) / 1000;
    remaining = Math.max(0, Math.round((remaining - share) * 1000) / 1000);
    const visits = Math.round(domainBase(domain) * share);
    return {
      page,
      trafficShare: share,
      yearTrend: trendSeries(rand, visits, 12),
      visits,
      keywordCount: int(rand, 30, 1400),
      uniquePageviews: Math.round(visits * 1.45),
      uniqueVisitors: visits,
      avgVisitDuration: int(rand, 70, 380),
      channelShares: {
        organic_search: Math.round((0.3 + rand() * 0.3) * 100) / 100,
        direct: Math.round((0.15 + rand() * 0.2) * 100) / 100,
        referral: Math.round((0.05 + rand() * 0.1) * 100) / 100,
        ai_traffic: Math.round(rand() * 0.06 * 100) / 100,
      },
    };
  });
  return {
    meta: meta(input),
    domain,
    trending: trendingCards(rand, domain),
    trendingNote: null,
    rows,
    totalCount: int(rand, 180, 900),
    pulledCount: rows.length,
  };
}

function buildAiTraffic(input: TrafficMarketInput): AiTrafficResult {
  const domains = domainsOf(input);
  const m = meta(input);
  const distribution = {} as Record<AiEngine, Record<string, number>>;
  const trends = {} as Record<AiEngine, DomainSeries[]>;
  const topGrowingPages = {} as Record<AiEngine, TrendingPageCard[]>;
  for (const engine of AI_ENGINES) {
    const rand = rng(hashString(engine + '|ai'));
    const byDomain: Record<string, number> = {};
    for (const d of domains) byDomain[d] = Math.round(domainBase(d) * 0.008 * (0.3 + rand() * 2.4));
    distribution[engine] = byDomain;
    trends[engine] = seriesFor(domains, m.months.length, 0.008 * (0.3 + rand() * 2));
    topGrowingPages[engine] = trendingCards(rand, domains[0]).slice(0, 3);
  }
  const sources = [
    { source: 'chatgpt.com', category: 'AI Chat', engine: 'chatgpt' as AiEngine },
    { source: 'gemini.google.com', category: 'AI Chat', engine: 'gemini' as AiEngine },
    { source: 'claude.ai', category: 'AI Chat', engine: 'claude' as AiEngine },
    { source: 'perplexity.ai', category: 'AI Answer Engine', engine: 'perplexity' as AiEngine },
    { source: 'copilot.microsoft.com', category: 'AI Chat', engine: 'copilot' as AiEngine },
  ].map(s => {
    const rand = rng(hashString(s.source));
    const split: Record<string, number> = {};
    let remaining = 1;
    for (const d of domains) {
      const v = Math.round(remaining * (0.2 + rand() * 0.5) * 1000) / 1000;
      split[d] = v;
      remaining = Math.max(0, Math.round((remaining - v) * 1000) / 1000);
    }
    return { ...s, groupTrafficSplit: split, groupTrafficSharePct: Math.round((5 + rand() * 40) * 10) / 10 };
  });
  return {
    meta: m,
    trafficGated: false,
    engines: AI_ENGINES,
    distribution,
    trends,
    topGrowingPages,
    sources,
    visibilityJoin: AI_ENGINES.slice(0, 5).map(engine => {
      const rand = rng(hashString(engine + '|join'));
      return {
        engine,
        visibilityScore: Math.round(rand() * 60 * 10) / 10,
        trafficSharePct: Math.round(rand() * 45 * 10) / 10,
        monthlyVisits: int(rand, 200, 14000),
      };
    }),
  };
}

function buildChannelView(input: ChannelViewInput): ChannelViewResult {
  const domains = domainsOf(input);
  const m = meta(input);
  const rand = rng(hashString(input.channel + '|view'));
  const channelScale: Record<DistributionChannel, number> = {
    referral: 0.08, organic_search: 0.36, paid_search: 0.06, organic_social: 0.07,
    paid_social: 0.03, email: 0.05, display_ads: 0.02,
  };
  const scale = channelScale[input.channel];
  const isSearch = input.channel === 'organic_search' || input.channel === 'paid_search';
  const hasSources = input.channel !== 'email' && input.channel !== 'display_ads';
  const aiMode = input.channel === 'organic_search' && input.organicMode === 'ai_mode';
  return {
    meta: m,
    channel: input.channel,
    deviceSplitAvailable: true,
    channelGated: false,
    trends: {
      all: seriesFor(domains, m.months.length, scale),
      desktop: seriesFor(domains, m.months.length, scale * 0.42),
      mobile: seriesFor(domains, m.months.length, scale * 0.58),
    },
    topGrowingPages: trendingCards(rand, domains[0]),
    topSources: hasSources
      ? SOURCE_NAMES.filter(s => s.channel === input.channel || rand() > 0.6).slice(0, 5).map(s => ({
          name: s.name,
          share: Math.round((0.1 + rand() * 0.5) * 1000) / 1000,
          deltaPct: Math.round((rand() * 8 - 3) * 10) / 10,
          channel: s.channel,
        }))
      : null,
    topKeywords: isSearch
      ? pickN(rand, [...KW.cards, ...KW.travel, ...KW.strategy], 24).map(term => ({ term, weight: int(rand, 8, 100) }))
      : null,
    topKeywordsTotalCount: isSearch ? int(rand, 300, 2400) : null,
    aiModePresence: aiMode,
  };
}

function buildSources(input: TrafficMarketInput): SourcesDestinationsResult {
  const domains = domainsOf(input);
  const rand = rng(hashString(domains.join('|') + '|sources'));
  const mkRows = (names: typeof SOURCE_NAMES) => names.map(n => {
    const split: Record<string, number> = {};
    let remaining = 1;
    for (const d of domains) {
      const v = Math.round(remaining * (0.2 + rand() * 0.5) * 1000) / 1000;
      split[d] = v;
      remaining = Math.max(0, Math.round((remaining - v) * 1000) / 1000);
    }
    return {
      name: n.name,
      category: pick(rand, ['Search', 'Community', 'News', 'Social', 'AI Chat', 'Travel'] as const),
      channel: n.channel,
      groupTrafficSplit: split,
      groupTrafficSharePct: Math.round((4 + rand() * 34) * 10) / 10,
    };
  });
  const sources = mkRows(SOURCE_NAMES);
  const destinations = mkRows(DEST_NAMES);
  const channelCounts: Array<{ channel: TrafficChannel | 'total'; count: number }> = [
    { channel: 'total', count: sources.length + destinations.length },
  ];
  for (const c of ['organic_search', 'referral', 'direct', 'ai_traffic', 'email'] as TrafficChannel[]) {
    channelCounts.push({ channel: c, count: [...sources, ...destinations].filter(r => r.channel === c).length });
  }
  return {
    meta: meta(input),
    gated: false,
    channelCounts,
    sources,
    destinations,
    categories: ['Search', 'Community', 'News', 'Social', 'AI Chat', 'Travel'],
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const trafficMarketService = {
  /** production: httpsCallable(functions, 'trafficMarket_summary') */
  async summary(input: TrafficMarketInput): Promise<TrafficSummaryResult> {
    await delay(700);
    const result = buildSummary(input);
    snapshot('traffic-analytics', 'summary', domainsOf(input), result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_channels') */
  async channels(input: TrafficMarketInput): Promise<TrafficChannelsResult> {
    await delay(650);
    const result = buildChannels(input);
    snapshot('traffic-analytics', 'channels', domainsOf(input), result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_journey') */
  async journey(input: DomainScopedInput): Promise<TrafficJourneyResult> {
    await delay(600);
    const result = buildJourney(input);
    snapshot('traffic-analytics', 'journey', [result.domain], result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_structure') */
  async structure(input: DomainScopedInput): Promise<TrafficStructureResult> {
    await delay(600);
    const result = buildStructure(input);
    snapshot('traffic-analytics', 'structure', [result.domain], result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_geo') */
  async geo(input: DomainScopedInput): Promise<TrafficGeoResult> {
    await delay(600);
    const result = buildGeo(input);
    snapshot('traffic-analytics', 'geo', [result.domain], result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_marketOverview') */
  async marketOverview(input: TrafficMarketInput): Promise<MarketOverviewResult> {
    await delay(750);
    const result = buildMarketOverview(input);
    snapshot('market-overview', 'marketOverview', domainsOf(input), result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_topPages') */
  async topPages(input: DomainScopedInput): Promise<TrafficTopPagesResult> {
    await delay(700);
    const result = buildTopPages(input);
    snapshot('top-pages', 'topPages', [result.domain], result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_aiTraffic') */
  async aiTraffic(input: TrafficMarketInput): Promise<AiTrafficResult> {
    await delay(700);
    const result = buildAiTraffic(input);
    snapshot('ai-traffic', 'aiTraffic', domainsOf(input), result, input);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_channelView') */
  async channelView(input: ChannelViewInput): Promise<ChannelViewResult> {
    await delay(650);
    const result = buildChannelView(input);
    snapshot('distribution', 'channelView', domainsOf(input), result, input, input.channel);
    return result;
  },

  /** production: httpsCallable(functions, 'trafficMarket_sources') */
  async sources(input: TrafficMarketInput): Promise<SourcesDestinationsResult> {
    await delay(650);
    const result = buildSources(input);
    snapshot('sources', 'sources', domainsOf(input), result, input);
    return result;
  },

  /** Key/sample-mode status for the Settings card; {test:true} adds a live ping. */
  async status(input: { test?: boolean }): Promise<TrafficMarketStatus> {
    await delay(250);
    return {
      keyConfigured: true,
      keySource: 'secret-manager',
      maskedKey: 'sw_9f2••••',
      sampleMode: true,
      ...(input?.test ? { connection: { ok: true, message: 'Similarweb reachable — sample mode active for this demo.' } } : {}),
    };
  },

  /** Admin-only: verify + store a Similarweb API key in Secret Manager. */
  async setApiKey(input: SetApiKeyInput): Promise<SetApiKeyResult> {
    await delay(500);
    if (!input.apiKey || input.apiKey.trim().length < 8) {
      return { success: false, tested: true, message: 'That key was rejected by the Similarweb API.' };
    }
    return { success: true, tested: true, message: 'Key verified and stored (mock — sample mode stays on).' };
  },

  /** History: list snapshots for a page (filter by domain/date, cursor-paged). */
  async historyList(input: HistoryListInput): Promise<HistoryListResult> {
    await delay(250);
    return listHistory(input);
  },

  /** History: load one snapshot's full payload. */
  async historyGet(input: { id: string }): Promise<HistoryGetResult> {
    await delay(300);
    const found = getHistory(input.id);
    if (!found) throw new Error(`History snapshot ${input.id} not found`);
    return found;
  },

  /** History: delete one snapshot. */
  async historyDelete(input: { id: string }): Promise<{ success: boolean }> {
    await delay(250);
    return { success: deleteHistory(input.id) };
  },
};

// ---------------------------------------------------------------------------
// Seed: saved searches across the Traffic & Market pages so history-first
// gates open populated (production accumulates these from real usage).
// ---------------------------------------------------------------------------

function seedTrafficHistory(): void {
  const entry = (daysAgo: number, page: SeoHistoryPage, section: string, domains: string[], payload: unknown, channel?: DistributionChannel) =>
    addHistorySnapshot({
      page,
      section,
      domains,
      channel: channel ?? null,
      provider: 'mixed',
      payload,
      createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    });

  const twelveMonths: TrafficMarketInput = { domains: DEFAULT_DOMAINS, months: 12 };
  entry(1, 'traffic-analytics', 'summary', DEFAULT_DOMAINS, buildSummary(twelveMonths));
  entry(2, 'traffic-analytics', 'channels', DEFAULT_DOMAINS, buildChannels(twelveMonths));
  entry(3, 'traffic-analytics', 'journey', [DEFAULT_DOMAINS[0]], buildJourney({ ...twelveMonths, domain: DEFAULT_DOMAINS[0] }));
  entry(3, 'traffic-analytics', 'structure', [DEFAULT_DOMAINS[0]], buildStructure({ ...twelveMonths, domain: DEFAULT_DOMAINS[0] }));
  entry(4, 'traffic-analytics', 'geo', [DEFAULT_DOMAINS[0]], buildGeo({ ...twelveMonths, domain: DEFAULT_DOMAINS[0] }));
  entry(1, 'market-overview', 'marketOverview', DEFAULT_DOMAINS, buildMarketOverview(twelveMonths));
  entry(2, 'top-pages', 'topPages', [DEFAULT_DOMAINS[0]], buildTopPages({ ...twelveMonths, domain: DEFAULT_DOMAINS[0] }));
  entry(2, 'ai-traffic', 'aiTraffic', DEFAULT_DOMAINS, buildAiTraffic(twelveMonths));
  entry(3, 'distribution', 'channelView', DEFAULT_DOMAINS, buildChannelView({ ...twelveMonths, channel: 'organic_search' }), 'organic_search');
  entry(4, 'distribution', 'channelView', DEFAULT_DOMAINS, buildChannelView({ ...twelveMonths, channel: 'referral' }), 'referral');
  entry(2, 'sources', 'sources', DEFAULT_DOMAINS, buildSources(twelveMonths));
}

seedTrafficHistory();
