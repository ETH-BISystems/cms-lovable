// CMS-45 — Pros/Cons Abbreviated as 8 discrete fields.
//
// The Webflow card page renders Pros — Abbreviated and Cons — Abbreviated as
// bullet lists built from 8 discrete CMS fields per side
// (pros-abbreviated-1..8 / cons-abbreviated-1..8). The CMS keeps the
// existing `prosAbbreviated` / `consAbbreviated` arrays as the canonical
// store (the scraper writes them), edits them through 8 fixed positional
// inputs, and persists BOTH the array and the discrete
// `prosAbbreviated1..8` / `consAbbreviated1..8` fields on save so the
// Webflow sync can map each slot 1:1.

export const ABBREVIATED_SLOT_COUNT = 8;

export type AbbreviatedPrefix = 'prosAbbreviated' | 'consAbbreviated';

/** Pad/trim an item array to exactly 8 positional slots for editing. */
export function toAbbreviatedSlots(items: string[] | undefined): string[] {
  return Array.from({ length: ABBREVIATED_SLOT_COUNT }, (_, i) => items?.[i] ?? '');
}

/** Drop trailing empty slots so the stored array stays compact. */
export function trimTrailingEmpty(slots: string[]): string[] {
  let end = slots.length;
  while (end > 0 && !slots[end - 1].trim()) end -= 1;
  return slots.slice(0, end);
}

/**
 * Derive the discrete Firestore fields (`prosAbbreviated1`..`prosAbbreviated8`
 * etc.) from the positional slots — written on every save so the Webflow sync
 * maps slot N to `pros-abbreviated-N`. Empty slots persist as '' to clear a
 * previously filled Webflow field.
 */
export function abbreviatedSlotFields(
  prefix: AbbreviatedPrefix,
  items: string[] | undefined
): Record<string, string> {
  const slots = toAbbreviatedSlots(items);
  const out: Record<string, string> = {};
  for (let i = 0; i < ABBREVIATED_SLOT_COUNT; i++) {
    out[`${prefix}${i + 1}`] = slots[i].trim();
  }
  return out;
}

/**
 * Reconstruct an item array from discrete fields on documents that have
 * `prosAbbreviated1..8` but no array (tolerant read path).
 */
export function fromDiscreteFields(
  doc: Record<string, unknown>,
  prefix: AbbreviatedPrefix
): string[] | undefined {
  const slots: string[] = [];
  let any = false;
  for (let i = 1; i <= ABBREVIATED_SLOT_COUNT; i++) {
    const v = doc[`${prefix}${i}`];
    const s = typeof v === 'string' ? v : '';
    if (s.trim()) any = true;
    slots.push(s);
  }
  return any ? trimTrailingEmpty(slots) : undefined;
}
