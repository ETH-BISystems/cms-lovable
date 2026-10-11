/**
 * MOCK keyword history service — in-memory replacement for the production
 * Firestore subscriptions over saved analysis snapshots.
 *
 * production:
 *   subscribeToKeywordHistory → onSnapshot(query(collection(db,'keyword_overview_history'), orderBy('fetchedAt','desc'), limit(24)))
 *   subscribeToTrackedKeywords → onSnapshot(query(collection(db,'tracked_keywords'), orderBy('volume','desc'), limit(200)))
 *   subscribeToDomainHistory  → onSnapshot(query(collection(db,'domain_overview_history'), orderBy('fetchedAt','desc'), limit(12)))
 */

import type { KeywordOverviewResult } from '../types/analytics';
import { buildDomainOverview, buildKeywordOverview } from './_analyticsFixtures';
import { KW, COMPETITOR_DOMAINS, hashString, rng, int } from './_seed';

export interface KeywordHistoryEntry {
  id: string;
  keyword: string;
  volume: number;
  kd: number;
  intent: string | null;
  fetchedAt: Date | null;
  result: KeywordOverviewResult;
}

let keywordHistory: KeywordHistoryEntry[] | null = null;

function keywordHistoryStore(): KeywordHistoryEntry[] {
  if (!keywordHistory) {
    const seeds = [
      'amex platinum', 'chase sapphire preferred', 'transfer partners', 'priority pass',
      'venture x review', 'hyatt globalist', '5/24 rule', 'award flights to europe',
    ];
    keywordHistory = seeds.map((keyword, i) => {
      const result = buildKeywordOverview(keyword);
      return {
        id: `koh_${i + 1}`,
        keyword,
        volume: result.volume,
        kd: result.kd,
        intent: result.intent,
        fetchedAt: new Date(Date.now() - (i * 2 + 1) * 864e5),
        result,
      };
    });
  }
  return keywordHistory;
}

/**
 * Saved keyword-overview analyses. Every analysis is persisted server-side;
 * re-opening one from history costs nothing and enables side-by-side compare.
 */
export function subscribeToKeywordHistory(
  onData: (entries: KeywordHistoryEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  void onError;
  const timer = setTimeout(() => onData(keywordHistoryStore()), 300);
  return () => clearTimeout(timer);
}

export interface TrackedKeyword {
  id: string;
  keyword: string;
  volume: number;
  kd: number;
  intent: string | null;
  position: number;
  url: string;
  /** week id -> position, chronologically sortable keys. */
  history: Record<string, number>;
}

let trackedKeywords: TrackedKeyword[] | null = null;

function trackedStore(): TrackedKeyword[] {
  if (!trackedKeywords) {
    const pool = [...KW.cards, ...KW.travel, ...KW.strategy].slice(0, 14);
    trackedKeywords = pool.map((keyword, i) => {
      const rand = rng(hashString(keyword + '|tracked'));
      const history: Record<string, number> = {};
      let pos = int(rand, 4, 40);
      // Build 8 trailing ISO-week keys, oldest first.
      const now = new Date();
      for (let w = 7; w >= 0; w--) {
        const d = new Date(now.getTime() - w * 7 * 864e5);
        const week = `${d.getFullYear()}-W${String(Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 864e5 + 1) / 7)).padStart(2, '0')}`;
        pos = Math.max(1, Math.min(60, pos + int(rand, -3, 3)));
        history[week] = pos;
      }
      return {
        id: `tk_${i + 1}`,
        keyword,
        volume: int(rand, 300, 26000),
        kd: int(rand, 8, 78),
        intent: int(rand, 0, 2) === 0 ? 'informational' : int(rand, 0, 1) === 0 ? 'commercial' : 'transactional',
        position: pos,
        url: `https://www.elitetravelhackers.com/${keyword.replace(/\s+/g, '-')}`,
        history,
      };
    }).sort((a, b) => b.volume - a.volume);
  }
  return trackedKeywords;
}

/** Weekly position history accumulated by the SEO Intelligence snapshots. */
export function subscribeToTrackedKeywords(
  onData: (rows: TrackedKeyword[]) => void,
  onError: (error: Error) => void,
): () => void {
  void onError;
  const timer = setTimeout(() => onData(trackedStore()), 300);
  return () => clearTimeout(timer);
}

export interface DomainHistoryEntry {
  id: string;
  domain: string;
  organicTraffic: number;
  organicKeywords: number;
  fetchedAt: Date | null;
  result: import('../types/analytics').DomainOverviewResult;
}

let domainHistory: DomainHistoryEntry[] | null = null;

function domainHistoryStore(): DomainHistoryEntry[] {
  if (!domainHistory) {
    const domains = ['elitetravelhackers.com', ...COMPETITOR_DOMAINS.slice(0, 3)];
    domainHistory = domains.map((domain, i) => {
      const result = buildDomainOverview(domain);
      return {
        id: `doh_${i + 1}`,
        domain,
        organicTraffic: result.metrics.organicTraffic,
        organicKeywords: result.metrics.organicKeywords,
        fetchedAt: new Date(Date.now() - (i * 3 + 1) * 864e5),
        result,
      };
    });
  }
  return domainHistory;
}

/** Saved domain-overview analyses — instant re-open without API cost. */
export function subscribeToDomainHistory(
  onData: (entries: DomainHistoryEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  void onError;
  const timer = setTimeout(() => onData(domainHistoryStore()), 300);
  return () => clearTimeout(timer);
}
