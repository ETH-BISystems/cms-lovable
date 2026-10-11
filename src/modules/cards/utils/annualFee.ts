/**
 * Annual fee input validation (CMS-18).
 *
 * Webflow's `annual-fee` field is a NUMBER field, so the manual override for
 * the annual fee must resolve to a number. This mirrors the server-side
 * normalizer (functions/src/cards/internal/normalizers.ts → normalizeAnnualFee)
 * so anything the client accepts is guaranteed to normalize on sync.
 *
 * Other override fields (signupBonus, aprRange, bonusSpendReq) are
 * legitimately free-text and must NOT use this validator.
 */

/**
 * Parse an annual fee string to a plain number.
 * "$95" → 95, "$95 per year" → 95, "1,295" → 1295, "No annual fee" → 0.
 * Returns null when no numeric fee can be extracted.
 */
export function parseAnnualFee(value: string): number | null {
  const str = value.trim().toLowerCase();

  // "no annual fee", "none", "waived", empty → $0
  if (str === '' || str === 'n/a' || str === 'none' || str === 'no annual fee' || str === 'waived') {
    return 0;
  }

  // Extract the first number from the string (handles "$95", "$95/year", "1,295")
  const match = str.match(/[\d,]+\.?\d*/);
  if (match) {
    const n = parseFloat(match[0].replace(/,/g, ''));
    if (!isNaN(n)) return n;
  }

  return null;
}

/**
 * Validate an annual fee override input.
 * Returns an error message when the value cannot be normalized to a number,
 * or null when the value is acceptable.
 */
export function validateAnnualFee(value: string): string | null {
  if (parseAnnualFee(value) === null) {
    return 'Annual fee must be a number (e.g. 95 or $95) — Webflow stores it as a Number field';
  }
  return null;
}
