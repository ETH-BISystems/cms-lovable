import type { CardDocument } from '../types';

/**
 * CMS-122 — override-aware display values for the Card Data Manager list.
 *
 * Dual-Value Override Pattern: a field stores BOTH `<field>_scraped` (last
 * scraper value) and `<field>_manual` (last manual value), with the
 * `overrides` map marking which is authoritative. When
 * `overrides[field].isOverridden` is true the SAVED (manual) value is the
 * display value; otherwise the scraped value shows. The overview list
 * previously rendered the raw `_scraped` fields, so overridden cards kept
 * showing scraper data the team had already corrected.
 */

export type OverridableField = 'name' | 'annualFee' | 'signupBonus' | 'bonusSpendReq' | 'aprRange';

type OverrideCarrier = Pick<CardDocument, 'overrides'> &
  Partial<Record<`${Exclude<OverridableField, 'name'>}_manual`, string | number | null>> &
  Partial<Record<`${Exclude<OverridableField, 'name'>}_scraped`, string | number | null>> &
  Partial<Pick<CardDocument, 'name' | 'name_manual'>>;

export function isFieldOverridden(card: OverrideCarrier, field: OverridableField): boolean {
  return !!card.overrides?.[field]?.isOverridden;
}

/** The authoritative value for a field: manual when overridden, else scraped. */
export function displayCardValue(card: OverrideCarrier, field: OverridableField): string {
  // name has no name_scraped — the card's `name` field is the original value.
  const manual = field === 'name' ? card.name_manual : card[`${field}_manual`];
  const scraped = field === 'name' ? card.name : card[`${field}_scraped`];
  // Overridden: the manual value wins — but an EMPTY manual (cleared input)
  // falls back to scraped, matching the detail panel's display rule. A
  // numeric 0 is a real value ($0-fee override), not "empty".
  const manualValid = manual !== undefined && manual !== null && manual !== '';
  const value = isFieldOverridden(card, field) && manualValid ? manual : scraped;
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

/** Annual fee cell/export formatting ('$95', '$0', em-dash when empty). */
export function displayAnnualFee(card: OverrideCarrier): string {
  const raw = displayCardValue(card, 'annualFee');
  if (raw === '') return '—';
  const numeric = Number(raw.replace(/[$,\s]/g, ''));
  if (raw === '0' || numeric === 0) return '$0';
  return raw.startsWith('$') ? raw : `$${raw}`;
}
