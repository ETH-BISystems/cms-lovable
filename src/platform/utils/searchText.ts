/**
 * Search-text normalization shared by every name/issuer filter in the CMS.
 */

/**
 * Normalizes a string for substring search: lowercase, trademark/servicemark
 * symbols stripped, whitespace collapsed. Card names carry ®/™/℠ mid-phrase
 * ("American Express Blue Business® Plus Credit Card", "Citi Strata℠ Card"),
 * so a plain `includes()` on the raw name misses the obvious query
 * ("blue business plus") — every card search box must normalize BOTH the
 * query and the candidate with this (2026-09-10, Rasa's "Blue Business Plus"
 * report).
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[®™©℠℗]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Case/trademark-insensitive substring test for search filters. */
export function searchIncludes(candidate: string | null | undefined, query: string): boolean {
  if (!candidate) return false;
  return normalizeSearchText(candidate).includes(normalizeSearchText(query));
}
