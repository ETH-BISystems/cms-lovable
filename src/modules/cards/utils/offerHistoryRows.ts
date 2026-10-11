import type { ScrapedOfferHistoryEntry } from '../types';

/**
 * CMS-162: helpers for the Offer History editor (CardOverviewTab). The table
 * is scraper-maintained (card_data.offerHistory) and editable via the
 * setOverride callable — saving locks the field against the scraper, revert
 * restores the last scraped rows server-side.
 */

/** Editor-local row shape — `value` is always a string for input binding. */
export interface OfferHistoryEditRow {
  dates: string;
  offer: string;
  value: string;
}

export const OFFER_HISTORY_MAX_ROWS = 50;

export function emptyOfferHistoryRow(): OfferHistoryEditRow {
  return { dates: '', offer: '', value: '' };
}

export function toEditRows(rows: ScrapedOfferHistoryEntry[] | undefined): OfferHistoryEditRow[] {
  return (rows ?? []).map((r) => ({
    dates: r.dates ?? '',
    offer: r.offer ?? '',
    value: r.value ?? '',
  }));
}

export function offerHistoryRowsEqual(a: OfferHistoryEditRow[], b: OfferHistoryEditRow[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.dates === b[i].dates && r.offer === b[i].offer && r.value === b[i].value);
}

/**
 * Error message when the rows can't be saved, else null. Mirrors the
 * server-side sanitizeOfferHistoryRows rules (setOverride) — every row needs
 * both dates and offer text; an empty table is allowed (deliberate blank).
 */
export function validateOfferHistoryRows(rows: OfferHistoryEditRow[]): string | null {
  if (rows.length > OFFER_HISTORY_MAX_ROWS) return `At most ${OFFER_HISTORY_MAX_ROWS} rows.`;
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].dates.trim()) return `Row ${i + 1} needs offer dates.`;
    if (!rows[i].offer.trim()) return `Row ${i + 1} needs offer details.`;
  }
  return null;
}

/** Trimmed persistence shape — empty value keys are dropped. */
export function toSaveRows(rows: OfferHistoryEditRow[]): ScrapedOfferHistoryEntry[] {
  return rows.map((r) => ({
    dates: r.dates.trim(),
    offer: r.offer.trim(),
    ...(r.value.trim() ? { value: r.value.trim() } : {}),
  }));
}
