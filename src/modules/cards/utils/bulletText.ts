// CMS-55/56/57 — Editorial Content sections that used to be free-form rich
// text (Earning Rewards, Additional Benefits, More Details) are now edited as
// bullet lists, reusing the CMS-20 bullet-editor pattern (benefitsBullets).
//
// Migration is lossless and lazy: legacy documents keep their string value
// until the next save. `toBulletItems` renders a legacy string as initial
// bullet items (split on lines/paragraphs with bullet markers stripped);
// once the user saves, the field persists as a string[] — which the Webflow
// sync serializes as a "- item" bullet list, and which a manual scrape may
// overwrite with fresh paragraph text (that again displays as bullets).

/**
 * Normalize a bullet-section value into editable bullet items.
 * - Arrays pass through unchanged (including in-progress empty rows).
 * - Strings split on newlines; leading bullet/number markers are stripped.
 */
export function toBulletItems(value: string | string[] | undefined | null): string[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return value
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-–—•*·]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

/** Serialize bullet items to display text — one "- item" per line. */
export function bulletItemsToText(items: string[]): string {
  return items
    .map((i) => i.trim())
    .filter(Boolean)
    .map((i) => `- ${i}`)
    .join('\n');
}
