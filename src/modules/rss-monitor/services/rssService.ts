// MOCK — in-memory reimplementation of the production rssService.
// Production: every method is `httpsCallable(functions, '<name>')` against
// Cloud Functions in functions/src/rss-monitor/ (poll.ts, feeds.ts,
// articles.ts, enrich.ts). Firestore collections: 'rss-feeds',
// 'rss-articles', 'trending-topics'. The subscribeTo* functions below
// replace the direct onSnapshot() calls the production hooks make.
import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type {
  RSSFeed,
  RSSArticle,
  TrendingTopic,
  ArticleStatus,
  AddFeedInput,
  UpdateFeedInput,
  DismissArticleInput,
  BulkDismissInput,
  TestFeedResult,
  PollFeedResult,
  EnrichKeywordsResult,
} from '../types';

/* ────────────────────────────────────────────────────────────────────────
 * Seed data — ETH travel domain. Dates are relative to module load so the
 * UI always shows fresh-looking content ("3h ago", StatsBar 24h counts).
 * ──────────────────────────────────────────────────────────────────────── */

const NOW = Date.now();
const HOUR = 36e5;
const DAY = 24 * HOUR;
const ts = (ms: number) => Timestamp.fromMillis(ms);

function seedFeeds(): RSSFeed[] {
  return [
    {
      id: 'feed-tpg',
      name: 'The Points Guy',
      url: 'https://thepointsguy.com/feed/',
      status: 'active',
      lastPolled: ts(NOW - 12 * 6e4),
      totalIngested: 1240,
      last7DaysCount: 38,
      pollInterval: '15 min',
      createdAt: ts(NOW - 210 * DAY),
      updatedAt: ts(NOW - 12 * 6e4),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-vftw',
      name: 'View from the Wing',
      url: 'https://viewfromthewing.com/feed/',
      status: 'active',
      lastPolled: ts(NOW - 26 * 6e4),
      totalIngested: 980,
      last7DaysCount: 22,
      pollInterval: '30 min',
      createdAt: ts(NOW - 205 * DAY),
      updatedAt: ts(NOW - 26 * 6e4),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-omaat',
      name: 'One Mile at a Time',
      url: 'https://onemileatatime.com/feed/',
      status: 'active',
      lastPolled: ts(NOW - 31 * 6e4),
      totalIngested: 1510,
      last7DaysCount: 31,
      pollInterval: '30 min',
      createdAt: ts(NOW - 204 * DAY),
      updatedAt: ts(NOW - 31 * 6e4),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-fm',
      name: 'Frequent Miler',
      url: 'https://frequentmiler.com/feed/',
      status: 'active',
      lastPolled: ts(NOW - 58 * 6e4),
      totalIngested: 720,
      last7DaysCount: 18,
      pollInterval: '1 hour',
      createdAt: ts(NOW - 190 * DAY),
      updatedAt: ts(NOW - 58 * 6e4),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-ll',
      name: 'LoyaltyLobby',
      url: 'https://loyaltylobby.com/feed/',
      status: 'paused',
      lastPolled: ts(NOW - 3 * DAY),
      totalIngested: 640,
      last7DaysCount: 0,
      pollInterval: '4 hours',
      createdAt: ts(NOW - 180 * DAY),
      updatedAt: ts(NOW - 3 * DAY),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-ual',
      name: 'United Airlines Press Room',
      url: 'https://www.united.com/en/us/newsroom/rss',
      status: 'active',
      lastPolled: ts(NOW - 44 * 6e4),
      totalIngested: 210,
      last7DaysCount: 6,
      pollInterval: '1 hour',
      createdAt: ts(NOW - 160 * DAY),
      updatedAt: ts(NOW - 44 * 6e4),
      createdBy: 'Daynis Olman',
    },
    {
      id: 'feed-dal',
      name: 'Delta News Hub',
      url: 'https://news.delta.com/rss.xml',
      status: 'error',
      errorMessage: 'HTTP 503: Service Unavailable (3 consecutive poll attempts failed)',
      lastPolled: ts(NOW - 5 * HOUR),
      totalIngested: 190,
      last7DaysCount: 2,
      pollInterval: '1 hour',
      createdAt: ts(NOW - 158 * DAY),
      updatedAt: ts(NOW - 5 * HOUR),
      createdBy: 'Daynis Olman',
    },
  ];
}

interface SeedArticleSpec {
  id: string;
  feedId: string;
  source: string;
  sourceAbbreviation: string;
  title: string;
  excerpt: string;
  publishedAgo: number; // ms before NOW
  createdAgo: number; // ms before NOW (ingestion time — drives StatsBar)
  aiScore: number;
  aiRationale: string;
  topics: string[];
  contentType: RSSArticle['contentType'];
  keywordDifficulty?: number;
  searchVolume?: number;
  primaryKeyword?: string;
  keywordMetricsStatus?: 'enriched' | 'no-data';
  status: ArticleStatus;
  clusterId?: string;
  dismissedBy?: string;
  dismissedAgo?: number;
  researchedBy?: string;
  researchedAgo?: number;
}

function specToArticle(s: SeedArticleSpec): RSSArticle {
  const publishedAt = ts(NOW - s.publishedAgo);
  const enriched = s.keywordMetricsStatus === 'enriched';
  return {
    id: s.id,
    title: s.title,
    excerpt: s.excerpt,
    url: `https://example.com/${s.feedId}/${s.id}`,
    source: s.source,
    sourceAbbreviation: s.sourceAbbreviation,
    publishedAt,
    aiScore: s.aiScore,
    aiRationale: s.aiRationale,
    topics: s.topics,
    contentType: s.contentType,
    keywordDifficulty: enriched ? s.keywordDifficulty ?? 0 : 0,
    searchVolume: enriched ? s.searchVolume ?? 0 : 0,
    ...(s.primaryKeyword ? { primaryKeyword: s.primaryKeyword } : {}),
    ...(s.keywordMetricsStatus
      ? { keywordMetricsStatus: s.keywordMetricsStatus, keywordMetricsAt: ts(NOW - s.publishedAgo + HOUR) }
      : {}),
    status: s.status,
    feedId: s.feedId,
    contentHash: `hash-${s.id}`,
    ...(s.clusterId ? { clusterId: s.clusterId } : {}),
    ...(s.status === 'dismissed'
      ? {
          dismissedAt: ts(NOW - (s.dismissedAgo ?? DAY)),
          dismissedBy: s.dismissedBy ?? 'Daynis Olman',
        }
      : {}),
    ...(s.status === 'researching' || s.status === 'in-pipeline'
      ? {
          researchedAt: ts(NOW - (s.researchedAgo ?? 2 * HOUR)),
          researchedBy: s.researchedBy ?? 'Sarah Mitchell',
        }
      : {}),
    createdAt: ts(NOW - s.createdAgo),
    updatedAt: ts(NOW - s.createdAgo),
  };
}

const ARTICLE_SPECS: SeedArticleSpec[] = [
  // ── Trending cluster A: Amex 30% transfer bonus to Flying Blue ──
  {
    id: 'art-amex-fb-tpg',
    feedId: 'feed-tpg',
    source: 'The Points Guy',
    sourceAbbreviation: 'TPG',
    title: 'Amex Membership Rewards 30% transfer bonus to Air France-KLM Flying Blue',
    excerpt:
      'Transfer American Express Membership Rewards points to Flying Blue with a 30% bonus through the end of the month — business class to Europe from 50,000 points one-way.',
    publishedAgo: 8 * HOUR,
    createdAgo: 7 * HOUR,
    aiScore: 91,
    aiRationale:
      'Time-limited transfer bonus with strong reader interest; pairs well with existing Flying Blue sweet-spot content.',
    topics: ['Award Travel', 'Deals & Alerts'],
    contentType: 'Deal',
    keywordDifficulty: 41,
    searchVolume: 12100,
    primaryKeyword: 'amex transfer bonus flying blue',
    keywordMetricsStatus: 'enriched',
    status: 'new',
    clusterId: 'cluster-amex-flying-blue',
  },
  {
    id: 'art-amex-fb-omaat',
    feedId: 'feed-omaat',
    source: 'One Mile at a Time',
    sourceAbbreviation: 'OMAT',
    title: '30% Amex transfer bonus to Flying Blue — book business class to Europe from 50k',
    excerpt:
      'Flying Blue is offering a 30% bonus on Amex transfers, bringing transatlantic business class awards down to 50,000 points plus modest surcharges.',
    publishedAgo: 9 * HOUR,
    createdAgo: 8 * HOUR,
    aiScore: 86,
    aiRationale:
      'Cluster story (2+ sources). Concrete award pricing makes it actionable; high affiliate relevance.',
    topics: ['Award Travel', 'Deals & Alerts'],
    contentType: 'Deal',
    keywordMetricsStatus: 'no-data',
    status: 'new',
    clusterId: 'cluster-amex-flying-blue',
  },
  {
    id: 'art-amex-fb-fm',
    feedId: 'feed-fm',
    source: 'Frequent Miler',
    sourceAbbreviation: 'FM',
    title: 'Amex 30% Flying Blue transfer bonus is live — best uses',
    excerpt:
      'The new 30% transfer bonus to Air France-KLM Flying Blue is live. Here are the best sweet spots, including promo rewards and fifth-freedom routes.',
    publishedAgo: 11 * HOUR,
    createdAgo: 10 * HOUR,
    aiScore: 83,
    aiRationale:
      'Third source on the cluster — confirms trend. Strong "best uses" angle for a roundup article.',
    topics: ['Award Travel', 'Deals & Alerts'],
    contentType: 'Deal',
    status: 'new',
    clusterId: 'cluster-amex-flying-blue',
  },
  // ── Trending cluster B: American AAdvantage partner award devaluation ──
  {
    id: 'art-aa-deval-vftw',
    feedId: 'feed-vftw',
    source: 'View from the Wing',
    sourceAbbreviation: 'VFTW',
    title: 'American AAdvantage quietly raises partner award prices across the board',
    excerpt:
      'Without notice, American increased AAdvantage award prices for travel on partner airlines — some business class awards now cost 40% more miles.',
    publishedAgo: 12 * HOUR,
    createdAgo: 11 * HOUR,
    aiScore: 85,
    aiRationale:
      'No-notice devaluation news always performs; high search demand expected for "what changed" queries.',
    topics: ['Award Travel', 'Loyalty Programs'],
    contentType: 'News',
    keywordDifficulty: 52,
    searchVolume: 6600,
    primaryKeyword: 'aadvantage partner award devaluation',
    keywordMetricsStatus: 'enriched',
    status: 'new',
    clusterId: 'cluster-aa-deval',
  },
  {
    id: 'art-aa-deval-tpg',
    feedId: 'feed-tpg',
    source: 'The Points Guy',
    sourceAbbreviation: 'TPG',
    title: 'American Airlines devalues partner awards: up to 40% more miles overnight',
    excerpt:
      'American Airlines has devalued AAdvantage partner award charts with no warning. Here is a before-and-after breakdown of the biggest price increases.',
    publishedAgo: 13 * HOUR,
    createdAgo: 12 * HOUR,
    aiScore: 88,
    aiRationale:
      'Second source confirms the devaluation cluster. Before/after tables are a proven format for this story.',
    topics: ['Award Travel', 'Loyalty Programs'],
    contentType: 'News',
    keywordDifficulty: 44,
    searchVolume: 8800,
    primaryKeyword: 'american airlines partner award chart',
    keywordMetricsStatus: 'enriched',
    status: 'new',
    clusterId: 'cluster-aa-deval',
  },
  {
    id: 'art-aa-deval-ll',
    feedId: 'feed-ll',
    source: 'LoyaltyLobby',
    sourceAbbreviation: 'LL',
    title: 'AAdvantage partner award charts gutted overnight — what still has value',
    excerpt:
      'American has gutted its partner award charts overnight. A few sweet spots survive — here is where AAdvantage miles still offer reasonable value.',
    publishedAgo: 15 * HOUR,
    createdAgo: 14 * HOUR,
    aiScore: 79,
    aiRationale:
      'Third source on the devaluation. "What still has value" angle differentiates from straight news coverage.',
    topics: ['Award Travel', 'Loyalty Programs'],
    contentType: 'News',
    keywordMetricsStatus: 'no-data',
    status: 'new',
    clusterId: 'cluster-aa-deval',
  },
  // ── Regular feed items ──
  {
    id: 'art-jetblue-deval',
    feedId: 'feed-tpg',
    source: 'The Points Guy',
    sourceAbbreviation: 'TPG',
    title: 'Chase Ultimate Rewards devalues transfer ratio to JetBlue effective November 1',
    excerpt:
      'Chase Ultimate Rewards points will transfer to JetBlue TrueBlue at a worse ratio starting November 1, ending the 1:1 transfer partnership.',
    publishedAgo: 3 * HOUR,
    createdAgo: 2 * HOUR,
    aiScore: 88,
    aiRationale:
      'Major transferable-currency devaluation; deadline angle drives urgency and search volume.',
    topics: ['Award Travel', 'Loyalty Programs'],
    contentType: 'News',
    keywordDifficulty: 34,
    searchVolume: 4400,
    primaryKeyword: 'chase jetblue transfer ratio',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-united-tahiti',
    feedId: 'feed-omaat',
    source: 'One Mile at a Time',
    sourceAbbreviation: 'OMAT',
    title: 'New: United launches San Francisco to Tahiti nonstop, awards wide open',
    excerpt:
      'United has launched a new nonstop route between San Francisco and Papeete, Tahiti, with wide-open saver award space in both economy and Polaris business.',
    publishedAgo: 5 * HOUR,
    createdAgo: 4 * HOUR,
    aiScore: 82,
    aiRationale:
      'New route + open award space is the highest-converting RSS story type for this audience.',
    topics: ['Airlines', 'Destinations'],
    contentType: 'News',
    keywordDifficulty: 28,
    searchVolume: 8100,
    primaryKeyword: 'united san francisco tahiti',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-citi-strata',
    feedId: 'feed-fm',
    source: 'Frequent Miler',
    sourceAbbreviation: 'FM',
    title: 'Citi Strata Premier 75,000-point offer: worth it?',
    excerpt:
      'Citi is out with a 75,000-point welcome offer on the Strata Premier card. We break down the spend requirement, transfer partners, and who should apply.',
    publishedAgo: 10 * HOUR,
    createdAgo: 9 * HOUR,
    aiScore: 76,
    aiRationale:
      'Elevated welcome offer on a core transferable-points card; strong commercial intent.',
    topics: ['Credit Cards'],
    contentType: 'Review',
    keywordDifficulty: 45,
    searchVolume: 9900,
    primaryKeyword: 'citi strata premier 75000 offer',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-af-a350',
    feedId: 'feed-omaat',
    source: 'One Mile at a Time',
    sourceAbbreviation: 'OMAT',
    title: 'Review: Air France A350 business class, Paris to New York',
    excerpt:
      'Air France\'s A350 business class offers one of the most polished transatlantic experiences — full review of the seat, service, and catering.',
    publishedAgo: DAY,
    createdAgo: DAY - HOUR,
    aiScore: 64,
    aiRationale:
      'Solid review content but competes with many existing Air France reviews; moderate priority.',
    topics: ['Airlines'],
    contentType: 'Review',
    keywordMetricsStatus: 'no-data',
    status: 'new',
  },
  {
    id: 'art-hotel-cards-oct',
    feedId: 'feed-tpg',
    source: 'The Points Guy',
    sourceAbbreviation: 'TPG',
    title: 'The best hotel credit card offers for October 2026',
    excerpt:
      'From free-night certificates to automatic elite status, these are the best hotel credit card welcome offers available this month.',
    publishedAgo: DAY,
    createdAgo: 20 * HOUR,
    aiScore: 71,
    aiRationale:
      'Evergreen monthly roundup; reliable search traffic but needs fresh angles vs. last month.',
    topics: ['Hotels', 'Credit Cards'],
    contentType: 'Guide',
    keywordDifficulty: 58,
    searchVolume: 14800,
    primaryKeyword: 'best hotel credit card offers',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-united-transatlantic',
    feedId: 'feed-ual',
    source: 'United Airlines Press Room',
    sourceAbbreviation: 'UAL',
    title: 'United Airlines announces record transatlantic expansion for summer 2027',
    excerpt:
      'United will add nine new transatlantic routes next summer, its largest-ever Europe schedule, including new service to Sicily and Madeira.',
    publishedAgo: DAY,
    createdAgo: 22 * HOUR,
    aiScore: 79,
    aiRationale:
      'Press-release source but genuinely newsworthy expansion; new destinations = new award sweet spots.',
    topics: ['Airlines', 'Destinations'],
    contentType: 'News',
    status: 'new',
  },
  {
    id: 'art-delta-flash-sale',
    feedId: 'feed-vftw',
    source: 'View from the Wing',
    sourceAbbreviation: 'VFTW',
    title: 'Delta SkyMiles flash sale: domestic awards from 9,000 miles',
    excerpt:
      'Delta has an unannounced flash sale on domestic awards, with one-way economy flights from 9,000 SkyMiles across dozens of routes.',
    publishedAgo: 2 * DAY,
    createdAgo: 2 * DAY - HOUR,
    aiScore: 74,
    aiRationale:
      'Short-lived deal content; publish fast or skip. Good social/newsletter fodder.',
    topics: ['Deals & Alerts', 'Airlines'],
    contentType: 'Deal',
    status: 'new',
  },
  {
    id: 'art-alaska-premium-card',
    feedId: 'feed-omaat',
    source: 'One Mile at a Time',
    sourceAbbreviation: 'OMAT',
    title: 'Alaska Airlines unveils premium credit card with lounge access',
    excerpt:
      'Alaska Airlines has unveiled a new premium credit card featuring Alaska Lounge access, a companion fare, and accelerated elite status earning.',
    publishedAgo: 3 * DAY,
    createdAgo: 3 * DAY - 2 * HOUR,
    aiScore: 81,
    aiRationale:
      'New premium card launches are rare and high-interest; first-mover coverage wins search.',
    topics: ['Credit Cards', 'Lounges'],
    contentType: 'News',
    keywordDifficulty: 47,
    searchVolume: 5300,
    primaryKeyword: 'alaska airlines premium credit card',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-bilt-2',
    feedId: 'feed-fm',
    source: 'Frequent Miler',
    sourceAbbreviation: 'FM',
    title: 'Bilt 2.0: everything we know about the new card lineup',
    excerpt:
      'Bilt is relaunching with three new cards. Here is everything we know about annual fees, rent rewards, and the new transfer partner lineup.',
    publishedAgo: 3 * DAY,
    createdAgo: 3 * DAY - 3 * HOUR,
    aiScore: 73,
    aiRationale:
      'Bilt relaunch is a marquee story for the points audience; "everything we know" format captures broad queries.',
    topics: ['Credit Cards'],
    contentType: 'News',
    keywordDifficulty: 39,
    searchVolume: 21500,
    primaryKeyword: 'bilt 2.0 new cards',
    keywordMetricsStatus: 'enriched',
    status: 'new',
  },
  {
    id: 'art-hyatt-mrs-smith',
    feedId: 'feed-vftw',
    source: 'View from the Wing',
    sourceAbbreviation: 'VFTW',
    title: 'Hyatt adds 40 new Mr & Mrs Smith properties to award charts',
    excerpt:
      'World of Hyatt has added 40 new Mr & Mrs Smith boutique hotels bookable with points, including several category 4–6 gems in Europe and Asia.',
    publishedAgo: 4 * DAY,
    createdAgo: 4 * DAY - HOUR,
    aiScore: 66,
    aiRationale:
      'Incremental Hyatt footprint news; useful for award-searchers but not urgent.',
    topics: ['Hotels', 'Award Travel'],
    contentType: 'News',
    status: 'new',
  },
  {
    id: 'art-choice-sweet-spots',
    feedId: 'feed-vftw',
    source: 'View from the Wing',
    sourceAbbreviation: 'VFTW',
    title: 'Choice Privileges sweet spots after the award chart refresh',
    excerpt:
      'Choice Privileges refreshed its award charts and a handful of genuinely useful sweet spots emerged, particularly in Scandinavia and Japan.',
    publishedAgo: 9 * DAY,
    createdAgo: 9 * DAY - 2 * HOUR,
    aiScore: 35,
    aiRationale:
      'Niche program with limited reader interest; low priority unless the sweet spots are exceptional.',
    topics: ['Hotels', 'Award Travel'],
    contentType: 'Guide',
    status: 'new',
  },
  // ── Researching tab ──
  {
    id: 'art-polaris-studio',
    feedId: 'feed-ual',
    source: 'United Airlines Press Room',
    sourceAbbreviation: 'UAL',
    title: 'United expands Polaris studio suites to 787 fleet',
    excerpt:
      'United will retrofit its Boeing 787 fleet with the new Polaris studio suites — larger front-row business class seats with extra personal space.',
    publishedAgo: 4 * DAY,
    createdAgo: 4 * DAY - 2 * HOUR,
    aiScore: 58,
    aiRationale:
      'Product news with medium search interest; best framed around award availability implications.',
    topics: ['Airlines'],
    contentType: 'News',
    keywordMetricsStatus: 'no-data',
    status: 'researching',
    researchedBy: 'Sarah Mitchell',
    researchedAgo: 6 * HOUR,
  },
  {
    id: 'art-emirates-fifth',
    feedId: 'feed-omaat',
    source: 'One Mile at a Time',
    sourceAbbreviation: 'OMAT',
    title: 'Emirates increases fifth-freedom frequencies from New York',
    excerpt:
      'Emirates is adding frequencies on its New York JFK to Milan fifth-freedom route, creating more award seats between the US and Europe.',
    publishedAgo: 5 * DAY,
    createdAgo: 5 * DAY - HOUR,
    aiScore: 54,
    aiRationale:
      'Useful for award availability roundups; moderate standalone value.',
    topics: ['Airlines'],
    contentType: 'News',
    keywordDifficulty: 26,
    searchVolume: 3700,
    primaryKeyword: 'emirates fifth freedom routes',
    keywordMetricsStatus: 'enriched',
    status: 'researching',
    researchedBy: 'James Park',
    researchedAgo: 12 * HOUR,
  },
  // ── In pipeline (Researching tab, status sub-filter) ──
  {
    id: 'art-southwest-deval',
    feedId: 'feed-tpg',
    source: 'The Points Guy',
    sourceAbbreviation: 'TPG',
    title: 'Southwest Rapid Rewards devaluation: what changed overnight',
    excerpt:
      'Southwest quietly raised Rapid Rewards redemption rates overnight — most awards now cost roughly 8% more points than yesterday.',
    publishedAgo: 5 * DAY,
    createdAgo: 5 * DAY - 2 * HOUR,
    aiScore: 90,
    aiRationale:
      'Major program devaluation with mass appeal; definite pipeline candidate.',
    topics: ['Award Travel', 'Loyalty Programs'],
    contentType: 'News',
    keywordDifficulty: 44,
    searchVolume: 13300,
    primaryKeyword: 'southwest rapid rewards devaluation',
    keywordMetricsStatus: 'enriched',
    status: 'in-pipeline',
    researchedBy: 'Sarah Mitchell',
    researchedAgo: 2 * DAY,
  },
  // ── Dismissed tab ──
  {
    id: 'art-delta-austin',
    feedId: 'feed-dal',
    source: 'Delta News Hub',
    sourceAbbreviation: 'DAL',
    title: 'Delta announces new Austin focus city with 20 routes',
    excerpt:
      'Delta will make Austin its newest focus city, launching 20 routes including transcontinental and Mexico service starting next spring.',
    publishedAgo: 6 * DAY,
    createdAgo: 6 * DAY - HOUR,
    aiScore: 77,
    aiRationale:
      'Significant network news, but Austin-centric angle overlaps existing coverage.',
    topics: ['Airlines', 'Destinations'],
    contentType: 'News',
    status: 'dismissed',
    dismissedBy: 'Daynis Olman',
    dismissedAgo: 5 * DAY,
  },
  {
    id: 'art-ihg-points-sale',
    feedId: 'feed-ll',
    source: 'LoyaltyLobby',
    sourceAbbreviation: 'LL',
    title: 'IHG One Rewards 25% points sale: buy points from 0.5c each',
    excerpt:
      'IHG One Rewards is selling points with a 25% discount, dropping the effective cost to around 0.5 cents per point through the end of the week.',
    publishedAgo: 7 * DAY,
    createdAgo: 7 * DAY - HOUR,
    aiScore: 48,
    aiRationale:
      'Recurring buy-points promotion; rarely worth covering unless the price is exceptional.',
    topics: ['Deals & Alerts', 'Hotels'],
    contentType: 'Deal',
    keywordMetricsStatus: 'no-data',
    status: 'dismissed',
    dismissedBy: 'James Park',
    dismissedAgo: 6 * DAY,
  },
  {
    id: 'art-citi-american-transfer',
    feedId: 'feed-fm',
    source: 'Frequent Miler',
    sourceAbbreviation: 'FM',
    title: 'Why the Citi / American transfer partnership changes everything',
    excerpt:
      'Citi ThankYou points now transfer directly to American AAdvantage — a shift that reshuffles the transferable-currency hierarchy.',
    publishedAgo: 8 * DAY,
    createdAgo: 8 * DAY - 2 * HOUR,
    aiScore: 69,
    aiRationale:
      'Important partnership analysis, but already covered comprehensively when the news broke.',
    topics: ['Credit Cards', 'Award Travel'],
    contentType: 'Guide',
    keywordDifficulty: 36,
    searchVolume: 9200,
    primaryKeyword: 'citi transfer american aadvantage',
    keywordMetricsStatus: 'enriched',
    status: 'dismissed',
    dismissedBy: 'Daynis Olman',
    dismissedAgo: 7 * DAY,
  },
  {
    id: 'art-marriott-double-elite',
    feedId: 'feed-ll',
    source: 'LoyaltyLobby',
    sourceAbbreviation: 'LL',
    title: 'Marriott Bonvoy extends double elite nights promotion through year-end',
    excerpt:
      'Marriott Bonvoy has extended its double elite night credits promotion through December 31, easing the path to Platinum and Titanium status.',
    publishedAgo: 2 * DAY,
    createdAgo: 2 * DAY - 3 * HOUR,
    aiScore: 57,
    aiRationale:
      'Promotion extension rather than a new promotion; modest incremental value.',
    topics: ['Hotels', 'Loyalty Programs'],
    contentType: 'News',
    keywordMetricsStatus: 'no-data',
    status: 'dismissed',
    dismissedBy: 'Sarah Mitchell',
    dismissedAgo: DAY,
  },
];

function seedArticles(): RSSArticle[] {
  return ARTICLE_SPECS.map(specToArticle);
}

function seedTrendingTopics(): TrendingTopic[] {
  const clusterA = ARTICLE_SPECS.filter((s) => s.clusterId === 'cluster-amex-flying-blue');
  const clusterB = ARTICLE_SPECS.filter((s) => s.clusterId === 'cluster-aa-deval');
  return [
    {
      id: 'cluster-amex-flying-blue',
      topic: clusterA[0].title,
      sources: clusterA.map((s) => s.source),
      articleTitles: clusterA.map((s) => s.title),
      articleIds: clusterA.map((s) => s.id),
      count: clusterA.length,
      sourceCount: new Set(clusterA.map((s) => s.source)).size,
      detectedAt: ts(NOW - 6 * HOUR),
      expiresAt: ts(NOW + 2 * DAY),
    },
    {
      id: 'cluster-aa-deval',
      topic: clusterB[0].title,
      sources: clusterB.map((s) => s.source),
      articleTitles: clusterB.map((s) => s.title),
      articleIds: clusterB.map((s) => s.id),
      count: clusterB.length,
      sourceCount: new Set(clusterB.map((s) => s.source)).size,
      detectedAt: ts(NOW - 10 * HOUR),
      expiresAt: ts(NOW + 2 * DAY),
    },
  ];
}

/* ────────────────────────────────────────────────────────────────────────
 * In-memory store + listener fan-out (replaces Firestore onSnapshot).
 * ──────────────────────────────────────────────────────────────────────── */

let feeds: RSSFeed[] = seedFeeds();
let articles: RSSArticle[] = seedArticles();
const trendingTopics: TrendingTopic[] = seedTrendingTopics();

type StoreListener = () => void;
const storeListeners = new Set<StoreListener>();

function notifyStoreChanged(): void {
  storeListeners.forEach((listener) => listener());
}

/** Query shape mirroring the Firestore constraints in production useArticles. */
export interface ArticleQueryParams {
  /** where('status', 'in', statuses) */
  statuses: ArticleStatus[];
  /** where('feedId', '==', feedId) */
  feedId?: string | null;
  /** where('publishedAt', '>=', publishedAfter) */
  publishedAfter?: Timestamp | null;
}

function queryArticles(params: ArticleQueryParams): RSSArticle[] {
  let result = articles.filter((a) => params.statuses.includes(a.status));
  if (params.feedId) {
    result = result.filter((a) => a.feedId === params.feedId);
  }
  if (params.publishedAfter) {
    const cutoff = params.publishedAfter.toMillis();
    result = result.filter((a) => a.publishedAt.toMillis() >= cutoff);
  }
  // orderBy('createdAt', 'desc')
  return [...result].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

/** Emit current query results once (after a tick, like a snapshot), then re-emit on every store mutation. */
function subscribeWithQuery<T>(
  runQuery: () => T,
  onData: (data: T) => void,
  onError?: (err: Error) => void,
): () => void {
  let active = true;
  const emitCurrent = () => {
    if (!active) return;
    try {
      onData(runQuery());
    } catch (err) {
      onError?.(err as Error);
    }
  };
  void delay(150).then(emitCurrent);
  const listener: StoreListener = () => emitCurrent();
  storeListeners.add(listener);
  return () => {
    active = false;
    storeListeners.delete(listener);
  };
}

// production: onSnapshot(query(collection(db, 'rss-feeds'), orderBy('createdAt', 'desc')))
export function subscribeToFeeds(
  onData: (feeds: RSSFeed[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeWithQuery(
    () => [...feeds].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    onData,
    onError,
  );
}

// production: onSnapshot(query(collection(db, 'rss-articles'), where/orderBy constraints))
export function subscribeToArticles(
  params: ArticleQueryParams,
  onData: (articles: RSSArticle[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeWithQuery(() => queryArticles(params), onData, onError);
}

// production: onSnapshot(query(collection(db, 'trending-topics'),
//   where('expiresAt', '>', now), orderBy('expiresAt', 'asc')))
export function subscribeToTrendingTopics(
  onData: (topics: TrendingTopic[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return subscribeWithQuery(
    () =>
      trendingTopics
        .filter((t) => t.expiresAt.toMillis() > Date.now())
        .sort((a, b) => a.expiresAt.toMillis() - b.expiresAt.toMillis()),
    onData,
    onError,
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * rssService — same exported names/signatures as production; each method
 * notes the production callable it replaces.
 * ──────────────────────────────────────────────────────────────────────── */

function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Headline pool for pollFeed — a poll surfaces one "fresh" item per call. */
const POLL_HEADLINES: { title: string; excerpt: string; topics: string[]; contentType: RSSArticle['contentType'] }[] = [
  {
    title: 'Virgin Atlantic adds 50% bonus on points transfers from Amex',
    excerpt: 'Virgin Atlantic Flying Club is offering a 50% bonus on Amex Membership Rewards transfers for the next two weeks.',
    topics: ['Award Travel', 'Deals & Alerts'],
    contentType: 'Deal',
  },
  {
    title: 'Singapore Airlines releases Spontaneous Escapes award deals',
    excerpt: 'Singapore Airlines has released its monthly Spontaneous Escapes list with 30% off KrisFlyer awards on dozens of routes.',
    topics: ['Award Travel', 'Airlines'],
    contentType: 'Deal',
  },
  {
    title: 'Capital One adds two new transfer partners including JAL Mileage Bank',
    excerpt: 'Capital One miles now transfer to Japan Airlines Mileage Bank and one additional partner at 1:1 ratios.',
    topics: ['Credit Cards', 'Award Travel'],
    contentType: 'News',
  },
  {
    title: 'Park Hyatt Kyoto opens for award bookings at 35,000 points',
    excerpt: 'The newly renovated Park Hyatt Kyoto is now bookable with World of Hyatt points at category 7 pricing.',
    topics: ['Hotels', 'Award Travel'],
    contentType: 'News',
  },
  {
    title: 'US credit card guide: the 5/24 rule explained for 2027',
    excerpt: 'Everything beginners need to know about Chase\'s 5/24 application rule and how to plan around it.',
    topics: ['Credit Cards'],
    contentType: 'Guide',
  },
];
let pollHeadlineIndex = 0;

export const rssService = {
  // production: httpsCallable<AddFeedInput, RSSFeed>(functions, 'addFeed')
  async addFeed(data: AddFeedInput): Promise<RSSFeed> {
    await delay();
    const feed: RSSFeed = {
      id: mockId('feed'),
      name: data.name,
      url: data.url,
      status: 'active',
      lastPolled: Timestamp.now(),
      totalIngested: 0,
      last7DaysCount: 0,
      pollInterval: data.pollInterval,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'Daynis Olman',
    };
    feeds = [feed, ...feeds];
    notifyStoreChanged();
    return feed;
  },

  // production: httpsCallable<UpdateFeedInput, void>(functions, 'updateFeed')
  async updateFeed(data: UpdateFeedInput): Promise<void> {
    await delay();
    feeds = feeds.map((f) => {
      if (f.id !== data.feedId) return f;
      const next: RSSFeed = {
        ...f,
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.pollInterval !== undefined ? { pollInterval: data.pollInterval } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        updatedAt: Timestamp.now(),
      };
      // Empty string clears the error state (production uses the same convention).
      if (data.errorMessage !== undefined) {
        if (data.errorMessage === '') delete next.errorMessage;
        else next.errorMessage = data.errorMessage;
      }
      return next;
    });
    notifyStoreChanged();
  },

  // production: httpsCallable<{ feedId: string }, void>(functions, 'deleteFeed')
  async deleteFeed(feedId: string): Promise<void> {
    await delay();
    // Production retains previously-ingested articles when a feed is deleted.
    feeds = feeds.filter((f) => f.id !== feedId);
    notifyStoreChanged();
  },

  // production: httpsCallable<{ url: string }, TestFeedResult>(functions, 'testFeed')
  async testFeed(url: string): Promise<TestFeedResult> {
    await delay(400);
    if (!/^https?:\/\/.+\..+/.test(url)) {
      throw new Error('Invalid feed URL — enter a full http(s) URL');
    }
    let host = 'Unknown Feed';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      throw new Error('Invalid feed URL — enter a full http(s) URL');
    }
    return {
      title: `${host} — RSS Feed`,
      itemCount: 10 + (simpleHash(url) % 40),
    };
  },

  // production: httpsCallable<{ feedId: string }, PollFeedResult>(functions, 'pollFeed')
  async pollFeed(feedId: string): Promise<PollFeedResult> {
    await delay(600);
    const feed = feeds.find((f) => f.id === feedId);
    if (!feed) throw new Error('Feed not found');

    // Simulate the server-side poll surfacing one fresh item.
    const headline = POLL_HEADLINES[pollHeadlineIndex % POLL_HEADLINES.length];
    pollHeadlineIndex += 1;
    const id = mockId('art');
    const newArticle: RSSArticle = {
      id,
      title: headline.title,
      excerpt: headline.excerpt,
      url: `https://example.com/${feedId}/${id}`,
      source: feed.name,
      sourceAbbreviation: feed.name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 5),
      publishedAt: Timestamp.now(),
      aiScore: 45 + (simpleHash(id) % 50),
      aiRationale: 'Newly polled item — AI triage pending full enrichment.',
      topics: headline.topics,
      contentType: headline.contentType,
      keywordDifficulty: 0,
      searchVolume: 0,
      status: 'new',
      feedId: feed.id,
      contentHash: `hash-${id}`,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    articles = [newArticle, ...articles];
    feeds = feeds.map((f) =>
      f.id === feedId
        ? {
            ...f,
            lastPolled: Timestamp.now(),
            totalIngested: f.totalIngested + 1,
            last7DaysCount: f.last7DaysCount + 1,
            updatedAt: Timestamp.now(),
          }
        : f,
    );
    notifyStoreChanged();
    return { newArticleCount: 1 };
  },

  // production: httpsCallable<DismissArticleInput, void>(functions, 'dismissArticle')
  async dismissArticle(data: DismissArticleInput): Promise<void> {
    await delay(200);
    articles = articles.map((a) =>
      a.id === data.articleId
        ? {
            ...a,
            status: 'dismissed',
            dismissedAt: Timestamp.now(),
            dismissedBy: data.dismissedBy,
            updatedAt: Timestamp.now(),
          }
        : a,
    );
    notifyStoreChanged();
  },

  // production: httpsCallable<{ articleId: string }, void>(functions, 'restoreArticle')
  async restoreArticle(articleId: string): Promise<void> {
    await delay(200);
    articles = articles.map((a) => {
      if (a.id !== articleId) return a;
      const next: RSSArticle = { ...a, status: 'new', updatedAt: Timestamp.now() };
      delete next.dismissedAt;
      delete next.dismissedBy;
      return next;
    });
    notifyStoreChanged();
  },

  // production: httpsCallable<{ articleId: string }, void>(functions, 'deleteArticle')
  async deleteArticle(articleId: string): Promise<void> {
    await delay(200);
    articles = articles.filter((a) => a.id !== articleId);
    notifyStoreChanged();
  },

  // production: httpsCallable<BulkDismissInput, { count: number }>(functions, 'bulkDismiss')
  async bulkDismiss(data: BulkDismissInput): Promise<{ count: number }> {
    await delay(300);
    const ids = new Set(data.articleIds);
    let count = 0;
    articles = articles.map((a) => {
      if (!ids.has(a.id)) return a;
      count += 1;
      return {
        ...a,
        status: 'dismissed' as ArticleStatus,
        dismissedAt: Timestamp.now(),
        dismissedBy: data.dismissedBy,
        updatedAt: Timestamp.now(),
      };
    });
    notifyStoreChanged();
    return { count };
  },

  // production: httpsCallable<{ articleIds: string[] }, { count: number }>(functions, 'bulkRestore')
  async bulkRestore(articleIds: string[]): Promise<{ count: number }> {
    await delay(300);
    const ids = new Set(articleIds);
    let count = 0;
    articles = articles.map((a) => {
      if (!ids.has(a.id)) return a;
      count += 1;
      const next: RSSArticle = { ...a, status: 'new', updatedAt: Timestamp.now() };
      delete next.dismissedAt;
      delete next.dismissedBy;
      return next;
    });
    notifyStoreChanged();
    return { count };
  },

  /** Fetch KD + search volume from DataForSEO for a batch of articles (CMS-30). */
  // production: httpsCallable<{ articleIds: string[] }, EnrichKeywordsResult>(functions, 'enrichArticleKeywords')
  async enrichArticleKeywords(articleIds: string[]): Promise<EnrichKeywordsResult> {
    await delay(900);
    const ids = new Set(articleIds.slice(0, 50)); // production callable caps a batch at 50
    let enrichedCount = 0;
    let noDataCount = 0;
    articles = articles.map((a) => {
      if (!ids.has(a.id)) return a;
      // Deterministic ~80/20 enriched vs no-data split so both UI states show.
      const hasData = simpleHash(a.id) % 5 !== 0;
      if (hasData) {
        enrichedCount += 1;
        const kd = 20 + (simpleHash(a.title) % 55);
        return {
          ...a,
          keywordMetricsStatus: 'enriched' as const,
          keywordMetricsAt: Timestamp.now(),
          keywordDifficulty: kd,
          searchVolume: 1500 + (simpleHash(a.title) % 20000),
          primaryKeyword: a.primaryKeyword ?? a.title.toLowerCase().split(/[—:–]/)[0].trim(),
          updatedAt: Timestamp.now(),
        };
      }
      noDataCount += 1;
      return {
        ...a,
        keywordMetricsStatus: 'no-data' as const,
        keywordMetricsAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    });
    notifyStoreChanged();
    return { enrichedCount, noDataCount };
  },
};

/**
 * MOCK-ONLY cross-module seam: the production `createArticle` callable marks
 * the originating RSS item(s) 'researching' server-side. The pipeline mock's
 * callCreateArticle calls this so the RSS feed reflects the handoff.
 */
export function markItemsResearching(articleIds: string[]): void {
  const ids = new Set(articleIds);
  let changed = false;
  articles = articles.map((a) => {
    if (!ids.has(a.id) || a.status !== 'new') return a;
    changed = true;
    return { ...a, status: 'researching' as const, updatedAt: Timestamp.now() };
  });
  if (changed) notifyStoreChanged();
}
