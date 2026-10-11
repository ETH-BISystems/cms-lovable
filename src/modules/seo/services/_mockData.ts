/**
 * MOCK-ONLY in-memory store — replaces the production Firestore collections:
 *   seo-site-health/{siteId} + subcollections (issues, schemas, indexing,
 *   backlinks, redirects), seo-position-tracking, seo-page-audits,
 *   seo-audit-runs (+ pages/issues subcollections), seo-audit-config/{siteId},
 *   seo-ai-overviews.
 * Safe to delete when the real backend replaces module services.
 */

import type {
  SiteHealthDoc,
  SchemaDoc,
  IndexingDoc,
  TechnicalIssueDoc,
  BacklinkDoc,
  RedirectDoc,
  PositionTrackingDoc,
  PageAuditDoc,
  AIOverviewDoc,
  AuditRunDoc,
  AuditRunPageDoc,
  AuditRunIssueDoc,
  AuditConfigDoc,
  AuditComponents,
  AuditComponentKey,
  AuditComponentStatus,
  ChangeType,
} from '../types';

// ── Date helpers ────────────────────────────────────────────────────────────

const DAY = 864e5;
const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY);
const hoursAgo = (n: number): Date => new Date(Date.now() - n * 3600e3);
const isoDaysAgo = (n: number): string => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const isoWeeksAgo = (n: number): string => isoDaysAgo(n * 7);

// ── Subscription infrastructure ─────────────────────────────────────────────

type Cb<T> = (data: T) => void;

interface Registration<T> {
  siteId: string;
  cb: Cb<T>;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Minimal onSnapshot replacement: emits the current slice once after a short
 * delay (simulated latency), then re-emits to live listeners via notify().
 */
export function makeEmitter<T>(getData: (siteId: string) => T) {
  const listeners = new Set<Registration<T>>();
  return {
    subscribe(siteId: string, cb: Cb<T>, ms = 250): () => void {
      const reg: Registration<T> = { siteId, cb, timer: null };
      listeners.add(reg);
      reg.timer = setTimeout(() => {
        reg.timer = null;
        if (listeners.has(reg)) cb(getData(siteId));
      }, ms);
      return () => {
        if (reg.timer) clearTimeout(reg.timer);
        listeners.delete(reg);
      };
    },
    notify(siteId: string): void {
      const data = getData(siteId);
      for (const reg of Array.from(listeners)) {
        if (reg.siteId === siteId) reg.cb(data);
      }
    },
  };
}

// ── Seed: Site Health ───────────────────────────────────────────────────────

const siteHealth: Record<string, SiteHealthDoc> = {
  eth: {
    siteId: 'eth',
    domain: 'elitetravelhackers.com',
    domainRating: 58,
    domainRatingChange: 2,
    drHistory: [47, 49, 49, 51, 52, 52, 54, 55, 55, 56, 57, 58],
    totalIndexedPages: 184,
    indexedPagesChange: 6,
    cwv: { lcp: 2.3, inp: 180, cls: 0.08, overall: 'Good' },
    crawlErrors: 3,
    auditSummary: {
      pagesAudited: 10,
      critical: 4,
      warnings: 17,
      info: 23,
      lastAudit: daysAgo(2),
    },
    dataFreshness: {
      gsc: hoursAgo(6),
      seoApi: hoursAgo(18),
      lastFullAudit: daysAgo(2),
    },
    updatedAt: hoursAgo(2),
  },
  epm: {
    siteId: 'epm',
    domain: 'elitepointsandmiles.com',
    domainRating: 63,
    domainRatingChange: 4,
    drHistory: [51, 52, 54, 55, 56, 58, 58, 59, 60, 61, 62, 63],
    totalIndexedPages: 246,
    indexedPagesChange: 11,
    cwv: { lcp: 2.8, inp: 220, cls: 0.12, overall: 'Needs Improvement' },
    crawlErrors: 7,
    auditSummary: {
      pagesAudited: 8,
      critical: 2,
      warnings: 12,
      info: 19,
      lastAudit: daysAgo(1),
    },
    dataFreshness: {
      gsc: hoursAgo(4),
      seoApi: hoursAgo(9),
      lastFullAudit: daysAgo(1),
    },
    updatedAt: hoursAgo(1),
  },
};

// ── Seed: Technical Issues ──────────────────────────────────────────────────

const issues: Record<string, TechnicalIssueDoc[]> = {
  eth: [
    { id: 'issue_001', severity: 'Critical', type: 'Broken internal link', description: 'Internal link returns 404 — the target page was removed during the cards migration.', url: 'https://elitetravelhackers.com/qantas-frequent-flyer-guide', pageTitle: 'Ultimate Guide to Qantas Frequent Flyer', firstDetected: daysAgo(4), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_002', severity: 'Critical', type: 'Missing meta description', description: 'Page has no meta description; Google is auto-generating a low-quality snippet.', url: 'https://elitetravelhackers.com/hotel-status-matches', pageTitle: 'Hotel Status Matches: 2026 Edition', firstDetected: daysAgo(9), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_003', severity: 'Critical', type: 'Duplicate title tag', description: 'Title tag is identical to /best-travel-credit-cards-australia — consolidate or differentiate.', url: 'https://elitetravelhackers.com/top-travel-cards', pageTitle: 'Top Travel Cards', firstDetected: daysAgo(12), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_004', severity: 'Critical', type: 'Schema validation error', description: 'Review schema is missing the required "author" property; rich results are suppressed.', url: 'https://elitetravelhackers.com/amex-platinum-edge-review', pageTitle: 'Amex Platinum Edge Review 2026', firstDetected: daysAgo(6), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_005', severity: 'Warning', type: 'Slow LCP', description: 'Largest Contentful Paint is 4.1s on mobile — hero image is unoptimised.', url: 'https://elitetravelhackers.com/round-the-world-business-class', pageTitle: 'Round the World in Business Class', firstDetected: daysAgo(15), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_006', severity: 'Warning', type: 'Missing H1', description: 'Page template renders no H1 element.', url: 'https://elitetravelhackers.com/manufactured-spending-guide', pageTitle: 'How to Manufacture Spend Safely', firstDetected: daysAgo(21), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_007', severity: 'Warning', type: 'Redirect chain', description: 'Redirect chain of 3 hops dilutes link equity — point the first hop at the final URL.', url: 'https://elitetravelhackers.com/velocity-guide', pageTitle: 'Velocity Guide (legacy)', firstDetected: daysAgo(30), canAutoFix: false, hasArticle: false, ignored: false },
    { id: 'issue_008', severity: 'Warning', type: 'Image missing alt text', description: '6 images on the page lack alt attributes.', url: 'https://elitetravelhackers.com/krisflyer-sweet-spots', pageTitle: 'KrisFlyer Sweet Spots Explained', firstDetected: daysAgo(8), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_009', severity: 'Info', type: 'Orphan page', description: 'No internal links point to this page.', url: 'https://elitetravelhackers.com/status-run-guide-qantas', pageTitle: 'Qantas Status Run Guide', firstDetected: daysAgo(26), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_010', severity: 'Info', type: 'Low word count', description: 'Page has 412 words — below the 800-word threshold for competitive queries.', url: 'https://elitetravelhackers.com/emirates-first-class-awards', pageTitle: 'Emirates First Class Award Availability', firstDetected: daysAgo(18), canAutoFix: false, hasArticle: true, ignored: true, ignoredAt: daysAgo(10), ignoredBy: 'daynis@ditconsulting.com.au' },
  ],
  epm: [
    { id: 'issue_101', severity: 'Critical', type: 'Crawl error', description: 'Server returned 500 during the last crawl cycle.', url: 'https://elitepointsandmiles.com/best-hotel-credit-cards', pageTitle: 'Best Hotel Credit Cards', firstDetected: daysAgo(3), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_102', severity: 'Critical', type: 'Missing meta description', description: 'Meta description is empty.', url: 'https://elitepointsandmiles.com/airline-transfer-partners', pageTitle: 'Best Airline Transfer Partners', firstDetected: daysAgo(7), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_103', severity: 'Warning', type: 'Slow LCP', description: 'LCP is 3.6s on mobile.', url: 'https://elitepointsandmiles.com/chase-sapphire-preferred-review', pageTitle: 'Chase Sapphire Preferred Review', firstDetected: daysAgo(11), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_104', severity: 'Warning', type: 'Image missing alt text', description: '3 images lack alt attributes.', url: 'https://elitepointsandmiles.com/amex-platinum-edge-review', pageTitle: 'Amex Platinum Edge Review', firstDetected: daysAgo(14), canAutoFix: true, hasArticle: true, ignored: false },
    { id: 'issue_105', severity: 'Info', type: 'Low word count', description: 'Page has 530 words.', url: 'https://elitepointsandmiles.com/emirates-first-class-awards', pageTitle: 'Emirates First Class Awards', firstDetected: daysAgo(19), canAutoFix: false, hasArticle: true, ignored: false },
    { id: 'issue_106', severity: 'Info', type: 'Orphan page', description: 'Only reachable via sitemap.', url: 'https://elitepointsandmiles.com/citi-premier-card-guide', pageTitle: 'Citi Premier Card Guide', firstDetected: daysAgo(24), canAutoFix: false, hasArticle: true, ignored: false },
  ],
};

// ── Seed: Schemas ───────────────────────────────────────────────────────────

const schemas: Record<string, SchemaDoc[]> = {
  eth: [
    { articleId: 'art_001', title: 'Ultimate Guide to Qantas Frequent Flyer', url: 'https://elitetravelhackers.com/qantas-frequent-flyer-guide', schemaType: 'Article', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(1) },
    { articleId: 'art_002', title: 'Amex Platinum Edge Review 2026', url: 'https://elitetravelhackers.com/amex-platinum-edge-review', schemaType: 'Review', schemaValid: false, richResultsEligible: false, lastChecked: daysAgo(1), validationErrors: ['Missing required property: author', 'Property "reviewRating.bestRating" should be a number'] },
    { articleId: 'art_003', title: 'Velocity Points: Complete Redemption Guide', url: 'https://elitetravelhackers.com/velocity-points-redemption-guide', schemaType: 'FAQ', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(2) },
    { articleId: 'art_004', title: 'Best Travel Credit Cards in Australia', url: 'https://elitetravelhackers.com/best-travel-credit-cards-australia', schemaType: 'Article', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(2) },
    { articleId: 'art_005', title: 'How to Manufacture Spend Safely', url: 'https://elitetravelhackers.com/manufactured-spending-guide', schemaType: 'HowTo', schemaValid: true, richResultsEligible: false, lastChecked: daysAgo(3) },
    { articleId: 'art_006', title: 'KrisFlyer Sweet Spots Explained', url: 'https://elitetravelhackers.com/krisflyer-sweet-spots', schemaType: 'Article', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(3) },
    { articleId: 'art_007', title: 'Hotel Status Matches: 2026 Edition', url: 'https://elitetravelhackers.com/hotel-status-matches', schemaType: 'None', schemaValid: false, richResultsEligible: false, lastChecked: daysAgo(4), validationErrors: ['No structured data found on page'] },
    { articleId: 'art_008', title: 'Beginner Guide to Travel Hacking', url: 'https://elitetravelhackers.com/beginner-guide-travel-hacking', schemaType: 'FAQ', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(4) },
  ],
  epm: [
    { articleId: 'art_101', title: 'Chase Sapphire Preferred Review', url: 'https://elitepointsandmiles.com/chase-sapphire-preferred-review', schemaType: 'Review', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(1) },
    { articleId: 'art_102', title: 'Best Airline Transfer Partners', url: 'https://elitepointsandmiles.com/airline-transfer-partners', schemaType: 'Article', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(2) },
    { articleId: 'art_103', title: 'KrisFlyer Miles Sweet Spots', url: 'https://elitepointsandmiles.com/krisflyer-miles-sweet-spots', schemaType: 'Article', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(2) },
    { articleId: 'art_104', title: 'Best Hotel Credit Cards', url: 'https://elitepointsandmiles.com/best-hotel-credit-cards', schemaType: 'FAQ', schemaValid: false, richResultsEligible: false, lastChecked: daysAgo(3), validationErrors: ['FAQPage mainEntity must contain at least one Question'] },
    { articleId: 'art_105', title: 'Round the World Award Ticket', url: 'https://elitepointsandmiles.com/round-the-world-award-ticket', schemaType: 'HowTo', schemaValid: true, richResultsEligible: true, lastChecked: daysAgo(3) },
    { articleId: 'art_106', title: 'How to Use Points for Flights', url: 'https://elitepointsandmiles.com/how-to-use-points-for-flights', schemaType: 'None', schemaValid: false, richResultsEligible: false, lastChecked: daysAgo(5), validationErrors: ['No structured data found on page'] },
  ],
};

// ── Seed: Indexing ──────────────────────────────────────────────────────────

const indexing: Record<string, IndexingDoc[]> = {
  eth: [
    { id: 'idx_001', url: 'https://elitetravelhackers.com/qantas-frequent-flyer-guide', title: 'Ultimate Guide to Qantas Frequent Flyer', status: 'Indexed', lastCrawled: daysAgo(1), submittedDate: daysAgo(40) },
    { id: 'idx_002', url: 'https://elitetravelhackers.com/amex-platinum-edge-review', title: 'Amex Platinum Edge Review 2026', status: 'Indexed', lastCrawled: daysAgo(2), submittedDate: daysAgo(35) },
    { id: 'idx_003', url: 'https://elitetravelhackers.com/velocity-points-redemption-guide', title: 'Velocity Points: Complete Redemption Guide', status: 'Indexed', lastCrawled: daysAgo(1), submittedDate: daysAgo(38) },
    { id: 'idx_004', url: 'https://elitetravelhackers.com/best-travel-credit-cards-australia', title: 'Best Travel Credit Cards in Australia', status: 'Indexed', lastCrawled: hoursAgo(20), submittedDate: daysAgo(60) },
    { id: 'idx_005', url: 'https://elitetravelhackers.com/manufactured-spending-guide', title: 'How to Manufacture Spend Safely', status: 'Crawled', lastCrawled: daysAgo(3), submittedDate: daysAgo(14) },
    { id: 'idx_006', url: 'https://elitetravelhackers.com/krisflyer-sweet-spots', title: 'KrisFlyer Sweet Spots Explained', status: 'Indexed', lastCrawled: daysAgo(2), submittedDate: daysAgo(28) },
    { id: 'idx_007', url: 'https://elitetravelhackers.com/round-the-world-business-class', title: 'Round the World in Business Class', status: 'Discovered', lastCrawled: daysAgo(9), coverageIssue: 'Discovered — currently not indexed (crawled but not scheduled)' },
    { id: 'idx_008', url: 'https://elitetravelhackers.com/hotel-status-matches', title: 'Hotel Status Matches: 2026 Edition', status: 'Not Indexed', lastCrawled: daysAgo(6), submittedDate: daysAgo(6), coverageIssue: 'Duplicate without user-selected canonical' },
    { id: 'idx_009', url: 'https://elitetravelhackers.com/chase-vs-amex-gold', title: 'Chase Sapphire Preferred vs Amex Gold', status: 'Error', lastCrawled: daysAgo(4), submittedDate: daysAgo(4), coverageIssue: 'Server error (5xx) during fetch' },
    { id: 'idx_010', url: 'https://elitetravelhackers.com/beginner-guide-travel-hacking', title: 'Beginner Guide to Travel Hacking', status: 'Indexed', lastCrawled: hoursAgo(30), submittedDate: daysAgo(90) },
  ],
  epm: [
    { id: 'idx_101', url: 'https://elitepointsandmiles.com/chase-sapphire-preferred-review', title: 'Chase Sapphire Preferred Review', status: 'Indexed', lastCrawled: daysAgo(1), submittedDate: daysAgo(50) },
    { id: 'idx_102', url: 'https://elitepointsandmiles.com/airline-transfer-partners', title: 'Best Airline Transfer Partners', status: 'Indexed', lastCrawled: daysAgo(2), submittedDate: daysAgo(45) },
    { id: 'idx_103', url: 'https://elitepointsandmiles.com/krisflyer-miles-sweet-spots', title: 'KrisFlyer Miles Sweet Spots', status: 'Indexed', lastCrawled: hoursAgo(26), submittedDate: daysAgo(30) },
    { id: 'idx_104', url: 'https://elitepointsandmiles.com/best-hotel-credit-cards', title: 'Best Hotel Credit Cards', status: 'Crawled', lastCrawled: daysAgo(4), submittedDate: daysAgo(12) },
    { id: 'idx_105', url: 'https://elitepointsandmiles.com/round-the-world-award-ticket', title: 'Round the World Award Ticket', status: 'Indexed', lastCrawled: daysAgo(3), submittedDate: daysAgo(22) },
    { id: 'idx_106', url: 'https://elitepointsandmiles.com/how-to-use-points-for-flights', title: 'How to Use Points for Flights', status: 'Not Indexed', lastCrawled: daysAgo(7), coverageIssue: 'Crawled — currently not indexed (quality)' },
    { id: 'idx_107', url: 'https://elitepointsandmiles.com/emirates-first-class-awards', title: 'Emirates First Class Awards', status: 'Discovered', lastCrawled: daysAgo(11) },
    { id: 'idx_108', url: 'https://elitepointsandmiles.com/citi-premier-card-guide', title: 'Citi Premier Card Guide', status: 'Error', lastCrawled: daysAgo(5), submittedDate: daysAgo(5), coverageIssue: 'Redirect error (loop detected)' },
  ],
};

// ── Seed: Backlinks ─────────────────────────────────────────────────────────

const backlinks: Record<string, BacklinkDoc[]> = {
  eth: [
    { id: 'bl_001', status: 'New', sourceUrl: 'https://www.pointhacks.com.au/qantas-guides-roundup', sourceDomain: 'pointhacks.com.au', sourceDr: 71, targetPage: '/qantas-frequent-flyer-guide', anchorText: 'ultimate Qantas Frequent Flyer guide', linkType: 'Dofollow', date: daysAgo(2) },
    { id: 'bl_002', status: 'New', sourceUrl: 'https://www.executivetraveller.com/best-points-resources', sourceDomain: 'executivetraveller.com', sourceDr: 76, targetPage: '/best-travel-credit-cards-australia', anchorText: 'Elite Travel Hackers', linkType: 'Dofollow', date: daysAgo(5) },
    { id: 'bl_003', status: 'New', sourceUrl: 'https://www.ausbt.com.au/forum/where-do-you-track-cards', sourceDomain: 'ausbt.com.au', sourceDr: 74, targetPage: '/amex-platinum-edge-review', anchorText: 'this detailed Amex Edge review', linkType: 'Dofollow', date: daysAgo(9) },
    { id: 'bl_004', status: 'Lost', sourceUrl: 'https://viewfromthewing.com/weekly-links-2026-09', sourceDomain: 'viewfromthewing.com', sourceDr: 68, targetPage: '/manufactured-spending-guide', anchorText: 'manufactured spending primer', linkType: 'Dofollow', date: daysAgo(6) },
    { id: 'bl_005', status: 'New', sourceUrl: 'https://thepointsguy.com/guide/australia-points-resources', sourceDomain: 'thepointsguy.com', sourceDr: 84, targetPage: '/velocity-points-redemption-guide', anchorText: 'Velocity redemption chart', linkType: 'Nofollow', date: daysAgo(12) },
    { id: 'bl_006', status: 'New', sourceUrl: 'https://www.frugalfirstclasstravel.com/krisflyer-resources', sourceDomain: 'frugalfirstclasstravel.com', sourceDr: 54, targetPage: '/krisflyer-sweet-spots', anchorText: 'KrisFlyer sweet spots explained', linkType: 'Dofollow', date: daysAgo(15) },
    { id: 'bl_007', status: 'Lost', sourceUrl: 'https://onemileatatime.com/guides/credit-card-links', sourceDomain: 'onemileatatime.com', sourceDr: 79, targetPage: '/chase-vs-amex-gold', anchorText: 'Sapphire vs Gold comparison', linkType: 'Dofollow', date: daysAgo(18) },
    { id: 'bl_008', status: 'New', sourceUrl: 'https://www.nerdwallet.com/article/travel/best-travel-cards', sourceDomain: 'nerdwallet.com', sourceDr: 88, targetPage: '/best-travel-credit-cards-australia', anchorText: 'Australian travel card picks', linkType: 'Nofollow', date: daysAgo(21) },
    { id: 'bl_009', status: 'New', sourceUrl: 'https://upgrd.com/resources/travel-hacking-blogs', sourceDomain: 'upgrd.com', sourceDr: 61, targetPage: '/beginner-guide-travel-hacking', anchorText: 'beginner-friendly travel hacking guide', linkType: 'Dofollow', date: daysAgo(24) },
    { id: 'bl_010', status: 'Lost', sourceUrl: 'https://www.finder.com.au/credit-cards/travel', sourceDomain: 'finder.com.au', sourceDr: 82, targetPage: '/credit-card-signup-bonus-tracker', anchorText: 'signup bonus tracker', linkType: 'Dofollow', date: daysAgo(28) },
    { id: 'bl_011', status: 'New', sourceUrl: 'https://www.moneysmart.gov.au/credit-cards/rewards-programs', sourceDomain: 'moneysmart.gov.au', sourceDr: 80, targetPage: '/qantas-frequent-flyer-guide', anchorText: 'example frequent flyer strategy', linkType: 'Nofollow', date: daysAgo(33) },
    { id: 'bl_012', status: 'New', sourceUrl: 'https://flightcentre.com.au/blog/points-guide', sourceDomain: 'flightcentre.com.au', sourceDr: 77, targetPage: '/round-the-world-business-class', anchorText: 'round-the-world with points', linkType: 'Dofollow', date: daysAgo(40) },
  ],
  epm: [
    { id: 'bl_101', status: 'New', sourceUrl: 'https://thepointsguy.com/reviews/best-sapphire-resources', sourceDomain: 'thepointsguy.com', sourceDr: 84, targetPage: '/chase-sapphire-preferred-review', anchorText: 'in-depth Sapphire Preferred review', linkType: 'Nofollow', date: daysAgo(3) },
    { id: 'bl_102', status: 'New', sourceUrl: 'https://onemileatatime.com/guides/transfer-partners', sourceDomain: 'onemileatatime.com', sourceDr: 79, targetPage: '/airline-transfer-partners', anchorText: 'transfer partner breakdown', linkType: 'Dofollow', date: daysAgo(7) },
    { id: 'bl_103', status: 'Lost', sourceUrl: 'https://www.nerdwallet.com/article/credit-cards/links-june', sourceDomain: 'nerdwallet.com', sourceDr: 88, targetPage: '/best-hotel-credit-cards', anchorText: 'hotel card analysis', linkType: 'Dofollow', date: daysAgo(11) },
    { id: 'bl_104', status: 'New', sourceUrl: 'https://upgrd.com/guides/krisflyer', sourceDomain: 'upgrd.com', sourceDr: 61, targetPage: '/krisflyer-miles-sweet-spots', anchorText: 'KrisFlyer sweet spots', linkType: 'Dofollow', date: daysAgo(16) },
    { id: 'bl_105', status: 'New', sourceUrl: 'https://viewfromthewing.com/rtw-resources', sourceDomain: 'viewfromthewing.com', sourceDr: 68, targetPage: '/round-the-world-award-ticket', anchorText: 'RTW award ticket walkthrough', linkType: 'Dofollow', date: daysAgo(23) },
    { id: 'bl_106', status: 'New', sourceUrl: 'https://frequentmiler.com/best-points-blogs', sourceDomain: 'frequentmiler.com', sourceDr: 73, targetPage: '/how-to-use-points-for-flights', anchorText: 'using points for flights 101', linkType: 'Dofollow', date: daysAgo(31) },
    { id: 'bl_107', status: 'Lost', sourceUrl: 'https://doctorofcredit.com/resources-page', sourceDomain: 'doctorofcredit.com', sourceDr: 75, targetPage: '/citi-premier-card-guide', anchorText: 'Citi Premier deep dive', linkType: 'Dofollow', date: daysAgo(36) },
    { id: 'bl_108', status: 'New', sourceUrl: 'https://millionmilesecrets.com/guides/emirates-awards', sourceDomain: 'millionmilesecrets.com', sourceDr: 70, targetPage: '/emirates-first-class-awards', anchorText: 'Emirates first class award guide', linkType: 'Nofollow', date: daysAgo(44) },
  ],
};

// ── Seed: Redirects ─────────────────────────────────────────────────────────

const redirects: Record<string, RedirectDoc[]> = {
  eth: [
    { id: 'red_001', sourceUrl: '/old-qantas-guide', destinationUrl: '/qantas-frequent-flyer-guide', statusCode: 301, chainLength: 1, createdAt: daysAgo(90), createdBy: 'daynis@ditconsulting.com.au', status: 'Active', notes: 'Legacy slug consolidated after content refresh' },
    { id: 'red_002', sourceUrl: '/amex-review-2024', destinationUrl: '/amex-platinum-edge-review', statusCode: 301, chainLength: 1, createdAt: daysAgo(210), createdBy: 'admin@elitetravelhackers.com', status: 'Active', notes: 'Annual review renamed for 2026 edition' },
    { id: 'red_003', sourceUrl: '/velocity-guide', destinationUrl: '/velocity-points-redemption-guide', statusCode: 301, chainLength: 3, finalDestination: '/velocity-points-redemption-guide', chain: [{ url: '/velocity-guide', code: 301 }, { url: '/velocity-redemptions', code: 301 }, { url: '/velocity-points-redemption-guide', code: 301 }], createdAt: daysAgo(320), createdBy: 'admin@elitetravelhackers.com', status: 'Active', notes: 'Double legacy hop — flatten when time permits' },
    { id: 'red_004', sourceUrl: '/points-101', destinationUrl: '/beginner-guide-travel-hacking', statusCode: 302, chainLength: 1, createdAt: daysAgo(45), createdBy: 'daynis@ditconsulting.com.au', status: 'Active', notes: 'Temporary while A/B testing the new landing page' },
    { id: 'red_005', sourceUrl: '/hotel-status-2023', destinationUrl: '/hotel-status-matches-removed', statusCode: 301, chainLength: 1, createdAt: daysAgo(400), createdBy: 'admin@elitetravelhackers.com', status: 'Broken', notes: 'Destination was deleted — repoint to /hotel-status-matches' },
    { id: 'red_006', sourceUrl: '/churning', destinationUrl: '/credit-card-churning-australia', statusCode: 307, chainLength: 1, createdAt: daysAgo(60), createdBy: 'daynis@ditconsulting.com.au', status: 'Active' },
    { id: 'red_007', sourceUrl: '/home-v1', destinationUrl: '/home-v1', statusCode: 301, chainLength: 2, finalDestination: '/home-v1', chain: [{ url: '/home-v1', code: 301 }, { url: '/home-v1', code: 301 }], createdAt: daysAgo(500), createdBy: 'admin@elitetravelhackers.com', status: 'Loop', notes: 'Self-referencing loop detected by crawler — delete' },
    { id: 'red_008', sourceUrl: '/krisflyer', destinationUrl: '/krisflyer-sweet-spots', statusCode: 301, chainLength: 1, createdAt: daysAgo(150), createdBy: 'admin@elitetravelhackers.com', status: 'Active' },
  ],
  epm: [
    { id: 'red_101', sourceUrl: '/csp-review', destinationUrl: '/chase-sapphire-preferred-review', statusCode: 301, chainLength: 1, createdAt: daysAgo(120), createdBy: 'admin@elitepointsandmiles.com', status: 'Active', notes: 'Short slug from the old newsletter' },
    { id: 'red_102', sourceUrl: '/transfer-partners-2024', destinationUrl: '/airline-transfer-partners', statusCode: 301, chainLength: 1, createdAt: daysAgo(180), createdBy: 'admin@elitepointsandmiles.com', status: 'Active' },
    { id: 'red_103', sourceUrl: '/hotel-cards', destinationUrl: '/best-hotel-credit-cards', statusCode: 302, chainLength: 1, createdAt: daysAgo(30), createdBy: 'daynis@ditconsulting.com.au', status: 'Active', notes: 'Seasonal campaign URL' },
    { id: 'red_104', sourceUrl: '/rtw', destinationUrl: '/round-the-world-award-ticket', statusCode: 301, chainLength: 2, finalDestination: '/round-the-world-award-ticket', chain: [{ url: '/rtw', code: 301 }, { url: '/round-the-world-award-ticket', code: 301 }], createdAt: daysAgo(260), createdBy: 'admin@elitepointsandmiles.com', status: 'Active' },
    { id: 'red_105', sourceUrl: '/citi-guide-2023', destinationUrl: '/citi-premier-card-guide-old', statusCode: 301, chainLength: 1, createdAt: daysAgo(380), createdBy: 'admin@elitepointsandmiles.com', status: 'Broken', notes: 'Target 404s — repoint to current Citi guide' },
  ],
};

// ── Seed: Position Tracking ─────────────────────────────────────────────────

function mkHistory(positions: (number | null)[]): { date: string; position: number }[] {
  return positions
    .map((p, i) => ({ date: isoWeeksAgo(positions.length - 1 - i), position: p }))
    .filter((e): e is { date: string; position: number } => e.position !== null);
}

const COMPETITORS = ['thepointsguy.com', 'nerdwallet.com', 'onemileatatime.com', 'pointhacks.com.au', 'upgrd.com'];

function mkCompetitors(...positions: (number | null)[]): { name: string; position: number }[] {
  const out: { name: string; position: number }[] = [];
  positions.forEach((p, i) => {
    const name = COMPETITORS[i];
    if (p !== null && name) out.push({ name, position: p });
  });
  return out;
}

function mkSnapshot(weeksAgo: number, ethRank: number | null, keyword: string): { date: string; featuredSnippet: string | null; results: { rank: number; domain: string; title: string; features: string[]; isETH: boolean; isCompetitor: boolean }[] } {
  const domains = ['thepointsguy.com', 'nerdwallet.com', 'elitepointsandmiles.com', 'onemileatatime.com', 'pointhacks.com.au'];
  const results = domains.map((domain, i) => {
    const isETH = domain === 'elitepointsandmiles.com';
    return {
      rank: i + 1,
      domain,
      title: isETH ? `${keyword} — Elite Points & Miles` : `${keyword} | ${domain.split('.')[0]}`,
      features: i === 0 ? ['Featured Snippet', 'Sitelinks'] : i === 1 ? ['Sitelinks'] : [],
      isETH,
      isCompetitor: !isETH,
    };
  });
  // Reorder so ETH sits at ethRank when provided
  if (ethRank !== null) {
    const ethIdx = results.findIndex((r) => r.isETH);
    const eth = results.splice(ethIdx, 1)[0];
    if (eth) {
      results.splice(Math.min(Math.max(ethRank - 1, 0), results.length), 0, eth);
      results.forEach((r, i) => { r.rank = i + 1; });
    }
  } else {
    const filtered = results.filter((r) => !r.isETH);
    filtered.forEach((r, i) => { r.rank = i + 1; });
    return { date: isoWeeksAgo(weeksAgo), featuredSnippet: weeksAgo === 0 ? null : 'thepointsguy.com', results: filtered };
  }
  return { date: isoWeeksAgo(weeksAgo), featuredSnippet: weeksAgo === 0 && ethRank !== 1 ? 'thepointsguy.com' : null, results };
}

interface TrackSeed {
  id: string;
  keyword: string;
  siteId: string;
  position: number | null;
  positionChange: number | null;
  changeType: ChangeType;
  bestPosition: number | null;
  volume: number;
  kd: number;
  cpc: number;
  intent: PositionTrackingDoc['intent'];
  slug: string | null;
  features: string[];
  history: (number | null)[];
  competitors: (number | null)[];
}

function mkTrack(s: TrackSeed): PositionTrackingDoc {
  return {
    id: s.id,
    keyword: s.keyword,
    siteId: s.siteId,
    position: s.position,
    positionChange: s.positionChange,
    changeType: s.changeType,
    bestPosition: s.bestPosition,
    ...(s.bestPosition !== null ? { bestPositionDate: isoWeeksAgo(3) } : {}),
    volume: s.volume,
    kd: s.kd,
    cpc: s.cpc,
    intent: s.intent,
    ethUrl: s.slug ? `https://${s.siteId === 'epm' ? 'elitepointsandmiles.com' : 'elitetravelhackers.com'}/${s.slug}` : null,
    serpFeatures: s.features,
    competitors: mkCompetitors(...s.competitors),
    positionHistory: mkHistory(s.history),
    serpSnapshots: [
      mkSnapshot(1, s.position, s.keyword),
      mkSnapshot(0, s.position, s.keyword),
    ],
    updatedAt: hoursAgo(12),
  };
}

const positionTracking: PositionTrackingDoc[] = [
  mkTrack({ id: 'kw_001', keyword: 'best travel credit cards australia', siteId: 'epm', position: 4, positionChange: 2, changeType: 'improved', bestPosition: 3, volume: 8100, kd: 58, cpc: 4.2, intent: 'Comm', slug: 'best-travel-credit-cards-australia', features: ['Featured Snippet', 'People Also Ask', 'Video'], history: [9, 8, 8, 7, 6, 6, 5, 6, 5, 5, 6, 4], competitors: [1, 2, 5, 7, 9] }),
  mkTrack({ id: 'kw_002', keyword: 'chase sapphire preferred review', siteId: 'epm', position: null, positionChange: null, changeType: 'lost', bestPosition: 18, volume: 33100, kd: 72, cpc: 6.8, intent: 'Comm', slug: 'chase-sapphire-preferred-review', features: ['Featured Snippet', 'Knowledge Panel', 'People Also Ask'], history: [18, 21, 24, 28, 33, 37, 42, 48, 55, 63, null, null], competitors: [1, 2, 3, 4, 6] }),
  mkTrack({ id: 'kw_003', keyword: 'amex platinum edge review', siteId: 'epm', position: 2, positionChange: 1, changeType: 'improved', bestPosition: 2, volume: 1900, kd: 34, cpc: 1.8, intent: 'Comm', slug: 'amex-platinum-edge-review', features: ['Reviews', 'People Also Ask'], history: [6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2], competitors: [1, 3, 5, 8, 11] }),
  mkTrack({ id: 'kw_004', keyword: 'qantas frequent flyer points guide', siteId: 'epm', position: 7, positionChange: -1, changeType: 'declined', bestPosition: 4, volume: 5400, kd: 61, cpc: 2.9, intent: 'Info', slug: 'qantas-frequent-flyer-guide', features: ['People Also Ask', 'Video'], history: [5, 5, 4, 5, 5, 6, 5, 6, 6, 6, 6, 7], competitors: [1, 2, 3, 4, 8] }),
  mkTrack({ id: 'kw_005', keyword: 'velocity points redemption chart', siteId: 'epm', position: 3, positionChange: 0, changeType: 'stable', bestPosition: 2, volume: 2900, kd: 45, cpc: 1.4, intent: 'Info', slug: 'velocity-points-redemption-guide', features: ['Featured Snippet'], history: [4, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3], competitors: [1, 2, 4, 6, 10] }),
  mkTrack({ id: 'kw_006', keyword: 'best airline transfer partners', siteId: 'epm', position: 11, positionChange: 3, changeType: 'improved', bestPosition: 9, volume: 1300, kd: 38, cpc: 2.1, intent: 'Info', slug: 'airline-transfer-partners', features: ['People Also Ask'], history: [19, 18, 17, 16, 15, 15, 14, 14, 13, 14, 14, 11], competitors: [1, 2, 3, 5, 7] }),
  mkTrack({ id: 'kw_007', keyword: 'krisflyer miles sweet spots', siteId: 'epm', position: 5, positionChange: 4, changeType: 'improved', bestPosition: 5, volume: 880, kd: 29, cpc: 0.9, intent: 'Info', slug: 'krisflyer-miles-sweet-spots', features: [], history: [12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 9, 5], competitors: [1, 3, 4, 6, 12] }),
  mkTrack({ id: 'kw_008', keyword: 'credit card signup bonus australia', siteId: 'epm', position: 9, positionChange: -2, changeType: 'declined', bestPosition: 6, volume: 3600, kd: 52, cpc: 3.7, intent: 'Comm', slug: 'credit-card-signup-bonus-tracker', features: ['Top Stories', 'People Also Ask'], history: [7, 7, 6, 7, 7, 8, 7, 8, 8, 7, 7, 9], competitors: [1, 2, 3, 4, 5] }),
  mkTrack({ id: 'kw_009', keyword: 'round the world award ticket', siteId: 'epm', position: 14, positionChange: null, changeType: 'new', bestPosition: 14, volume: 1900, kd: 41, cpc: 1.6, intent: 'Info', slug: 'round-the-world-award-ticket', features: ['Video'], history: [null, null, null, null, null, null, null, 28, 22, 18, 16, 14], competitors: [1, 2, 4, 5, 8] }),
  mkTrack({ id: 'kw_010', keyword: 'best hotel credit cards', siteId: 'epm', position: 22, positionChange: 1, changeType: 'stable', bestPosition: 15, volume: 6600, kd: 64, cpc: 5.4, intent: 'Comm', slug: 'best-hotel-credit-cards', features: ['Featured Snippet', 'People Also Ask'], history: [26, 25, 24, 25, 24, 23, 24, 23, 23, 22, 23, 22], competitors: [1, 2, 3, 4, 5] }),
  mkTrack({ id: 'kw_011', keyword: 'how to use points for flights', siteId: 'epm', position: 6, positionChange: 1, changeType: 'improved', bestPosition: 5, volume: 2400, kd: 35, cpc: 1.1, intent: 'Info', slug: 'how-to-use-points-for-flights', features: ['People Also Ask', 'Video'], history: [11, 10, 10, 9, 8, 8, 7, 7, 7, 6, 7, 6], competitors: [1, 2, 3, 5, 9] }),
  mkTrack({ id: 'kw_012', keyword: 'emirates first class award availability', siteId: 'epm', position: null, positionChange: null, changeType: 'lost', bestPosition: 12, volume: 720, kd: 33, cpc: 0.8, intent: 'Info', slug: 'emirates-first-class-awards', features: [], history: [12, 14, 16, 19, 23, 27, 32, 39, 45, 58, null, null], competitors: [1, 2, 4, 6, 7] }),
  // eth site keywords
  mkTrack({ id: 'kw_201', keyword: 'elite travel hackers', siteId: 'eth', position: 1, positionChange: 0, changeType: 'stable', bestPosition: 1, volume: 320, kd: 12, cpc: 0.4, intent: 'Navi', slug: '', features: ['Sitelinks'], history: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], competitors: [null, null, 4, 6, null] }),
  mkTrack({ id: 'kw_202', keyword: 'travel hacking for beginners', siteId: 'eth', position: 8, positionChange: 3, changeType: 'improved', bestPosition: 8, volume: 1600, kd: 42, cpc: 1.3, intent: 'Info', slug: 'beginner-guide-travel-hacking', features: ['People Also Ask'], history: [16, 15, 14, 14, 13, 12, 12, 11, 11, 10, 11, 8], competitors: [1, 2, 3, 5, 7] }),
  mkTrack({ id: 'kw_203', keyword: 'manufactured spending guide', siteId: 'eth', position: 17, positionChange: -4, changeType: 'declined', bestPosition: 9, volume: 1000, kd: 47, cpc: 2.0, intent: 'Info', slug: 'manufactured-spending-guide', features: [], history: [11, 11, 10, 12, 12, 13, 12, 13, 13, 14, 13, 17], competitors: [1, 2, 4, 6, 9] }),
  mkTrack({ id: 'kw_204', keyword: 'best ways to earn qantas points', siteId: 'eth', position: 5, positionChange: 2, changeType: 'improved', bestPosition: 5, volume: 2100, kd: 50, cpc: 1.7, intent: 'Info', slug: 'qantas-frequent-flyer-guide', features: ['Featured Snippet', 'People Also Ask'], history: [9, 9, 8, 8, 7, 7, 7, 6, 6, 7, 7, 5], competitors: [1, 2, 3, 4, 8] }),
  mkTrack({ id: 'kw_205', keyword: 'amex explorer card review', siteId: 'eth', position: 12, positionChange: 0, changeType: 'stable', bestPosition: 10, volume: 950, kd: 39, cpc: 1.5, intent: 'Comm', slug: 'amex-explorer-card-review', features: ['Reviews'], history: [13, 13, 12, 12, 12, 11, 12, 12, 12, 12, 12, 12], competitors: [1, 2, 3, 5, 6] }),
  mkTrack({ id: 'kw_206', keyword: 'status run guide qantas', siteId: 'eth', position: 3, positionChange: 5, changeType: 'improved', bestPosition: 3, volume: 480, kd: 26, cpc: 0.7, intent: 'Info', slug: 'status-run-guide-qantas', features: [], history: [14, 13, 12, 11, 10, 9, 9, 8, 8, 8, 8, 3], competitors: [1, 2, 5, 7, 11] }),
  mkTrack({ id: 'kw_207', keyword: 'hotel elite status match', siteId: 'eth', position: 25, positionChange: -3, changeType: 'declined', bestPosition: 14, volume: 1900, kd: 55, cpc: 2.4, intent: 'Info', slug: 'hotel-status-matches', features: ['People Also Ask'], history: [18, 18, 17, 18, 19, 20, 21, 21, 22, 22, 22, 25], competitors: [1, 2, 3, 4, 6] }),
  mkTrack({ id: 'kw_208', keyword: 'credit card churning australia', siteId: 'eth', position: null, positionChange: null, changeType: 'new', bestPosition: null, volume: 1400, kd: 44, cpc: 1.9, intent: 'Info', slug: 'credit-card-churning-australia', features: [], history: [null, null, null, null, null, null, null, null, null, null, null, null], competitors: [1, 2, 3, 5, 8] }),
];

// ── Seed: Page Audits ───────────────────────────────────────────────────────

const COMPONENT_KEYS: AuditComponentKey[] = [
  'titleTag', 'metaDescription', 'h1Tag', 'contentLength', 'keywordUsage',
  'internalLinks', 'externalLinks', 'imageAltText', 'schemaMarkup',
  'urlStructure', 'readability', 'contentFreshness',
];

const COMPONENT_LABELS: Record<AuditComponentKey, { pass: string; warning: string; fail: string }> = {
  titleTag: { pass: 'Title tag present, 52 characters, primary keyword at the front.', warning: 'Title tag is 71 characters — truncated in SERPs.', fail: 'Title tag is missing or duplicates another page.' },
  metaDescription: { pass: 'Meta description present, 148 characters with a clear CTA.', warning: 'Meta description is 92 characters — too short to be compelling.', fail: 'Meta description is missing; Google is auto-generating the snippet.' },
  h1Tag: { pass: 'Exactly one H1 containing the primary keyword.', warning: 'H1 present but does not contain the primary keyword.', fail: 'No H1 element found on the page.' },
  contentLength: { pass: '2,140 words — comfortably above the competitive threshold.', warning: '890 words — below the 1,200-word average of page-1 results.', fail: '410 words — thin content for this query.' },
  keywordUsage: { pass: 'Primary keyword in title, H1, first 100 words and 0.9% density.', warning: 'Keyword density 0.3% — primary term under-used in body copy.', fail: 'Primary keyword absent from the first 100 words.' },
  internalLinks: { pass: '14 internal links with descriptive anchor text.', warning: 'Only 3 internal links — add links to related guides.', fail: 'No internal links — page is effectively orphaned.' },
  externalLinks: { pass: '4 links to authoritative sources (airline and bank pages).', warning: '1 external link — add citations for key claims.', fail: 'No external citations — hurts E-E-A-T.' },
  imageAltText: { pass: 'All 9 images have descriptive alt text.', warning: '3 of 8 images are missing alt attributes.', fail: 'No images have alt text.' },
  schemaMarkup: { pass: 'Valid Article schema with author, datePublished and image.', warning: 'Schema present but missing recommended "author" property.', fail: 'Schema invalid — rich results are suppressed.' },
  urlStructure: { pass: 'Short, hyphenated slug containing the primary keyword.', warning: 'URL contains a date segment that ages the content.', fail: 'URL is 96 characters with query parameters.' },
  readability: { pass: 'Flesch 62 — short sentences, scannable subheadings.', warning: 'Flesch 44 — long paragraphs; break up sections 4–6.', fail: 'Flesch 28 — dense, academic tone unsuitable for the topic.' },
  contentFreshness: { pass: 'Updated 12 days ago with the current bonus table.', warning: 'Last meaningful update was 7 months ago.', fail: 'Content is 2+ years old with outdated offer details.' },
};

function mkComponents(score: number, failKeys: AuditComponentKey[] = [], warnKeys: AuditComponentKey[] = []): AuditComponents {
  const out = {} as AuditComponents;
  for (const key of COMPONENT_KEYS) {
    let status: AuditComponentStatus = 'pass';
    let compScore = 90 + ((score * 7 + key.length * 13) % 11); // deterministic 90-100
    if (failKeys.includes(key)) {
      status = 'fail';
      compScore = 20 + ((score * 3 + key.length * 7) % 30); // 20-49
    } else if (warnKeys.includes(key)) {
      status = 'warning';
      compScore = 55 + ((score * 5 + key.length * 11) % 20); // 55-74
    }
    out[key] = { score: compScore, status, detail: COMPONENT_LABELS[key][status] };
  }
  return out;
}

interface AuditSeed {
  articleId: string;
  title: string;
  slug: string;
  siteId: string;
  score: number;
  fails?: AuditComponentKey[];
  warns?: AuditComponentKey[];
  traffic: number;
  keyword: string;
  position: number | null;
  publishedDaysAgo: number;
  auditedBy: PageAuditDoc['auditedBy'];
  lastAuditedDaysAgo: number;
  topIssue?: { text: string; severity: 'Critical' | 'Warning' | 'Info' };
}

function mkAudit(s: AuditSeed): PageAuditDoc {
  return {
    articleId: s.articleId,
    title: s.title,
    url: `https://${s.siteId === 'epm' ? 'elitepointsandmiles.com' : 'elitetravelhackers.com'}/${s.slug}`,
    publishedDate: daysAgo(s.publishedDaysAgo),
    seoScore: s.score,
    components: mkComponents(s.score, s.fails, s.warns),
    criticalCount: s.fails?.length ?? 0,
    warningCount: s.warns?.length ?? 0,
    ...(s.topIssue ? { topIssue: s.topIssue } : {}),
    traffic: s.traffic,
    keyword: s.keyword,
    position: s.position,
    lastAuditedAt: daysAgo(s.lastAuditedDaysAgo),
    auditedBy: s.auditedBy,
    siteId: s.siteId,
  };
}

const pageAudits: PageAuditDoc[] = [
  // eth (ascending seoScore — mirrors production orderBy)
  mkAudit({ articleId: 'art_008', title: 'Hotel Status Matches: 2026 Edition', slug: 'hotel-status-matches', siteId: 'eth', score: 58, fails: ['metaDescription', 'schemaMarkup'], warns: ['contentLength', 'contentFreshness'], traffic: 412, keyword: 'hotel elite status match', position: 25, publishedDaysAgo: 240, auditedBy: 'Auto', lastAuditedDaysAgo: 2, topIssue: { text: 'Meta description is missing; Google is auto-generating the snippet.', severity: 'Critical' } }),
  mkAudit({ articleId: 'art_005', title: 'How to Manufacture Spend Safely', slug: 'manufactured-spending-guide', siteId: 'eth', score: 61, fails: ['h1Tag'], warns: ['readability', 'internalLinks'], traffic: 388, keyword: 'manufactured spending guide', position: 17, publishedDaysAgo: 320, auditedBy: 'Auto', lastAuditedDaysAgo: 2, topIssue: { text: 'No H1 element found on the page.', severity: 'Critical' } }),
  mkAudit({ articleId: 'art_007', title: 'Round the World in Business Class', slug: 'round-the-world-business-class', siteId: 'eth', score: 71, warns: ['contentLength', 'readability', 'contentFreshness'], traffic: 655, keyword: 'round the world award ticket', position: 18, publishedDaysAgo: 400, auditedBy: 'Auto', lastAuditedDaysAgo: 4, topIssue: { text: 'Last meaningful update was 7 months ago.', severity: 'Warning' } }),
  mkAudit({ articleId: 'art_003', title: 'Velocity Points: Complete Redemption Guide', slug: 'velocity-points-redemption-guide', siteId: 'eth', score: 76, warns: ['imageAltText', 'externalLinks'], traffic: 1180, keyword: 'velocity points redemption chart', position: 6, publishedDaysAgo: 210, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_006', title: 'KrisFlyer Sweet Spots Explained', slug: 'krisflyer-sweet-spots', siteId: 'eth', score: 83, warns: ['imageAltText'], traffic: 540, keyword: 'krisflyer miles sweet spots', position: 8, publishedDaysAgo: 150, auditedBy: 'Publish', lastAuditedDaysAgo: 3 }),
  mkAudit({ articleId: 'art_009', title: 'Chase Sapphire Preferred vs Amex Gold', slug: 'chase-vs-amex-gold', siteId: 'eth', score: 85, warns: ['externalLinks'], traffic: 910, keyword: 'amex gold vs chase sapphire', position: 11, publishedDaysAgo: 120, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_002', title: 'Amex Platinum Edge Review 2026', slug: 'amex-platinum-edge-review', siteId: 'eth', score: 88, warns: ['schemaMarkup'], traffic: 1740, keyword: 'amex platinum edge review', position: 3, publishedDaysAgo: 95, auditedBy: 'Auto', lastAuditedDaysAgo: 2 }),
  mkAudit({ articleId: 'art_001', title: 'Ultimate Guide to Qantas Frequent Flyer', slug: 'qantas-frequent-flyer-guide', siteId: 'eth', score: 92, warns: ['internalLinks'], traffic: 3120, keyword: 'qantas frequent flyer points guide', position: 7, publishedDaysAgo: 180, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_004', title: 'Best Travel Credit Cards in Australia', slug: 'best-travel-credit-cards-australia', siteId: 'eth', score: 94, traffic: 4480, keyword: 'best travel credit cards australia', position: 4, publishedDaysAgo: 260, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_010', title: 'Beginner Guide to Travel Hacking', slug: 'beginner-guide-travel-hacking', siteId: 'eth', score: 96, traffic: 2050, keyword: 'travel hacking for beginners', position: 8, publishedDaysAgo: 70, auditedBy: 'Manual', lastAuditedDaysAgo: 5 }),
  // epm (ascending seoScore)
  mkAudit({ articleId: 'art_108', title: 'Emirates First Class Award Availability', slug: 'emirates-first-class-awards', siteId: 'epm', score: 55, fails: ['contentLength', 'internalLinks'], warns: ['contentFreshness', 'readability'], traffic: 210, keyword: 'emirates first class award availability', position: null, publishedDaysAgo: 420, auditedBy: 'Auto', lastAuditedDaysAgo: 3, topIssue: { text: '410 words — thin content for this query.', severity: 'Critical' } }),
  mkAudit({ articleId: 'art_106', title: 'How to Use Points for Flights', slug: 'how-to-use-points-for-flights', siteId: 'epm', score: 68, fails: ['schemaMarkup'], warns: ['externalLinks', 'readability'], traffic: 690, keyword: 'how to use points for flights', position: 6, publishedDaysAgo: 280, auditedBy: 'Auto', lastAuditedDaysAgo: 2, topIssue: { text: 'No structured data found on page.', severity: 'Critical' } }),
  mkAudit({ articleId: 'art_107', title: 'Citi Premier Card Guide', slug: 'citi-premier-card-guide', siteId: 'epm', score: 74, warns: ['contentLength', 'contentFreshness'], traffic: 355, keyword: 'citi premier card', position: 19, publishedDaysAgo: 350, auditedBy: 'Auto', lastAuditedDaysAgo: 6 }),
  mkAudit({ articleId: 'art_104', title: 'Best Hotel Credit Cards', slug: 'best-hotel-credit-cards', siteId: 'epm', score: 79, warns: ['schemaMarkup', 'keywordUsage'], traffic: 1320, keyword: 'best hotel credit cards', position: 22, publishedDaysAgo: 190, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_105', title: 'Round the World Award Ticket', slug: 'round-the-world-award-ticket', siteId: 'epm', score: 86, warns: ['readability'], traffic: 480, keyword: 'round the world award ticket', position: 14, publishedDaysAgo: 60, auditedBy: 'Publish', lastAuditedDaysAgo: 4 }),
  mkAudit({ articleId: 'art_102', title: 'Best Airline Transfer Partners', slug: 'airline-transfer-partners', siteId: 'epm', score: 90, warns: ['imageAltText'], traffic: 760, keyword: 'best airline transfer partners', position: 11, publishedDaysAgo: 140, auditedBy: 'Auto', lastAuditedDaysAgo: 1 }),
  mkAudit({ articleId: 'art_103', title: 'KrisFlyer Miles Sweet Spots', slug: 'krisflyer-miles-sweet-spots', siteId: 'epm', score: 93, traffic: 430, keyword: 'krisflyer miles sweet spots', position: 5, publishedDaysAgo: 110, auditedBy: 'Auto', lastAuditedDaysAgo: 2 }),
  mkAudit({ articleId: 'art_101', title: 'Chase Sapphire Preferred Review', slug: 'chase-sapphire-preferred-review', siteId: 'epm', score: 95, traffic: 2960, keyword: 'chase sapphire preferred review', position: null, publishedDaysAgo: 85, auditedBy: 'Manual', lastAuditedDaysAgo: 1 }),
];

// ── Seed: AI Overviews ──────────────────────────────────────────────────────

function mkAIOverview(s: Omit<AIOverviewDoc, 'updatedAt'>): AIOverviewDoc {
  return { ...s, updatedAt: hoursAgo(8) };
}

const aiOverviews: AIOverviewDoc[] = [
  mkAIOverview({
    id: 'aio_001', keyword: 'best travel credit cards australia', siteId: 'epm', volume: 8100,
    hasAIOverview: true, ethCited: 'Yes', aiOverviewType: 'List', ctrImpact: 34, position: 4, actualCtr: 6.1,
    trend: 'Stable',
    optimizationTips: [
      'Add a concise 40–60 word summary paragraph under the H1 — AI Overviews prefer extractable intros.',
      'Mark up the card comparison table with FAQ schema to increase citation surface.',
      'Include exact annual-fee figures in the first 100 words; the AI answer quotes fee data.',
    ],
    alternativeKeywords: [
      { keyword: 'top travel cards australia', volume: 1300, kd: 44, hasAIOverview: false },
      { keyword: 'best credit card for points australia', volume: 2400, kd: 51, hasAIOverview: true },
    ],
    aiAnswer: {
      claims: [
        { text: 'The American Express Platinum Edge is frequently cited as the best mid-tier travel card in Australia.', accuracy: 'accurate' },
        { text: 'Most premium travel cards in Australia carry annual fees between $195 and $1,450.', accuracy: 'accurate' },
        { text: 'Signup bonuses typically require $3,000–$5,000 spend within the first 90 days.', accuracy: 'partial' },
      ],
      sources: [
        { domain: 'elitepointsandmiles.com', url: 'https://elitepointsandmiles.com/best-travel-credit-cards-australia', isETH: true, isCompetitor: false },
        { domain: 'pointhacks.com.au', url: 'https://www.pointhacks.com.au/best-credit-cards', isETH: false, isCompetitor: true },
        { domain: 'finder.com.au', url: 'https://www.finder.com.au/credit-cards/travel', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'Which travel credit card has no annual fee?', tracked: false },
        { question: 'Are travel credit cards worth it in Australia?', tracked: true },
        { question: 'What is the best Qantas points credit card?', tracked: true },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_002', keyword: 'qantas points to dollars value', siteId: 'epm', volume: 4400,
    hasAIOverview: true, ethCited: 'Partial', aiOverviewType: 'Paragraph', ctrImpact: 22, position: 6, actualCtr: 4.4,
    trend: 'New',
    optimizationTips: [
      'Publish a definitive cents-per-point valuation table — the AI currently quotes a competitor range.',
      'Add a "last verified" date badge; freshness is a cited factor in this answer.',
    ],
    alternativeKeywords: [
      { keyword: 'how much are qantas points worth', volume: 3600, kd: 48, hasAIOverview: true },
      { keyword: 'qantas points value calculator', volume: 900, kd: 30, hasAIOverview: false },
    ],
    aiAnswer: {
      claims: [
        { text: 'Qantas Points are generally valued between 0.8c and 2.1c each depending on redemption.', accuracy: 'accurate' },
        { text: 'Classic Flight Rewards deliver the highest per-point value.', accuracy: 'accurate' },
        { text: 'Elite Points & Miles values Qantas Points at exactly 1.4c.', accuracy: 'partial' },
      ],
      sources: [
        { domain: 'pointhacks.com.au', url: 'https://www.pointhacks.com.au/qantas-points-value', isETH: false, isCompetitor: true },
        { domain: 'elitepointsandmiles.com', url: 'https://elitepointsandmiles.com/qantas-frequent-flyer-guide', isETH: true, isCompetitor: false },
      ],
      followUpQuestions: [
        { question: 'What is the best use of Qantas Points?', tracked: true },
        { question: 'Can you convert Qantas Points to cash?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_003', keyword: 'velocity vs qantas frequent flyer', siteId: 'epm', volume: 2900,
    hasAIOverview: true, ethCited: 'No', aiOverviewType: 'List', ctrImpact: 41, position: 9, actualCtr: 2.2,
    trend: 'Stable',
    optimizationTips: [
      'Create a head-to-head comparison page — no ETH URL is cited for this query.',
      'Target the follow-up question "which is easier to earn status with" as a separate section.',
      'Add structured pros/cons lists; List-type overviews reuse list markup.',
    ],
    alternativeKeywords: [
      { keyword: 'velocity frequent flyer review', volume: 1100, kd: 36, hasAIOverview: false },
      { keyword: 'qantas vs velocity status', volume: 720, kd: 33, hasAIOverview: true },
    ],
    aiAnswer: {
      claims: [
        { text: 'Velocity generally offers cheaper reward seats on domestic routes.', accuracy: 'accurate' },
        { text: 'Qantas has more international airline partners through oneworld.', accuracy: 'accurate' },
        { text: 'Velocity points expire after 24 months of inactivity regardless of activity type.', accuracy: 'inaccurate' },
      ],
      sources: [
        { domain: 'pointhacks.com.au', url: 'https://www.pointhacks.com.au/velocity-vs-qantas', isETH: false, isCompetitor: true },
        { domain: 'executivetraveller.com', url: 'https://www.executivetraveller.com/velocity-vs-qantas', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'Which program is better for international flights?', tracked: true },
        { question: 'Is Velocity status easier to earn than Qantas?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_004', keyword: 'how to get airport lounge access', siteId: 'epm', volume: 1900,
    hasAIOverview: true, ethCited: 'Yes', aiOverviewType: 'Steps', ctrImpact: 28, position: 3, actualCtr: 7.8,
    trend: 'Stable',
    optimizationTips: [
      'Keep the numbered step format — Steps-type overviews mirror ordered lists.',
      'Add Priority Pass pricing in AUD; the answer currently omits local pricing.',
    ],
    alternativeKeywords: [
      { keyword: 'credit cards with lounge access australia', volume: 1600, kd: 40, hasAIOverview: true },
      { keyword: 'priority pass guest rules', volume: 880, kd: 22, hasAIOverview: false },
    ],
    aiAnswer: {
      claims: [
        { text: 'Credit cards with lounge access include the Amex Platinum and Citi Prestige equivalents in Australia.', accuracy: 'accurate' },
        { text: 'Priority Pass memberships start from USD $99 per year.', accuracy: 'accurate' },
        { text: 'Qantas Club single-entry passes can sometimes be purchased at the door.', accuracy: 'partial' },
      ],
      sources: [
        { domain: 'elitepointsandmiles.com', url: 'https://elitepointsandmiles.com/airport-lounge-access-guide', isETH: true, isCompetitor: false },
        { domain: 'thepointsguy.com', url: 'https://thepointsguy.com/guide/lounge-access', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'Which credit card gives free lounge access?', tracked: true },
        { question: 'Can you pay for Qantas lounge entry?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_005', keyword: 'amex platinum edge benefits', siteId: 'epm', volume: 1100,
    hasAIOverview: false, ethCited: 'N/A', ctrImpact: 0, position: 2, actualCtr: 12.4,
    trend: 'Stable',
    optimizationTips: [
      'No AI Overview present — classic blue-link CTR is unaffected; keep the page as-is.',
      'Monitor monthly: benefit queries flip to AI Overviews after card issuers publish benefit pages.',
    ],
    alternativeKeywords: [
      { keyword: 'amex platinum edge review', volume: 1900, kd: 34, hasAIOverview: false },
    ],
  }),
  mkAIOverview({
    id: 'aio_006', keyword: 'krisflyer stopover rules', siteId: 'epm', volume: 590,
    hasAIOverview: true, ethCited: 'Partial', aiOverviewType: 'Paragraph', ctrImpact: 15, position: 5, actualCtr: 5.9,
    trend: 'New',
    optimizationTips: [
      'Expand the stopover section with a worked example itinerary — the AI answer lacks a concrete example.',
    ],
    alternativeKeywords: [
      { keyword: 'krisflyer free stopover award', volume: 320, kd: 18, hasAIOverview: false },
    ],
    aiAnswer: {
      claims: [
        { text: 'KrisFlyer allows one complimentary stopover on round-trip Saver awards.', accuracy: 'accurate' },
        { text: 'Stopovers on one-way Advantage awards cost USD $100.', accuracy: 'accurate' },
      ],
      sources: [
        { domain: 'elitepointsandmiles.com', url: 'https://elitepointsandmiles.com/krisflyer-miles-sweet-spots', isETH: true, isCompetitor: false },
        { domain: 'mainlymiles.com', url: 'https://mainlymiles.com/krisflyer-stopovers', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'How long can a KrisFlyer stopover be?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_007', keyword: 'best time to book flights with points', siteId: 'epm', volume: 2600,
    hasAIOverview: true, ethCited: 'No', aiOverviewType: 'Paragraph', ctrImpact: 38, position: 12, actualCtr: 1.6,
    trend: 'Removed',
    optimizationTips: [
      'The AI Overview was removed for this query — CTR opportunity is back on classic results.',
      'Refresh the award-availability calendar section to capitalise on restored CTR.',
    ],
    alternativeKeywords: [
      { keyword: 'when do airlines release award seats', volume: 1400, kd: 37, hasAIOverview: true },
    ],
  }),
  mkAIOverview({
    id: 'aio_008', keyword: 'credit card travel insurance comparison', siteId: 'epm', volume: 1750,
    hasAIOverview: false, ethCited: 'N/A', ctrImpact: 0, position: 8, actualCtr: 3.1,
    trend: 'Stable',
    optimizationTips: [
      'YMYL-adjacent query — AI Overviews appear intermittently; keep the comparison table updated.',
    ],
    alternativeKeywords: [
      { keyword: 'best credit card for travel insurance australia', volume: 980, kd: 35, hasAIOverview: false },
    ],
  }),
  mkAIOverview({
    id: 'aio_009', keyword: 'qantas status credits explained', siteId: 'epm', volume: 1350,
    hasAIOverview: true, ethCited: 'Yes', aiOverviewType: 'List', ctrImpact: 19, position: 4, actualCtr: 6.6,
    trend: 'New',
    optimizationTips: [
      'Add a status-credit earn table per fare class — the AI list currently cites a competitor table.',
      'Include the 2026 loyalty bonus changes in the first paragraph.',
    ],
    alternativeKeywords: [
      { keyword: 'how to earn qantas status credits fast', volume: 720, kd: 28, hasAIOverview: true },
    ],
    aiAnswer: {
      claims: [
        { text: 'Status Credits determine Qantas Frequent Flyer tier progression, not points.', accuracy: 'accurate' },
        { text: 'Discount economy fares earn as few as 10 Status Credits per segment.', accuracy: 'accurate' },
        { text: 'Status Credits can be earned on credit card spend above $50,000 per year.', accuracy: 'partial' },
      ],
      sources: [
        { domain: 'elitepointsandmiles.com', url: 'https://elitepointsandmiles.com/qantas-frequent-flyer-guide', isETH: true, isCompetitor: false },
        { domain: 'qantas.com', url: 'https://www.qantas.com/frequentflyer/status', isETH: false, isCompetitor: false },
      ],
      followUpQuestions: [
        { question: 'How many status credits for Qantas Gold?', tracked: true },
        { question: 'Do status credits expire?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_010', keyword: 'round the world award booking', siteId: 'epm', volume: 950,
    hasAIOverview: true, ethCited: 'No', aiOverviewType: 'Steps', ctrImpact: 44, position: 14, actualCtr: 0.9,
    trend: 'Stable',
    optimizationTips: [
      'Restructure the RTW guide as numbered booking steps to match the Steps-type overview.',
      'Add ANA and KrisFlyer RTW pricing tables — both are quoted in the AI answer.',
    ],
    alternativeKeywords: [
      { keyword: 'ana round the world award chart', volume: 880, kd: 31, hasAIOverview: true },
      { keyword: 'krisflyer round the world award', volume: 480, kd: 26, hasAIOverview: false },
    ],
    aiAnswer: {
      claims: [
        { text: 'ANA offers one of the cheapest round-the-world awards from 125,000 miles in business class.', accuracy: 'accurate' },
        { text: 'Qantas round-the-world Classic Rewards cost 318,000 points in business class.', accuracy: 'accurate' },
        { text: 'RTW awards must always be booked more than 6 months in advance.', accuracy: 'inaccurate' },
      ],
      sources: [
        { domain: 'onemileatatime.com', url: 'https://onemileatatime.com/guides/ana-rtw', isETH: false, isCompetitor: true },
        { domain: 'pointhacks.com.au', url: 'https://www.pointhacks.com.au/qantas-rtw-award', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'Which program has the cheapest RTW award?', tracked: true },
        { question: 'Can you mix cabins on a RTW award?', tracked: false },
      ],
    },
  }),
  // eth site overviews
  mkAIOverview({
    id: 'aio_201', keyword: 'travel hacking for beginners', siteId: 'eth', volume: 1600,
    hasAIOverview: true, ethCited: 'Yes', aiOverviewType: 'Steps', ctrImpact: 26, position: 8, actualCtr: 5.2,
    trend: 'Stable',
    optimizationTips: [
      'Keep the 5-step quickstart list at the top of the guide — it is the cited extract.',
    ],
    alternativeKeywords: [
      { keyword: 'how to start travel hacking australia', volume: 640, kd: 24, hasAIOverview: false },
    ],
    aiAnswer: {
      claims: [
        { text: 'Travel hacking starts with choosing one airline program and one flexible points currency.', accuracy: 'accurate' },
        { text: 'Beginners should target one signup bonus at a time to protect credit score.', accuracy: 'accurate' },
      ],
      sources: [
        { domain: 'elitetravelhackers.com', url: 'https://elitetravelhackers.com/beginner-guide-travel-hacking', isETH: true, isCompetitor: false },
        { domain: 'thepointsguy.com', url: 'https://thepointsguy.com/guide/beginners', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'Does travel hacking hurt your credit score?', tracked: true },
        { question: 'What is the easiest travel hack for beginners?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_202', keyword: 'status run guide qantas', siteId: 'eth', volume: 480,
    hasAIOverview: true, ethCited: 'Yes', aiOverviewType: 'Paragraph', ctrImpact: 12, position: 3, actualCtr: 9.4,
    trend: 'New',
    optimizationTips: [
      'Add current double-status-credit promo dates — the answer references promo timing.',
    ],
    alternativeKeywords: [
      { keyword: 'qantas double status credits 2026', volume: 880, kd: 30, hasAIOverview: true },
    ],
    aiAnswer: {
      claims: [
        { text: 'A status run is a cheap routing flown purely to earn Status Credits.', accuracy: 'accurate' },
        { text: 'The best status runs cost under $4 per Status Credit.', accuracy: 'partial' },
      ],
      sources: [
        { domain: 'elitetravelhackers.com', url: 'https://elitetravelhackers.com/status-run-guide-qantas', isETH: true, isCompetitor: false },
      ],
      followUpQuestions: [
        { question: 'What is the cheapest Qantas status run?', tracked: true },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_203', keyword: 'manufactured spending guide', siteId: 'eth', volume: 1000,
    hasAIOverview: false, ethCited: 'N/A', ctrImpact: 0, position: 17, actualCtr: 1.1,
    trend: 'Stable',
    optimizationTips: [
      'Sensitive-topic query rarely gets AI Overviews; focus on classic ranking recovery instead.',
    ],
    alternativeKeywords: [],
  }),
  mkAIOverview({
    id: 'aio_204', keyword: 'best ways to earn qantas points', siteId: 'eth', volume: 2100,
    hasAIOverview: true, ethCited: 'Partial', aiOverviewType: 'List', ctrImpact: 31, position: 5, actualCtr: 4.7,
    trend: 'Stable',
    optimizationTips: [
      'Consolidate the earn-methods list into a single table — the AI stitches from three sources.',
    ],
    alternativeKeywords: [
      { keyword: 'qantas points without flying', volume: 1300, kd: 39, hasAIOverview: true },
    ],
    aiAnswer: {
      claims: [
        { text: 'Credit card signup bonuses are the fastest way to earn a large Qantas Points balance.', accuracy: 'accurate' },
        { text: 'Everyday earn via Qantas Shopping averages 1–5 points per dollar.', accuracy: 'accurate' },
        { text: 'Woolworths Rewards convert to Qantas Points at 2:1 automatically.', accuracy: 'accurate' },
      ],
      sources: [
        { domain: 'elitetravelhackers.com', url: 'https://elitetravelhackers.com/qantas-frequent-flyer-guide', isETH: true, isCompetitor: false },
        { domain: 'pointhacks.com.au', url: 'https://www.pointhacks.com.au/earn-qantas-points', isETH: false, isCompetitor: true },
      ],
      followUpQuestions: [
        { question: 'How to earn Qantas Points without a credit card?', tracked: false },
      ],
    },
  }),
  mkAIOverview({
    id: 'aio_205', keyword: 'hotel elite status match', siteId: 'eth', volume: 1900,
    hasAIOverview: true, ethCited: 'No', aiOverviewType: 'List', ctrImpact: 36, position: 25, actualCtr: 0.6,
    trend: 'Stable',
    optimizationTips: [
      'Refresh the status-match table quarterly — outdated matches are excluded from AI citations.',
    ],
    alternativeKeywords: [
      { keyword: 'hilton status match 2026', volume: 720, kd: 27, hasAIOverview: false },
    ],
  }),
  mkAIOverview({
    id: 'aio_206', keyword: 'credit card churning australia', siteId: 'eth', volume: 1400,
    hasAIOverview: false, ethCited: 'N/A', ctrImpact: 0, position: null, actualCtr: 0,
    trend: 'Stable',
    optimizationTips: [
      'No AI Overview and no ranking — prioritise getting the churning guide indexed first.',
    ],
    alternativeKeywords: [],
  }),
];

// ── Seed: Audit Runs (+ pages/issues subcollections) ───────────────────────

interface AuditRunSeed {
  runId: string;
  siteId: string;
  state: AuditRunDoc['state'];
  triggerType: AuditRunDoc['triggerType'];
  triggeredBy: string;
  articleCount: number;
  completedCount: number;
  failedCount: number;
  avgScore?: number;
  scoreChange?: number;
  criticalCount: number;
  newIssues: number;
  resolvedIssues: number;
  daysAgoStarted: number;
  durationMinutes?: number;
  error?: string;
  retryCount: number;
  apiCallsUsed: number;
}

function mkRun(s: AuditRunSeed): AuditRunDoc {
  const startedAt = new Date(Date.now() - s.daysAgoStarted * DAY);
  return {
    runId: s.runId,
    siteId: s.siteId,
    state: s.state,
    triggerType: s.triggerType,
    triggeredBy: s.triggeredBy,
    articleCount: s.articleCount,
    completedCount: s.completedCount,
    failedCount: s.failedCount,
    ...(s.avgScore !== undefined ? { avgScore: s.avgScore } : {}),
    ...(s.scoreChange !== undefined ? { scoreChange: s.scoreChange } : {}),
    criticalCount: s.criticalCount,
    newIssues: s.newIssues,
    resolvedIssues: s.resolvedIssues,
    startedAt,
    ...(s.durationMinutes !== undefined
      ? { completedAt: new Date(startedAt.getTime() + s.durationMinutes * 60e3) }
      : {}),
    createdAt: startedAt,
    ...(s.error !== undefined ? { error: s.error } : {}),
    retryCount: s.retryCount,
    apiCallsUsed: s.apiCallsUsed,
    apiCallsLimit: 500,
  };
}

const auditRuns: AuditRunDoc[] = [
  // eth — newest first (mirrors orderBy createdAt desc)
  mkRun({ runId: 'run_eth_006', siteId: 'eth', state: 'running', triggerType: 'Manual', triggeredBy: 'daynis@ditconsulting.com.au', articleCount: 10, completedCount: 4, failedCount: 0, criticalCount: 2, newIssues: 1, resolvedIssues: 0, daysAgoStarted: 0.05, retryCount: 0, apiCallsUsed: 47 }),
  mkRun({ runId: 'run_eth_005', siteId: 'eth', state: 'completed', triggerType: 'Publish', triggeredBy: 'publisher@elitetravelhackers.com', articleCount: 1, completedCount: 1, failedCount: 0, avgScore: 96, scoreChange: 2, criticalCount: 0, newIssues: 0, resolvedIssues: 1, daysAgoStarted: 5, durationMinutes: 3, retryCount: 0, apiCallsUsed: 6 }),
  mkRun({ runId: 'run_eth_004', siteId: 'eth', state: 'completed', triggerType: 'Scheduled', triggeredBy: 'scheduler', articleCount: 10, completedCount: 10, failedCount: 0, avgScore: 81, scoreChange: 3, criticalCount: 4, newIssues: 3, resolvedIssues: 5, daysAgoStarted: 7, durationMinutes: 14, retryCount: 0, apiCallsUsed: 118 }),
  mkRun({ runId: 'run_eth_003', siteId: 'eth', state: 'partially_completed', triggerType: 'Traffic', triggeredBy: 'traffic-monitor', articleCount: 4, completedCount: 3, failedCount: 1, avgScore: 74, scoreChange: -2, criticalCount: 3, newIssues: 2, resolvedIssues: 1, daysAgoStarted: 12, durationMinutes: 8, error: 'seo-audit-page timed out for art_007 after 2 retries', retryCount: 2, apiCallsUsed: 41 }),
  mkRun({ runId: 'run_eth_002', siteId: 'eth', state: 'failed', triggerType: 'Ranking', triggeredBy: 'ranking-monitor', articleCount: 2, completedCount: 0, failedCount: 2, criticalCount: 0, newIssues: 0, resolvedIssues: 0, daysAgoStarted: 16, durationMinutes: 2, error: 'SEO API quota exhausted (500/500 calls used)', retryCount: 1, apiCallsUsed: 500 }),
  mkRun({ runId: 'run_eth_001', siteId: 'eth', state: 'completed', triggerType: 'Scheduled', triggeredBy: 'scheduler', articleCount: 10, completedCount: 10, failedCount: 0, avgScore: 78, scoreChange: 1, criticalCount: 6, newIssues: 4, resolvedIssues: 2, daysAgoStarted: 21, durationMinutes: 16, retryCount: 0, apiCallsUsed: 121 }),
  // epm — newest first
  mkRun({ runId: 'run_epm_005', siteId: 'epm', state: 'completed', triggerType: 'Scheduled', triggeredBy: 'scheduler', articleCount: 8, completedCount: 8, failedCount: 0, avgScore: 83, scoreChange: 2, criticalCount: 2, newIssues: 1, resolvedIssues: 3, daysAgoStarted: 1, durationMinutes: 12, retryCount: 0, apiCallsUsed: 96 }),
  mkRun({ runId: 'run_epm_004', siteId: 'epm', state: 'completed', triggerType: 'Manual', triggeredBy: 'daynis@ditconsulting.com.au', articleCount: 8, completedCount: 8, failedCount: 0, avgScore: 81, scoreChange: 4, criticalCount: 3, newIssues: 2, resolvedIssues: 4, daysAgoStarted: 8, durationMinutes: 13, retryCount: 0, apiCallsUsed: 98 }),
  mkRun({ runId: 'run_epm_003', siteId: 'epm', state: 'partially_completed', triggerType: 'Scheduled', triggeredBy: 'scheduler', articleCount: 8, completedCount: 7, failedCount: 1, avgScore: 77, scoreChange: -1, criticalCount: 4, newIssues: 3, resolvedIssues: 1, daysAgoStarted: 15, durationMinutes: 11, error: 'seo-audit-page returned 502 for art_108', retryCount: 1, apiCallsUsed: 88 }),
  mkRun({ runId: 'run_epm_002', siteId: 'epm', state: 'completed', triggerType: 'Publish', triggeredBy: 'publisher@elitepointsandmiles.com', articleCount: 1, completedCount: 1, failedCount: 0, avgScore: 86, scoreChange: 5, criticalCount: 0, newIssues: 0, resolvedIssues: 2, daysAgoStarted: 20, durationMinutes: 4, retryCount: 0, apiCallsUsed: 7 }),
  mkRun({ runId: 'run_epm_001', siteId: 'epm', state: 'completed', triggerType: 'Scheduled', triggeredBy: 'scheduler', articleCount: 8, completedCount: 8, failedCount: 0, avgScore: 75, scoreChange: 0, criticalCount: 5, newIssues: 5, resolvedIssues: 0, daysAgoStarted: 29, durationMinutes: 15, retryCount: 0, apiCallsUsed: 101 }),
];

function mkRunPages(siteId: string, count: number): AuditRunPageDoc[] {
  const audits = pageAudits.filter((a) => a.siteId === siteId);
  return audits.slice(0, count).map((a, i) => {
    const prev = Math.max(35, Math.min(99, a.seoScore - ((i % 3) - 1) * 3));
    return {
      articleId: a.articleId,
      title: a.title,
      url: a.url,
      seoScore: a.seoScore,
      previousScore: prev,
      scoreChange: a.seoScore - prev,
      components: a.components,
      criticalCount: a.criticalCount,
      warningCount: a.warningCount,
    };
  });
}

function mkRunIssues(siteId: string, runRef: string): AuditRunIssueDoc[] {
  const audits = pageAudits.filter((a) => a.siteId === siteId);
  const seeds: { severity: AuditRunIssueDoc['severity']; component: AuditComponentKey; description: string; isNew: boolean; isResolved: boolean }[] = [
    { severity: 'Critical', component: 'metaDescription', description: 'Meta description is missing; Google is auto-generating the snippet.', isNew: true, isResolved: false },
    { severity: 'Critical', component: 'schemaMarkup', description: 'Review schema is missing the required "author" property.', isNew: false, isResolved: false },
    { severity: 'Warning', component: 'contentFreshness', description: 'Last meaningful update was 7 months ago.', isNew: true, isResolved: false },
    { severity: 'Warning', component: 'imageAltText', description: '3 of 8 images are missing alt attributes.', isNew: false, isResolved: true },
    { severity: 'Info', component: 'internalLinks', description: 'Only 3 internal links — add links to related guides.', isNew: false, isResolved: true },
  ];
  return seeds.map((s, i) => ({
    id: `${runRef}_issue_${i + 1}`,
    articleId: audits[i % audits.length]?.articleId ?? 'unknown',
    severity: s.severity,
    component: s.component,
    description: s.description,
    isNew: s.isNew,
    isResolved: s.isResolved,
  }));
}

const auditRunPages: Record<string, AuditRunPageDoc[]> = {
  run_eth_004: mkRunPages('eth', 10),
  run_eth_003: mkRunPages('eth', 3),
  run_eth_001: mkRunPages('eth', 10),
  run_epm_005: mkRunPages('epm', 8),
  run_epm_004: mkRunPages('epm', 8),
  run_epm_001: mkRunPages('epm', 8),
};

const auditRunIssues: Record<string, AuditRunIssueDoc[]> = {
  run_eth_004: mkRunIssues('eth', 'run_eth_004'),
  run_eth_003: mkRunIssues('eth', 'run_eth_003'),
  run_eth_001: mkRunIssues('eth', 'run_eth_001'),
  run_epm_005: mkRunIssues('epm', 'run_epm_005'),
  run_epm_004: mkRunIssues('epm', 'run_epm_004'),
  run_epm_001: mkRunIssues('epm', 'run_epm_001'),
};

// ── Seed: Audit Config ──────────────────────────────────────────────────────

const auditConfig: Record<string, AuditConfigDoc> = {
  eth: {
    enabled: true,
    frequency: 'weekly',
    dayOfWeek: 1,
    timeOfDay: '02:00',
    triggers: { onPublish: true, onRefresh: false, onRankingChange: true, onTrafficDrop: true },
    notifications: { slack: true, onlyOnIssues: true },
    apiCallsLimit: 500,
    updatedAt: daysAgo(6),
    updatedBy: 'daynis@ditconsulting.com.au',
  },
  epm: {
    enabled: true,
    frequency: 'weekly',
    dayOfWeek: 2,
    timeOfDay: '03:30',
    triggers: { onPublish: true, onRefresh: true, onRankingChange: true, onTrafficDrop: false },
    notifications: { slack: true, onlyOnIssues: false },
    apiCallsLimit: 500,
    updatedAt: daysAgo(11),
    updatedBy: 'daynis@ditconsulting.com.au',
  },
};

// ── Getters (apply production query ordering) ───────────────────────────────

const getSiteHealth = (siteId: string): SiteHealthDoc | null => siteHealth[siteId] ?? null;
const getIssues = (siteId: string): TechnicalIssueDoc[] => [...(issues[siteId] ?? [])];
const getSchemas = (siteId: string): SchemaDoc[] => [...(schemas[siteId] ?? [])];
const getIndexing = (siteId: string): IndexingDoc[] => [...(indexing[siteId] ?? [])];
const getBacklinks = (siteId: string): BacklinkDoc[] =>
  [...(backlinks[siteId] ?? [])].sort((a, b) => b.date.getTime() - a.date.getTime());
const getRedirects = (siteId: string): RedirectDoc[] => [...(redirects[siteId] ?? [])];
const getPositionTracking = (siteId: string): PositionTrackingDoc[] =>
  positionTracking.filter((k) => k.siteId === siteId).sort((a, b) => b.volume - a.volume);
const getPageAudits = (siteId: string): PageAuditDoc[] =>
  pageAudits.filter((a) => a.siteId === siteId).sort((a, b) => a.seoScore - b.seoScore);
const getAuditRuns = (siteId: string): AuditRunDoc[] =>
  auditRuns.filter((r) => r.siteId === siteId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
const getAuditConfig = (siteId: string): AuditConfigDoc | null => auditConfig[siteId] ?? null;
const getAIOverviews = (siteId: string): AIOverviewDoc[] =>
  aiOverviews.filter((o) => o.siteId === siteId).sort((a, b) => b.volume - a.volume);

// ── Emitters ────────────────────────────────────────────────────────────────

export const emitters = {
  siteHealth: makeEmitter(getSiteHealth),
  issues: makeEmitter(getIssues),
  schemas: makeEmitter(getSchemas),
  indexing: makeEmitter(getIndexing),
  backlinks: makeEmitter(getBacklinks),
  redirects: makeEmitter(getRedirects),
  positionTracking: makeEmitter(getPositionTracking),
  pageAudits: makeEmitter(getPageAudits),
  auditRuns: makeEmitter(getAuditRuns),
  auditConfig: makeEmitter(getAuditConfig),
  aiOverviews: makeEmitter(getAIOverviews),
};

// ── Store mutations (used by the mock callables) ────────────────────────────

export const store = {
  getSiteHealth,
  getIssues,
  getSchemas,
  getIndexing,
  getBacklinks,
  getRedirects,
  getPositionTracking,
  getPageAudits,
  getAuditRuns,
  getAuditConfig,
  getAIOverviews,
  getKeywordById: (keywordId: string): PositionTrackingDoc | null =>
    positionTracking.find((k) => k.id === keywordId) ?? null,
  getAuditRunPages: (runId: string): AuditRunPageDoc[] => [...(auditRunPages[runId] ?? [])],
  getAuditRunIssues: (runId: string): AuditRunIssueDoc[] => [...(auditRunIssues[runId] ?? [])],

  touchSiteHealth(siteId: string): void {
    const doc = siteHealth[siteId];
    if (!doc) return;
    doc.updatedAt = new Date();
    doc.dataFreshness = { gsc: new Date(), seoApi: new Date(), lastFullAudit: doc.dataFreshness.lastFullAudit };
    emitters.siteHealth.notify(siteId);
  },

  jitterPositions(siteId: string): number {
    let updated = 0;
    for (const kw of positionTracking) {
      if (kw.siteId !== siteId) continue;
      if (kw.position !== null) {
        const delta = Math.floor(Math.random() * 5) - 2; // -2..+2
        const next = Math.max(1, Math.min(100, kw.position - delta)); // lower position number = better
        kw.positionChange = kw.position - next === 0 ? 0 : kw.position - next;
        kw.position = next;
        kw.changeType = kw.positionChange > 0 ? 'improved' : kw.positionChange < 0 ? 'declined' : 'stable';
        if (kw.bestPosition === null || next < kw.bestPosition) {
          kw.bestPosition = next;
          kw.bestPositionDate = new Date().toISOString().slice(0, 10);
        }
        kw.positionHistory.push({ date: new Date().toISOString().slice(0, 10), position: next });
      }
      kw.updatedAt = new Date();
      updated += 1;
    }
    emitters.positionTracking.notify(siteId);
    return updated;
  },

  applyPageAudit(siteId: string, articleId: string): PageAuditDoc {
    const existing = pageAudits.find((a) => a.siteId === siteId && a.articleId === articleId);
    if (existing) {
      existing.seoScore = Math.min(100, existing.seoScore + 1);
      existing.lastAuditedAt = new Date();
      existing.auditedBy = 'Manual';
      emitters.pageAudits.notify(siteId);
      return existing;
    }
    const created: PageAuditDoc = {
      articleId,
      title: 'Untitled Article',
      url: `https://${siteId === 'epm' ? 'elitepointsandmiles.com' : 'elitetravelhackers.com'}/${articleId}`,
      publishedDate: new Date(),
      seoScore: 72,
      components: mkComponents(72),
      criticalCount: 0,
      warningCount: 1,
      traffic: 0,
      keyword: '',
      position: null,
      lastAuditedAt: new Date(),
      auditedBy: 'Manual',
      siteId,
    };
    pageAudits.push(created);
    emitters.pageAudits.notify(siteId);
    return created;
  },

  insertAuditRun(siteId: string, triggerType: AuditRunDoc['triggerType'], triggeredBy: string): AuditRunDoc {
    const siteAudits = pageAudits.filter((a) => a.siteId === siteId);
    const avgScore = siteAudits.length
      ? Math.round(siteAudits.reduce((s, a) => s + a.seoScore, 0) / siteAudits.length)
      : 0;
    const run: AuditRunDoc = {
      runId: `run_${siteId}_${Date.now().toString(36)}`,
      siteId,
      state: 'completed',
      triggerType,
      triggeredBy,
      articleCount: siteAudits.length,
      completedCount: siteAudits.length,
      failedCount: 0,
      avgScore,
      scoreChange: 1,
      criticalCount: siteAudits.reduce((s, a) => s + a.criticalCount, 0),
      newIssues: 1,
      resolvedIssues: 2,
      startedAt: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      retryCount: 0,
      apiCallsUsed: siteAudits.length * 12,
      apiCallsLimit: 500,
    };
    auditRuns.unshift(run);
    emitters.auditRuns.notify(siteId);
    return run;
  },

  touchAIOverviews(siteId: string): number {
    let count = 0;
    for (const o of aiOverviews) {
      if (o.siteId !== siteId) continue;
      o.updatedAt = new Date();
      count += 1;
    }
    emitters.aiOverviews.notify(siteId);
    return count;
  },

  markSubmittedForIndexing(siteId: string, urls: string[]): number {
    const list = indexing[siteId] ?? [];
    let submitted = 0;
    for (const url of urls) {
      const found = list.find((d) => d.url === url || d.url.endsWith(url));
      if (found) {
        found.status = 'Crawled';
        found.lastCrawled = new Date();
        found.submittedDate = new Date();
        delete found.coverageIssue;
        submitted += 1;
      } else {
        list.push({
          id: `idx_${Date.now().toString(36)}_${submitted}`,
          url,
          title: url.split('/').pop() ?? url,
          status: 'Crawled',
          lastCrawled: new Date(),
          submittedDate: new Date(),
        });
        submitted += 1;
      }
    }
    emitters.indexing.notify(siteId);
    return submitted;
  },

  addRedirect(input: { siteId: string; sourceUrl: string; destinationUrl: string; statusCode: RedirectDoc['statusCode']; reason?: string }): RedirectDoc {
    const redirect: RedirectDoc = {
      id: `red_${Date.now().toString(36)}`,
      sourceUrl: input.sourceUrl,
      destinationUrl: input.destinationUrl,
      statusCode: input.statusCode,
      chainLength: 1,
      createdAt: new Date(),
      createdBy: 'admin@elitetravelhackers.com',
      status: 'Active',
      ...(input.reason ? { notes: input.reason } : {}),
    };
    (redirects[input.siteId] ??= []).push(redirect);
    emitters.redirects.notify(input.siteId);
    return redirect;
  },

  updateRedirect(siteId: string, redirectId: string, patch: { destinationUrl?: string; statusCode?: RedirectDoc['statusCode'] }): boolean {
    const list = redirects[siteId] ?? [];
    const found = list.find((r) => r.id === redirectId);
    if (!found) return false;
    if (patch.destinationUrl !== undefined) found.destinationUrl = patch.destinationUrl;
    if (patch.statusCode !== undefined) found.statusCode = patch.statusCode;
    emitters.redirects.notify(siteId);
    return true;
  },

  deleteRedirect(siteId: string, redirectId: string): boolean {
    const list = redirects[siteId] ?? [];
    const idx = list.findIndex((r) => r.id === redirectId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    emitters.redirects.notify(siteId);
    return true;
  },

  getRedirect(siteId: string, redirectId: string): RedirectDoc | null {
    return (redirects[siteId] ?? []).find((r) => r.id === redirectId) ?? null;
  },

  saveAuditConfig(siteId: string, input: Omit<AuditConfigDoc, 'updatedAt' | 'updatedBy'>): AuditConfigDoc {
    const next: AuditConfigDoc = {
      ...input,
      updatedAt: new Date(),
      updatedBy: 'admin@elitetravelhackers.com',
    };
    auditConfig[siteId] = next;
    emitters.auditConfig.notify(siteId);
    return next;
  },
};
