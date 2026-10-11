/**
 * Feature Flags — toggle modules on/off across the entire app.
 *
 * When a feature is disabled:
 * - Its nav item is hidden from the sidebar
 * - Its route renders the ComingSoonPage
 * - Dashboard widgets related to it are hidden
 *
 * To enable a feature, set its value to true.
 * To disable, set to false.
 */
export const FEATURES = {
  home: true,
  myTasks: true,
  serviceTickets: true,   // Service Tickets board (internal + contractor issue tracking)
  rssFeedMonitor: true,
  keywords: true,
  seo: true,
  trafficMarket: true,      // Traffic & Market suite (Similarweb adapter, Sessions 29–41)
  pipeline: true,
  calendar: true,
  newsletter: false,        // Disabled — Beehiiv not configured
  analytics: false,         // Disabled — not built yet
  cards: true,
  cardTransferPartners: true,   // Transfer Partner Tables section (/transfer-partners)
  assets: true,
  experience: true,
  voiceTraining: false,     // Disabled — not built yet
  iframes: true,            // iFrame Manager (replaces the shortcode Element Manager)
  settings: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Check if a feature is enabled */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
