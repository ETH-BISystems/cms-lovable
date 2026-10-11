/**
 * Shared display constants for the Transfer Partner Matrix — program brand
 * treatment, speed indicators, and alliance badges. Single source so the
 * page, table, cells, and card-detail Partners tab stay consistent.
 */
import type { CardProgram, TransferSpeed, AllianceGroup } from '../types';

export const ALL_PROGRAMS: CardProgram[] = ['chase-ur', 'amex-mr', 'capital-one', 'bilt', 'citi-ty', 'wells-fargo'];

export const PROGRAM_LABELS: Record<CardProgram, string> = {
  'chase-ur': 'Chase UR',
  'amex-mr': 'Amex MR',
  'capital-one': 'Cap One',
  'bilt': 'Bilt',
  'citi-ty': 'Citi TYP',
  'wells-fargo': 'Wells Fargo',
};

export const PROGRAM_FULL_NAMES: Record<CardProgram, string> = {
  'chase-ur': 'Chase Ultimate Rewards',
  'amex-mr': 'Amex Membership Rewards',
  'capital-one': 'Capital One Miles',
  'bilt': 'Bilt Rewards',
  'citi-ty': 'Citi ThankYou Points',
  'wells-fargo': 'Wells Fargo Rewards',
};

export const PROGRAM_COLORS: Record<CardProgram, { bg: string; text: string; badge: string }> = {
  'chase-ur': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-600' },
  'amex-mr': { bg: 'bg-slate-50', text: 'text-blue-700', badge: 'bg-blue-500' },
  'capital-one': { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-600' },
  'bilt': { bg: 'bg-gray-50', text: 'text-gray-900', badge: 'bg-gray-800' },
  'citi-ty': { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-600' },
  'wells-fargo': { bg: 'bg-orange-50', text: 'text-red-700', badge: 'bg-red-500' },
};

export const PROGRAM_LOGOS: Record<CardProgram, string> = {
  'chase-ur': 'C',
  'amex-mr': 'AX',
  'capital-one': 'C1',
  'bilt': 'B',
  'citi-ty': 'Ci',
  'wells-fargo': 'WF',
};

export const CITI_NOTE =
  '1:1 ratios require Citi Strata Elite, Strata Premier, or Prestige (closed). Other Citi cards transfer at lower ratios.';

export const AVIOS_NOTE =
  'Avios currencies can be transferred between BA, Qatar, Iberia, Aer Lingus, and Vueling at 1:1.';

export const MARRIOTT_NOTE =
  'Marriott Bonvoy transfers to airlines at 3:1 ratio with a 5,000-mile bonus per 60,000 points transferred.';

export const SPEED_CONFIG: Record<TransferSpeed, { dot: string; label: string }> = {
  'instant': { dot: 'bg-success', label: 'Instant' },
  '1-2-days': { dot: 'bg-warning', label: '1-2 days' },
  '3-5-days': { dot: 'bg-orange-500', label: '3-5 days' },
  'up-to-7-days': { dot: 'bg-muted-foreground', label: 'Up to 7 days' },
  '3-plus-days': { dot: 'bg-muted-foreground', label: '3+ days' },
};

/** Speed choices offered in the edit popover (legacy bucket excluded) */
export const SPEED_OPTIONS: Array<{ value: TransferSpeed; label: string }> = [
  { value: 'instant', label: 'Instant' },
  { value: '1-2-days', label: '1-2 days' },
  { value: '3-5-days', label: '3-5 days' },
  { value: 'up-to-7-days', label: 'Up to 7 days' },
];

export const ALLIANCE_BADGES: Record<AllianceGroup, { icon: string; color: string; label: string }> = {
  'Star Alliance': { icon: '★', color: 'text-yellow-600 bg-yellow-50', label: 'Airlines — Star Alliance' },
  'Oneworld': { icon: '●', color: 'text-rose-600 bg-rose-50', label: 'Airlines — Oneworld' },
  'SkyTeam': { icon: '▲', color: 'text-sky-600 bg-sky-50', label: 'Airlines — SkyTeam' },
  'Non-Alliance': { icon: '◇', color: 'text-purple-600 bg-purple-50', label: 'Airlines — Non-Alliance' },
  'Hotels': { icon: '🏨', color: 'text-amber-600 bg-amber-50', label: 'Hotels' },
  '': { icon: '?', color: 'text-muted-foreground bg-muted', label: 'Ungrouped' },
};

export function getEffectiveRatio(ratio: string, bonusPercent: number): string {
  const parts = ratio.split(':');
  if (parts.length !== 2) return ratio;
  const [, to] = parts.map(Number);
  if (isNaN(to)) return ratio;
  const effective = to * (1 + bonusPercent / 100);
  return `1:${effective.toFixed(effective % 1 === 0 ? 0 : 2)}`;
}

export function hasActiveBonus(entry: { bonusPercent: number | null; bonusEndDate: { toMillis?: () => number } | null } | undefined): boolean {
  if (!entry) return false;
  return (
    entry.bonusPercent !== null &&
    entry.bonusEndDate !== null &&
    typeof entry.bonusEndDate?.toMillis === 'function' &&
    entry.bonusEndDate.toMillis() > Date.now()
  );
}
