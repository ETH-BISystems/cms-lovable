/**
 * Source Material (reference URLs) helpers — shared by NewArticleModal
 * (Section 5 at creation) and ArticleDetailPanel's Source Material section
 * (CMS-147 — add/edit after creation). One place so the two surfaces can't
 * drift on types or host-detection.
 */

import type { SourceUrl } from '../types';

export const SOURCE_URL_TYPES = [
  'Competitor Article',
  'Issuer Page',
  'Data Source',
  'Reference Material',
  'Internal ETH Article',
] as const;

export type SourceUrlType = (typeof SOURCE_URL_TYPES)[number];

/** Cap on stored source URLs per article (matches the modal's Add-URL limit). */
export const MAX_SOURCE_URLS = 8;

const COMPETITOR_HOSTS = [
  'thepointsguy.com',
  'onemileatatime.com',
  'doctorofcredit.com',
  'dailydrop.com',
  'upgradedpoints.com',
  'nerdwallet.com',
];

const ISSUER_HOSTS = [
  'chase.com',
  'americanexpress.com',
  'capitalone.com',
  'citi.com',
  'bankofamerica.com',
];

/** Guess the source type from the URL host (competitor blogs, issuer banks). */
export function detectUrlType(url: string): SourceUrlType {
  const lower = url.toLowerCase();
  if (COMPETITOR_HOSTS.some((d) => lower.includes(d))) return 'Competitor Article';
  if (ISSUER_HOSTS.some((d) => lower.includes(d))) return 'Issuer Page';
  return 'Reference Material';
}

/** Coerce a stored value into a valid SourceUrlType (older docs may drift). */
export function asSourceUrlType(value: string | undefined): SourceUrlType {
  return (SOURCE_URL_TYPES as readonly string[]).includes(value ?? '')
    ? (value as SourceUrlType)
    : 'Reference Material';
}

/**
 * Render-ready display title for a source URL: the last path segment,
 * title-cased; falls back to the hostname, then 'Untitled'.
 */
export function sourceUrlTitle(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return (
      urlObj.pathname
        .split('/')
        .filter(Boolean)
        .pop()
        ?.replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()) || urlObj.hostname
    );
  } catch {
    return 'Untitled';
  }
}

/** Host label for a source URL ('www.' stripped); raw input when unparseable. */
export function sourceUrlDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Normalize a draft list for persistence: trimmed, non-empty, typed, capped. */
export function normalizeSourceUrls(list: Array<Pick<SourceUrl, 'url'> & { type?: string }>): SourceUrl[] {
  return list
    .filter((s) => s.url.trim())
    .slice(0, MAX_SOURCE_URLS)
    .map((s) => ({ url: s.url.trim(), type: asSourceUrlType(s.type) }));
}
