/**
 * Webflow site the dashboard deep-links to (CMS-83).
 *
 * This must match the site whose collections the Cloud Function secrets
 * (WEBFLOW_*_COLLECTION_ID) point at — it is the site "View on Webflow"
 * opens in the designer. There are TWO sites in play:
 *
 *   - "Elite Points & Miles" (shortName `elite-points-miles-site`) — the
 *     CURRENT sync target since 2026-07-30 (CMS-83 switch); the business's
 *     rebuild site where Joe edits the card review design.
 *   - "Elite Travel Hackers" (shortName `elite-travel-hacks`) — the previous
 *     target; no longer receives syncs.
 *
 * When the sync target is switched (see docs/webflow-site-switch.md), update
 * this constant in the same deploy.
 */
export const WEBFLOW_SITE_SHORTNAME = 'elite-points-miles-site';
