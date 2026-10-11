/**
 * MOCK seoAnalytics service — in-memory replacement for the production
 * seoAnalytics_* Cloud Functions (DataForSEO Labs / SERP / Backlinks /
 * Content Analysis / Business Data / On-Page APIs).
 *
 * production callables (all httpsCallable(functions, name, { timeout: 180000 })):
 *   seoAnalytics_domainOverview, seoAnalytics_competitors, seoAnalytics_traffic,
 *   seoAnalytics_serpAnalysis, seoAnalytics_trends, seoAnalytics_contentGap,
 *   seoAnalytics_topPages, seoAnalytics_keywordOverview,
 *   seoAnalytics_organicResearch, seoAnalytics_backlinks,
 *   seoAnalytics_aiVisibility, seoAnalytics_brandMonitoring,
 *   seoAnalytics_pageAudit, seoAnalytics_businessListings
 *
 * Every mocked call snapshots its result into the shared history store, the
 * same way production persists one history entry per search.
 */

import { delay } from '@/services/_delay';
import type {
  AiVisibilityInput,
  AiVisibilityResult,
  BrandMonitoringInput,
  BrandMonitoringResult,
  BusinessListingsInput,
  BusinessListingsResult,
  PageAuditInput,
  PageAuditResult,
  BacklinksInput,
  BacklinksResult,
  CompetitorsInput,
  CompetitorsResult,
  ContentGapInput,
  ContentGapResult,
  DomainOverviewInput,
  DomainOverviewResult,
  KeywordOverviewInput,
  KeywordOverviewResult,
  OrganicResearchInput,
  OrganicResearchResult,
  SerpAnalysisInput,
  SerpAnalysisResult,
  TopPagesInput,
  TopPagesResult,
  TrafficInput,
  TrafficResult,
  TrendsInput,
  TrendsResult,
  PositionKeyword,
  AiPromptResponse,
} from '../types/analytics';
import { hashString, rng, int, pick, pickN, trailingMonths, trailingDays, trendSeries, KW, COMPETITOR_DOMAINS, DFS_FEATURE_POOL } from './_seed';
import { buildDomainOverview, buildKeywordOverview, buildSerpRows } from './_analyticsFixtures';
import { addHistorySnapshot } from './_historyStore';
import type { SeoHistoryPage } from '../types/trafficMarket';

const CALL_TIMEOUT_MS = 180000; // production parity (comment only)
void CALL_TIMEOUT_MS;

function snapshot(page: SeoHistoryPage, section: string, domains: string[], payload: unknown): void {
  addHistorySnapshot({ page, section, domains, provider: 'dataforseo', payload });
}

// ---------- individual result builders ----------

function buildCompetitors(input: CompetitorsInput): CompetitorsResult {
  const rand = rng(hashString(input.domain + '|competitors'));
  const domains = COMPETITOR_DOMAINS.filter(d => d !== input.domain);
  const competitors = domains.map(domain => ({
    domain,
    commonKeywords: int(rand, 1500, 32000),
    organicTraffic: int(rand, 90000, 2200000),
    paidTraffic: int(rand, 1000, 120000),
    organicKeywords: int(rand, 20000, 260000),
    avgPosition: Math.round((9 + rand() * 20) * 10) / 10,
  }));
  const comparedWith = input.compareWith ?? null;
  const sharedKeywords = comparedWith
    ? pickN(rand, [...KW.cards, ...KW.travel, ...KW.strategy], 14).map(keyword => ({
        keyword,
        ourPosition: rand() > 0.2 ? int(rand, 1, 40) : null,
        theirPosition: rand() > 0.2 ? int(rand, 1, 40) : null,
        volume: int(rand, 300, 26000),
        kd: int(rand, 8, 78),
        cpc: Math.round((0.4 + rand() * 6) * 100) / 100,
      }))
    : [];
  return {
    domain: input.domain,
    competitors,
    comparedWith,
    sharedKeywords,
    totalCount: int(rand, 800, 5200),
    pulledCount: competitors.length,
  };
}

function buildTraffic(input: TrafficInput): TrafficResult {
  const rand = rng(hashString(input.domain + '|traffic'));
  const months = trailingMonths(12);
  let organic = int(rand, 400000, 900000);
  const traffic = months.map(date => {
    organic = Math.round(organic * (0.94 + rand() * 0.16));
    return {
      date,
      organic,
      paid: Math.round(organic * (0.05 + rand() * 0.12)),
      featuredSnippet: Math.round(organic * (0.01 + rand() * 0.03)),
      localPack: Math.round(organic * (0.002 + rand() * 0.01)),
    };
  });
  let top3 = int(rand, 600, 2400);
  const rankings = months.map(date => {
    top3 = Math.max(50, Math.round(top3 * (0.93 + rand() * 0.18)));
    return {
      date,
      top3,
      pos4_10: top3 * int(rand, 2, 4),
      pos11_20: top3 * int(rand, 3, 6),
      pos21_50: top3 * int(rand, 6, 10),
      pos51_100: top3 * int(rand, 8, 14),
    };
  });
  const last = traffic[traffic.length - 1];
  const prev = traffic[traffic.length - 2];
  const pct = (a: number, b: number) => (b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10);
  return {
    domain: input.domain,
    traffic,
    rankings,
    momChanges: [
      { metric: 'Organic traffic', thisMonth: last.organic, lastMonth: prev.organic, changePct: pct(last.organic, prev.organic) },
      { metric: 'Paid traffic', thisMonth: last.paid, lastMonth: prev.paid, changePct: pct(last.paid, prev.paid) },
      { metric: 'Featured snippets', thisMonth: last.featuredSnippet, lastMonth: prev.featuredSnippet, changePct: pct(last.featuredSnippet, prev.featuredSnippet) },
      { metric: 'Top 3 keywords', thisMonth: rankings[11].top3, lastMonth: rankings[10].top3, changePct: pct(rankings[11].top3, rankings[10].top3) },
    ],
  };
}

function buildSerpAnalysis(input: SerpAnalysisInput): SerpAnalysisResult {
  const rand = rng(hashString(input.keyword.toLowerCase() + '|serp'));
  const results = buildSerpRows(rand, input.keyword, 20).map(r => ({
    position: r.position,
    title: r.title,
    url: r.url,
    domain: r.domain,
    features: r.features ?? [],
  }));
  const historyDomains = COMPETITOR_DOMAINS.slice(0, 4);
  const days = trailingDays(30);
  const positions: Record<string, number> = {};
  for (const d of historyDomains) positions[d] = int(rand, 2, 20);
  const history = days.map(date => {
    const point: Record<string, string | number | null> = { date };
    for (const d of historyDomains) {
      positions[d] = Math.max(1, Math.min(50, positions[d] + int(rand, -2, 2)));
      point[d] = rand() > 0.06 ? positions[d] : null;
    }
    return point as SerpAnalysisResult['history'][number];
  });
  const competitors = historyDomains.map(domain => ({
    domain,
    position: positions[domain],
    visibility: Math.round((100 - positions[domain]) * rand() * 10) / 10,
    estTraffic: int(rand, 800, 42000),
  }));
  return {
    keyword: input.keyword,
    results,
    features: pickN(rand, DFS_FEATURE_POOL, int(rand, 2, 5)),
    history,
    historyDomains: [...historyDomains],
    competitors,
    aiOverview: rand() > 0.4
      ? { present: true, referencedDomains: pickN(rand, COMPETITOR_DOMAINS, 3) as string[] }
      : { present: false, referencedDomains: [] },
    peopleAlsoAsk: pickN(rand, KW.questions, 4) as string[],
    autocomplete: [
      `${input.keyword} review`, `${input.keyword} vs`, `${input.keyword} worth it`,
      `${input.keyword} guide`, `${input.keyword} 2026`,
    ],
    totalCount: int(rand, 60, 100),
    pulledCount: results.length,
  };
}

function buildTrends(input: TrendsInput): TrendsResult {
  const keywords = input.keywords.slice(0, 5);
  const rand = rng(hashString(keywords.join('|') + (input.timeRange ?? '') + (input.type ?? '')));
  const points = input.timeRange === 'past_7_days' ? trailingDays(7)
    : input.timeRange === 'past_30_days' ? trailingDays(30)
    : trailingMonths(input.timeRange === 'past_5_years' ? 60 : input.timeRange === 'past_90_days' ? 3 : 12);
  const bases: Record<string, number> = {};
  for (const k of keywords) bases[k] = int(rand, 25, 85);
  const interestOverTime = points.map(date => {
    const row: Record<string, string | number | null> = { date };
    for (const k of keywords) {
      bases[k] = Math.max(5, Math.min(100, bases[k] + int(rand, -8, 9)));
      row[k] = bases[k];
    }
    return row as TrendsResult['interestOverTime'][number];
  });
  const regions = ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington', 'Colorado'].map(region => {
    const row: Record<string, string | number | null> = { region };
    for (const k of keywords) row[k] = int(rand, 20, 100);
    return row as TrendsResult['regions'][number];
  });
  const ageBuckets = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(bucket => {
    const row: Record<string, string | number | null> = { bucket };
    for (const k of keywords) row[k] = int(rand, 5, 100);
    return row as TrendsResult['demography']['age'][number];
  });
  const genderBuckets = ['Female', 'Male'].map(bucket => {
    const row: Record<string, string | number | null> = { bucket };
    for (const k of keywords) row[k] = bucket === 'Female' ? int(rand, 35, 55) : int(rand, 45, 65);
    return row as TrendsResult['demography']['gender'][number];
  });
  const relatedPool = [...KW.cards, ...KW.travel, ...KW.strategy];
  return {
    keywords,
    interestOverTime,
    regions,
    demography: { age: ageBuckets, gender: genderBuckets },
    related: {
      top: pickN(rand, relatedPool, 8).map(keyword => ({ keyword, volume: int(rand, 200, 22000), growthPct: null })),
      rising: pickN(rand, relatedPool, 8).map(keyword => ({ keyword, volume: int(rand, 100, 8000), growthPct: int(rand, 40, 480) })),
    },
  };
}

function buildContentGap(input: ContentGapInput): ContentGapResult {
  const competitors = (input.competitors && input.competitors.length > 0)
    ? input.competitors.slice(0, 3)
    : [...COMPETITOR_DOMAINS.filter(d => d !== input.domain).slice(0, 3)];
  const rand = rng(hashString(input.domain + '|' + competitors.join(',')));
  const gaps = pickN(rand, [...KW.cards, ...KW.travel, ...KW.strategy, ...KW.questions], 22).map(keyword => {
    const volume = int(rand, 250, 27000);
    const kd = int(rand, 6, 72);
    return {
      keyword,
      volume,
      kd,
      cpc: Math.round((0.3 + rand() * 6) * 100) / 100,
      opportunity: Math.min(100, Math.round(volume / 350 + (100 - kd) * 0.5)),
      positions: competitors.map(() => (rand() > 0.2 ? int(rand, 1, 32) : null)) as Array<number | null>,
    };
  }).sort((a, b) => b.opportunity - a.opportunity);
  return {
    domain: input.domain,
    competitors,
    autoDiscovered: !(input.competitors && input.competitors.length > 0),
    gaps,
    totalCount: gaps.length + int(rand, 40, 300),
    pulledCount: gaps.length,
  };
}

function buildTopPages(input: TopPagesInput): TopPagesResult {
  const rand = rng(hashString(input.domain + '|top-pages'));
  const paths = [
    '/best-travel-credit-cards', '/amex-platinum-review', '/chase-sapphire-reserve-vs-preferred',
    '/airline-transfer-partners-guide', '/priority-pass-lounges-list', '/hotel-status-matches',
    '/venture-x-review', '/marriott-bonvoy-complete-guide', '/award-booking-basics',
    '/centurion-lounge-locations', '/hyatt-globalist-benefits', '/credit-card-bonuses-this-month',
    '/how-to-fly-first-class-cheap', '/bilt-card-review', '/united-mileageplus-guide',
    '/5-24-rule-explained', '/stopover-guide', '/best-business-cards',
  ];
  const pages = paths.slice(0, int(rand, 14, 18)).map((url, i) => {
    const traffic = Math.round(int(rand, 800, 40000) / (i * 0.6 + 1));
    return {
      url: `https://www.${input.domain}${url}`,
      keywords: int(rand, 30, 1600),
      traffic,
      trafficShare: 0, // filled below
      topKeyword: pick(rand, [...KW.cards, ...KW.travel]),
      topKeywordPosition: int(rand, 1, 18),
    };
  });
  const total = pages.reduce((s, p) => s + p.traffic, 0);
  for (const p of pages) p.trafficShare = Math.round((p.traffic / total) * 1000) / 10;
  const declining = pickN(rand, pages, 3).map(p => ({
    url: p.url,
    keywordsLost: int(rand, 4, 90),
    keywordsDown: int(rand, 8, 140),
    traffic: Math.round(p.traffic * 0.4),
    topKeyword: p.topKeyword,
  }));
  return {
    domain: input.domain,
    totalTraffic: total,
    pages,
    declining,
    subdomains: [
      { subdomain: `blog.${input.domain}`, keywords: int(rand, 800, 9000), traffic: Math.round(total * 0.18) },
      { subdomain: `guides.${input.domain}`, keywords: int(rand, 300, 4000), traffic: Math.round(total * 0.07) },
    ],
    totalCount: int(rand, 120, 900),
    pulledCount: pages.length,
  };
}

function buildOrganicResearch(input: OrganicResearchInput): OrganicResearchResult {
  const rand = rng(hashString(input.domain + '|organic'));
  const mkKeyword = (forceChange?: 'new' | 'lost'): PositionKeyword => {
    const keyword = pick(rand, [...KW.cards, ...KW.travel, ...KW.strategy]);
    const position = int(rand, 1, 60);
    const previousPosition = forceChange === 'new' ? null : int(rand, 1, 60);
    const change = previousPosition === null ? null : previousPosition - position;
    return {
      keyword,
      intent: pick(rand, ['informational', 'commercial', 'transactional'] as const),
      position,
      previousPosition,
      change,
      isNew: forceChange === 'new',
      isUp: change !== null && change > 0,
      isDown: change !== null && change < 0,
      isLost: forceChange === 'lost',
      volume: int(rand, 200, 24000),
      kd: int(rand, 8, 80),
      cpc: Math.round((0.4 + rand() * 6) * 100) / 100,
      traffic: int(rand, 20, 5200),
      url: `https://www.${input.domain}/${keyword.replace(/\s+/g, '-')}`,
    };
  };
  const keywords: PositionKeyword[] = [];
  for (let i = 0; i < 14; i++) keywords.push(mkKeyword());
  for (let i = 0; i < 4; i++) keywords.push(mkKeyword('new'));
  const lostKeywords = Array.from({ length: 3 }, () => mkKeyword('lost'));
  const buckets = ['1-3', '4-10', '11-20', '21-50', '51-100'];
  return {
    domain: input.domain,
    metrics: {
      keywords: int(rand, 20000, 190000),
      traffic: int(rand, 150000, 2100000),
      trafficCost: int(rand, 40000, 700000),
      newKeywords: keywords.filter(k => k.isNew).length + int(rand, 40, 300),
      improved: keywords.filter(k => k.isUp).length + int(rand, 60, 400),
      declined: keywords.filter(k => k.isDown).length + int(rand, 50, 380),
      lost: lostKeywords.length + int(rand, 20, 160),
    },
    rankingDistribution: buckets.map((bucket, i) => ({
      bucket,
      count: int(rand, 400, 8000) * (5 - i),
    })),
    keywords: keywords.sort((a, b) => b.traffic - a.traffic),
    lostKeywords,
    totalCount: int(rand, 900, 4200),
    pulledCount: keywords.length,
  };
}

function buildBacklinks(input: BacklinksInput): BacklinksResult {
  const rand = rng(hashString(input.domain + '|backlinks'));
  const months = trailingMonths(12);
  let backlinks = int(rand, 120000, 480000);
  const history = months.map(date => {
    backlinks = Math.round(backlinks * (1.0 + rand() * 0.05));
    return { date, backlinks, referringDomains: Math.round(backlinks / (9 + rand() * 8)) };
  });
  const anchors = [
    'best travel credit cards', 'click here', input.domain, 'travel hacking guide',
    'this review', 'credit card points', 'learn more', 'airline miles explained',
  ].map(anchor => ({ anchor, backlinks: int(rand, 120, 9000), referringDomains: int(rand, 20, 800) }));
  const referringDomainsList = [
    'reddit.com', 'forbes.com', 'cnbc.com', 'nerdwallet.com', 'news.ycombinator.com',
    'thepointsguy.com', 'viewfromthewing.com', 'flyertalk.com', 'doctorofcredit.com', 'nytimes.com',
  ].map(domain => ({ domain, rank: int(rand, 20, 4000), backlinks: int(rand, 2, 400), firstSeen: new Date(Date.now() - int(rand, 90, 2000) * 864e5).toISOString() }));
  const topBacklinks = referringDomainsList.slice(0, 8).map(d => ({
    pageTitle: `Best travel rewards resources for ${new Date().getFullYear()}`,
    urlFrom: `https://www.${d.domain}/resources/best-travel-cards`,
    urlTo: `https://www.${input.domain}/best-travel-credit-cards`,
    anchor: pick(rand, ['best travel credit cards', 'travel hacking guide', input.domain] as const),
    rank: d.rank,
    dofollow: rand() > 0.25,
    firstSeen: d.firstSeen,
  }));
  const totalBl = history[history.length - 1].backlinks;
  return {
    domain: input.domain,
    metrics: {
      rank: int(rand, 150, 6000),
      backlinks: totalBl,
      referringDomains: history[history.length - 1].referringDomains,
      referringIps: Math.round(history[history.length - 1].referringDomains * 0.92),
      brokenBacklinks: int(rand, 40, 900),
      dofollow: Math.round(totalBl * 0.74),
      nofollow: Math.round(totalBl * 0.26),
    },
    history,
    linkTypes: [
      { label: 'Dofollow', count: Math.round(totalBl * 0.74) },
      { label: 'Nofollow', count: Math.round(totalBl * 0.26) },
    ],
    tlds: [
      { label: '.com', count: Math.round(totalBl * 0.68) },
      { label: '.org', count: Math.round(totalBl * 0.09) },
      { label: '.net', count: Math.round(totalBl * 0.06) },
      { label: '.io', count: Math.round(totalBl * 0.04) },
      { label: 'other', count: Math.round(totalBl * 0.13) },
    ],
    countries: [
      { label: 'United States', count: Math.round(totalBl * 0.61) },
      { label: 'United Kingdom', count: Math.round(totalBl * 0.11) },
      { label: 'Canada', count: Math.round(totalBl * 0.08) },
      { label: 'Australia', count: Math.round(totalBl * 0.06) },
      { label: 'Germany', count: Math.round(totalBl * 0.05) },
    ],
    anchors,
    referringDomainsList,
    topBacklinks,
    totalCount: int(rand, 4000, 22000),
    pulledCount: 1000,
  };
}

function buildAiVisibility(input: AiVisibilityInput): AiVisibilityResult {
  const rand = rng(hashString(input.target + input.prompts.join('|')));
  const providers = input.providers ?? ['chat_gpt', 'gemini', 'claude', 'perplexity'];
  const models: Record<string, string> = {
    chat_gpt: 'gpt-5.2', gemini: 'gemini-3-pro', claude: 'claude-opus-4.8', perplexity: 'sonar-pro',
  };
  const responses: AiPromptResponse[] = [];
  for (const prompt of input.prompts.slice(0, 8)) {
    for (const provider of providers) {
      const mentioned = rand() > 0.45;
      const cited = mentioned && rand() > 0.4;
      responses.push({
        prompt,
        provider,
        model: models[provider] ?? 'unknown',
        status: 'ok',
        mentioned,
        cited,
        snippet: mentioned
          ? `…${input.target} is a strong pick for ${prompt.toLowerCase().replace(/\?$/, '')} — it consistently ranks among the top travel-rewards resources…`
          : `…popular options include The Points Guy, NerdWallet and One Mile at a Time for this kind of question…`,
        citations: cited
          ? [{ url: `https://www.${input.target}/best-travel-credit-cards`, domain: input.target, title: 'Best Travel Credit Cards' }]
          : pickN(rand, COMPETITOR_DOMAINS, int(rand, 0, 2)).map(d => ({
              url: `https://www.${d}/best-cards`, domain: d, title: `${d} best cards`,
            })),
      });
    }
  }
  const citedDomains = COMPETITOR_DOMAINS.slice(0, 5).map(domain => ({
    domain,
    count: int(rand, 1, 14),
    isTarget: domain === input.target,
  }));
  citedDomains.push({ domain: input.target, count: int(rand, 2, 12), isTarget: true });
  const months = trailingMonths(6);
  return {
    target: input.target,
    responses,
    citedDomains,
    aiVolume: (input.keywords && input.keywords.length > 0 ? input.keywords : ['travel credit card', 'best airline card']).slice(0, 4).map(keyword => ({
      keyword,
      aiSearchVolume: int(rand, 400, 26000),
      trend: trendSeries(rand, int(rand, 400, 26000), 6).map((volume, i) => ({ date: months[i], volume })),
    })),
  };
}

function buildBrandMonitoring(input: BrandMonitoringInput): BrandMonitoringResult {
  const rand = rng(hashString(input.keyword + '|brand'));
  const total = int(rand, 180, 2400);
  const sentiments = { positive: Math.round(total * 0.52), negative: Math.round(total * 0.09), neutral: 0 };
  sentiments.neutral = total - sentiments.positive - sentiments.negative;
  const domains = ['reddit.com', 'flyertalk.com', 'doctorofcredit.com', 'thepointsguy.com', 'viewfromthewing.com', 'news.ycombinator.com', 'trustpilot.com'];
  const mentions = Array.from({ length: 14 }, (_, i) => {
    const domain = pick(rand, domains);
    return {
      url: `https://www.${domain}/discussion/${hashString(input.keyword + i).toString(36)}`,
      domain,
      domainRank: int(rand, 40, 3000),
      title: `${input.keyword.replace(/\b\w/g, c => c.toUpperCase())} — community discussion #${i + 1}`,
      snippet: `…was comparing notes on ${input.keyword} and the consensus is that the value depends heavily on how you redeem…`,
      sentiment: pick(rand, ['positive', 'positive', 'neutral', 'neutral', 'negative'] as const),
      datePublished: new Date(Date.now() - int(rand, 1, 90) * 864e5).toISOString(),
    };
  });
  return {
    keyword: input.keyword,
    totalMentions: total,
    sentiment: sentiments,
    emotions: [
      { label: 'Joy', count: int(rand, 20, 200) },
      { label: 'Trust', count: int(rand, 30, 260) },
      { label: 'Anticipation', count: int(rand, 10, 120) },
      { label: 'Anger', count: int(rand, 2, 40) },
    ],
    topDomains: domains.slice(0, 6).map(label => ({ label, count: int(rand, 12, 300) })),
    countries: [
      { label: 'United States', count: Math.round(total * 0.58) },
      { label: 'United Kingdom', count: Math.round(total * 0.12) },
      { label: 'Canada', count: Math.round(total * 0.09) },
      { label: 'Australia', count: Math.round(total * 0.07) },
    ],
    pageTypes: [
      { label: 'Forums', count: Math.round(total * 0.44) },
      { label: 'Blogs', count: Math.round(total * 0.31) },
      { label: 'News', count: Math.round(total * 0.15) },
      { label: 'Reviews', count: Math.round(total * 0.1) },
    ],
    mentions,
    totalCount: total,
    pulledCount: mentions.length,
  };
}

function buildPageAudit(input: PageAuditInput): PageAuditResult {
  const rand = rng(hashString(input.url));
  const passed = [
    { key: 'title', label: 'Title tag present and well-formed' },
    { key: 'meta_description', label: 'Meta description present' },
    { key: 'h1', label: 'Exactly one H1 heading' },
    { key: 'https', label: 'Page served over HTTPS' },
    { key: 'canonical', label: 'Canonical link element present' },
    { key: 'viewport', label: 'Viewport meta tag configured' },
    { key: 'image_alt', label: 'Images have alt attributes' },
    { key: 'structured_data', label: 'Valid structured data found' },
  ];
  const issues = [
    { key: 'lcp', label: 'Largest Contentful Paint above 2.5s' },
    { key: 'thin_internal_links', label: 'Few internal links to this page' },
    { key: 'long_title', label: 'Title length exceeds 60 characters' },
  ];
  const issueCount = int(rand, 0, 3);
  const pickedIssues = pickN(rand, issues, issueCount);
  const pickedPassed = passed.filter(p => !pickedIssues.some(i => i.key === p.key));
  return {
    url: input.url,
    statusCode: 200,
    onpageScore: Math.round((72 + rand() * 26) * 10) / 10,
    meta: {
      title: 'Best Travel Credit Cards of 2026 — Elite Travel Hackers',
      titleLength: 52,
      description: 'Compare the best travel credit cards: sign-up bonuses, transfer partners, lounge access and annual fees — updated monthly.',
      descriptionLength: 134,
      canonical: input.url,
      h1Count: 1,
      internalLinks: int(rand, 12, 80),
      externalLinks: int(rand, 2, 18),
      imagesWithoutAlt: int(rand, 0, 3),
    },
    timing: {
      timeToInteractive: Math.round((1.2 + rand() * 3) * 100) / 100,
      domComplete: Math.round((1.6 + rand() * 3.4) * 100) / 100,
      largestContentfulPaint: Math.round((1.4 + rand() * 2.8) * 100) / 100,
    },
    issues: pickedIssues.map(i => ({ ...i, status: 'issue' as const })),
    passed: pickedPassed.map(p => ({ ...p, status: 'passed' as const })),
    lighthouse: {
      performance: int(rand, 62, 96),
      seo: int(rand, 80, 100),
      accessibility: int(rand, 78, 99),
      bestPractices: int(rand, 74, 100),
    },
  };
}

function buildBusinessListings(input: BusinessListingsInput): BusinessListingsResult {
  const rand = rng(hashString(input.query + (input.category ?? '')));
  const categories = ['Travel agency', 'Airline lounge', 'Hotel', 'Credit union', 'Tour operator'];
  const names = [
    'Altitude Travel Co.', 'Meridian Points Advisors', 'Skyward Journeys', 'Harbor & Miles Travel',
    'Compass Rose Travel Group', 'Summit Rewards Consulting', 'Jetset Collective', 'Waypoint Travel Studio',
  ];
  const listings = names.map((name, i) => ({
    title: name,
    category: pick(rand, categories),
    address: `${int(rand, 100, 9999)} ${pick(rand, ['Market St', '5th Ave', 'Wilshire Blvd', 'Michigan Ave', 'Peachtree St'])}, ${pick(rand, ['San Francisco, CA', 'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Atlanta, GA'])}`,
    rating: rand() > 0.15 ? Math.round((3.6 + rand() * 1.4) * 10) / 10 : null,
    reviews: int(rand, 4, 480),
    phone: `+1 (${int(rand, 200, 989)}) ${int(rand, 200, 999)}-${int(rand, 1000, 9999)}`,
    domain: name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.com',
    url: `https://www.${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
    image: `https://picsum.photos/seed/biz-${i}-${hashString(name) % 999}/160/160`,
  }));
  return {
    query: input.query,
    listings,
    totalCount: int(rand, 60, 800),
    pulledCount: listings.length,
  };
}

/** Client for the seoAnalytics_* Cloud Functions (Keyword Magic sub-pages). */
export const seoAnalyticsService = {
  /** production: httpsCallable(functions, 'seoAnalytics_domainOverview') */
  async domainOverview(input: DomainOverviewInput): Promise<DomainOverviewResult> {
    await delay(700);
    const result = buildDomainOverview(input.domain);
    snapshot('domain-overview', 'domainOverview', [input.domain], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_competitors') */
  async competitors(input: CompetitorsInput): Promise<CompetitorsResult> {
    await delay(700);
    const result = buildCompetitors(input);
    snapshot('competitor-analysis', 'competitors', [input.domain, ...(input.compareWith ? [input.compareWith] : [])], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_traffic') */
  async traffic(input: TrafficInput): Promise<TrafficResult> {
    await delay(650);
    const result = buildTraffic(input);
    snapshot('traffic-insights', 'traffic', [input.domain], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_serpAnalysis') */
  async serpAnalysis(input: SerpAnalysisInput): Promise<SerpAnalysisResult> {
    await delay(750);
    const result = buildSerpAnalysis(input);
    snapshot('serp-analysis', 'serpAnalysis', [input.keyword], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_trends') */
  async trends(input: TrendsInput): Promise<TrendsResult> {
    await delay(600);
    const result = buildTrends(input);
    snapshot('keyword-trends', 'trends', input.keywords, result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_contentGap') */
  async contentGap(input: ContentGapInput): Promise<ContentGapResult> {
    await delay(900);
    const result = buildContentGap(input);
    snapshot('content-gap', 'contentGap', [result.domain, ...result.competitors], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_topPages') */
  async topPages(input: TopPagesInput): Promise<TopPagesResult> {
    await delay(750);
    const result = buildTopPages(input);
    snapshot('top-pages-organic', 'topPages', [input.domain], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_keywordOverview') */
  async keywordOverview(input: KeywordOverviewInput): Promise<KeywordOverviewResult> {
    await delay(800);
    const result = buildKeywordOverview(input.keyword);
    snapshot('keyword-overview', 'keywordOverview', [input.keyword], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_organicResearch') */
  async organicResearch(input: OrganicResearchInput): Promise<OrganicResearchResult> {
    await delay(850);
    const result = buildOrganicResearch(input);
    snapshot('organic-research', 'organicResearch', [input.domain], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_backlinks') */
  async backlinks(input: BacklinksInput): Promise<BacklinksResult> {
    await delay(800);
    const result = buildBacklinks(input);
    snapshot('backlink-analytics', 'backlinks', [input.domain], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_aiVisibility') */
  async aiVisibility(input: AiVisibilityInput): Promise<AiVisibilityResult> {
    await delay(1200);
    const result = buildAiVisibility(input);
    snapshot('ai-visibility', 'aiVisibility', [input.target], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_brandMonitoring') */
  async brandMonitoring(input: BrandMonitoringInput): Promise<BrandMonitoringResult> {
    await delay(900);
    const result = buildBrandMonitoring(input);
    snapshot('brand-monitoring', 'brandMonitoring', [input.keyword], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_pageAudit') */
  async pageAudit(input: PageAuditInput): Promise<PageAuditResult> {
    await delay(1100);
    const result = buildPageAudit(input);
    snapshot('page-audit', 'pageAudit', [input.url], result);
    return result;
  },

  /** production: httpsCallable(functions, 'seoAnalytics_businessListings') */
  async businessListings(input: BusinessListingsInput): Promise<BusinessListingsResult> {
    await delay(650);
    const result = buildBusinessListings(input);
    snapshot('business-research', 'businessListings', [input.query], result);
    return result;
  },
};

// ---------------------------------------------------------------------------
// Seed: a believable back-catalog of saved searches so every page's
// history-first gate has something to offer on first open (production
// accumulates these from real usage).
// ---------------------------------------------------------------------------

function seedEntry(
  daysAgo: number,
  page: SeoHistoryPage,
  section: string,
  domains: string[],
  payload: unknown,
): void {
  addHistorySnapshot({
    page,
    section,
    domains,
    provider: 'dataforseo',
    payload,
    createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
  });
}

seedEntry(1, 'keyword-overview', 'keywordOverview', ['amex platinum'], buildKeywordOverview('amex platinum'));
seedEntry(3, 'keyword-overview', 'keywordOverview', ['chase sapphire preferred'], buildKeywordOverview('chase sapphire preferred'));
seedEntry(2, 'domain-overview', 'domainOverview', ['elitetravelhackers.com'], buildDomainOverview('elitetravelhackers.com'));
seedEntry(5, 'domain-overview', 'domainOverview', ['thepointsguy.com'], buildDomainOverview('thepointsguy.com'));
seedEntry(2, 'competitor-analysis', 'competitors', ['elitetravelhackers.com'], buildCompetitors({ domain: 'elitetravelhackers.com' }));
seedEntry(4, 'traffic-insights', 'traffic', ['elitetravelhackers.com'], buildTraffic({ domain: 'elitetravelhackers.com' }));
seedEntry(1, 'serp-analysis', 'serpAnalysis', ['best travel credit cards'], buildSerpAnalysis({ keyword: 'best travel credit cards' }));
seedEntry(6, 'serp-analysis', 'serpAnalysis', ['amex platinum vs chase sapphire reserve'], buildSerpAnalysis({ keyword: 'amex platinum vs chase sapphire reserve' }));
seedEntry(2, 'keyword-trends', 'trends', ['travel credit card', 'airline miles'], buildTrends({ keywords: ['travel credit card', 'airline miles'], timeRange: 'past_12_months' }));
seedEntry(1, 'content-gap', 'contentGap', ['elitetravelhackers.com'], buildContentGap({ domain: 'elitetravelhackers.com' }));
seedEntry(3, 'top-pages-organic', 'topPages', ['elitetravelhackers.com'], buildTopPages({ domain: 'elitetravelhackers.com' }));
seedEntry(2, 'organic-research', 'organicResearch', ['elitetravelhackers.com'], buildOrganicResearch({ domain: 'elitetravelhackers.com' }));
seedEntry(4, 'backlink-analytics', 'backlinks', ['elitetravelhackers.com'], buildBacklinks({ domain: 'elitetravelhackers.com' }));
seedEntry(2, 'ai-visibility', 'aiVisibility', ['elitetravelhackers.com'], buildAiVisibility({ target: 'elitetravelhackers.com', prompts: ['best travel credit card for beginners', 'how to get airport lounge access'] }));
seedEntry(3, 'brand-monitoring', 'brandMonitoring', ['Elite Travel Hackers'], buildBrandMonitoring({ keyword: 'Elite Travel Hackers' }));
seedEntry(5, 'page-audit', 'pageAudit', ['https://www.elitetravelhackers.com/best-travel-credit-cards'], buildPageAudit({ url: 'https://www.elitetravelhackers.com/best-travel-credit-cards' }));
seedEntry(4, 'business-research', 'businessListings', ['travel agency san francisco'], buildBusinessListings({ query: 'travel agency san francisco' }));
