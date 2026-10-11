import type { ExperienceItem } from '../types';

/**
 * Loose handle equality for items that predate the sourceHandle stamp: the
 * platform metadata often stores the display name ("Justin Froeber") where
 * the user typed the handle ("@justinfroeber"). Must stay in sync with
 * normalizeHandle in functions/src/experience/removeSocialHandle.ts.
 */
export function normalizeHandle(value: string): string {
  return value.toLowerCase().replace(/^@/, '').replace(/\s+/g, '');
}

/** The settings/socialAccounts doc stores X/Twitter as 'twitter'; imported
 * items carry the pipeline name 'x-twitter'. */
export function settingsPlatformToItemSource(platform: string): string {
  return platform === 'twitter' ? 'x-twitter' : platform;
}

/**
 * Render a Firestore timestamp that may arrive as a Timestamp instance, a
 * plain {seconds}/{_seconds} object (post-serialization), a string, or a
 * number — settings subscriptions have produced all of these. Returns null
 * when the value can't be read, so callers can omit it instead of showing
 * "Invalid Date".
 */
export function timestampToDate(value: unknown): Date | null {
  if (!value) return null;
  const v = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof v.toDate === 'function') return v.toDate();
  const seconds = typeof v.seconds === 'number' ? v.seconds : typeof v._seconds === 'number' ? v._seconds : null;
  if (seconds !== null) return new Date(seconds * 1000);
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Does this experience item belong to the given connected account? Exact
 * sourceHandle match for handle imports; normalized accountHandle/contributor
 * fallback for older or per-URL imports on the same platform.
 */
export function itemMatchesAccount(
  item: ExperienceItem,
  account: { platform: string; accountName: string | null }
): boolean {
  if (!account.accountName) return false;
  if (item.source !== settingsPlatformToItemSource(account.platform)) return false;
  if (item.sourceHandle === account.accountName) return true;
  const normalized = normalizeHandle(account.accountName);
  if (item.accountHandle && normalizeHandle(item.accountHandle) === normalized) return true;
  if (item.contributor.name && normalizeHandle(item.contributor.name) === normalized) return true;
  return false;
}
