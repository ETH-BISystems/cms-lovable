import type { CardDetailData } from '../types';

/**
 * The 7 ETH scoring sub-scores and their weights (must sum to 1). Shared by
 * the display hexagon/sliders (CardOverviewTab) and the save-time persistence
 * (CardDetailPanel) so the two calculations can't drift apart — previously
 * each held its own copy of this list and only the display copy existed,
 * which meant the persisted score was never actually written to Firestore.
 */
export const SCORE_LABELS = [
  { key: 'rewardsRateScore', label: 'Rewards Rate', weight: 0.20 },
  // Labels use the Webflow-facing names (welcome offer / redemption value);
  // the underlying keys keep their original names for data compatibility.
  { key: 'signupBonusScore', label: 'Welcome Offer', weight: 0.15 },
  { key: 'annualFeeScore', label: 'Annual Fee', weight: 0.20 },
  { key: 'benefitsScore', label: 'Benefits', weight: 0.15 },
  { key: 'flexibilityScore', label: 'Flexibility', weight: 0.10 },
  { key: 'overallValueScore', label: 'Redemption Value', weight: 0.10 },
  { key: 'scoreTravelProtections', label: 'Travel Protections', weight: 0.10 },
] as const satisfies ReadonlyArray<{ key: keyof CardDetailData; label: string; weight: number }>;

/** Computes the weighted composite score (0-10, one decimal place) from the 7 sub-scores. */
export function computeCompositeScore(detailData: CardDetailData): number {
  const raw = SCORE_LABELS.reduce((sum, { key, weight }) => {
    const value = (detailData[key] as number | undefined) ?? 5;
    return sum + value * weight;
  }, 0);
  return Math.round(raw * 10) / 10;
}
