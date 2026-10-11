// CMS-58 — word-limit helpers for short editorial labels.
// "Best For Label" maps to the Webflow `best-for-label` field, which the
// site renders as a compact badge — capped at 5 words.

export const BEST_FOR_LABEL_WORD_LIMIT = 5;

/** Count whitespace-separated words. Blank/whitespace-only input counts 0. */
export function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Enforce a word limit: input at or under the limit passes through unchanged
 * (whitespace preserved); anything longer is truncated to the first `limit`
 * words (so a long paste keeps its first 5 words instead of being rejected).
 */
export function limitWords(value: string, limit: number): string {
  if (countWords(value) <= limit) return value;
  const re = new RegExp(`^\\s*(?:\\S+\\s+){${limit - 1}}\\S+`);
  const match = value.match(re);
  return match ? match[0] : value;
}
