/**
 * Display constants for the Transfer Partner Table embed family — the
 * client-side mirror of the server registry's TP_PROGRAM_KEYS /
 * TP_ALLIANCE_GROUPS (functions/src/iframes/registry.ts). The server
 * re-validates everything.
 */

export interface TpProgramOption {
  id: string;
  /** Column header text (Figma-matched, mirrors the renderer). */
  label: string;
}

export const TP_PROGRAM_OPTIONS: TpProgramOption[] = [
  { id: 'chase-ur', label: 'Chase Ultimate Rewards (UR)' },
  { id: 'amex-mr', label: 'AmEx Member Rewards (MR)' },
  { id: 'capital-one', label: 'Capital One Miles' },
  { id: 'bilt', label: 'Bilt' },
  { id: 'citi-ty', label: 'CITI Thank You' },
  { id: 'wells-fargo', label: 'Wells Fargo Rewards' },
];

export const TP_ALLIANCE_OPTIONS: string[] = [
  'Star Alliance',
  'SkyTeam',
  'Oneworld',
  'Non-Alliance',
  'Hotels',
];

/** CMS-110: alliance icon slots (hotels are broken out by brand instead). */
export const TP_ALLIANCE_ICON_OPTIONS: string[] = [
  'Star Alliance',
  'SkyTeam',
  'Oneworld',
  'Non-Alliance',
];

/** CMS-110: hotel brand icon slots — mirrors TP_HOTEL_BRANDS in the server
 * registry (functions/src/iframes/registry.ts), which re-validates. */
export const TP_HOTEL_BRAND_OPTIONS: string[] = [
  'IHG',
  'Marriott',
  'Hyatt',
  'Wyndham',
  'Accor',
  'Choice',
  'Leading Hotels',
  'Hilton',
  'Preferred Hotels',
];

export const TP_MAX_DESCRIPTION = 500;

/**
 * The tp-table filter shape both the modal and the validators speak
 * (mirrors IframeTpTableConfig in src/modules/iframes/types).
 */
export interface TpTableConfigInput {
  programs: string[];
  alliances: string[];
  description: string;
  /** CMS-128: compact card-review mode — no validation constraints. */
  hideFilters?: boolean;
  /** CMS-145: airline filter — matrix doc ids; non-empty renders ONLY those rows. */
  partners?: string[];
  /** CMS-145: server-denormalized partner names (display/search only). */
  partnerNames?: string[];
}

/**
 * Client-side pre-validation mirroring the server registry. Returns an error
 * message or null when valid.
 */
export function validateTpConfig(config: TpTableConfigInput): string | null {
  if (config.programs.length === 0) return 'Select at least one card program.';
  if (config.alliances.length === 0) return 'Select at least one alliance group.';
  if (config.description.length > TP_MAX_DESCRIPTION) {
    return `Description exceeds ${TP_MAX_DESCRIPTION} characters.`;
  }
  return null;
}

/** Display label for a program id ('chase-ur' → 'Chase Ultimate Rewards (UR)'). */
export function tpProgramLabel(id: string): string {
  return TP_PROGRAM_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

/**
 * CMS-141: one-line human summary of a tp-table instance's filters — bank
 * NAMES, not raw program ids — so saved tables are recognisable (and
 * searchable) in every reuse/audit list
 * ("Chase Ultimate Rewards (UR) · AmEx Member Rewards (MR) — Star Alliance, Hotels").
 * CMS-145: airline-picked tables summarise as "Airlines: Japan Airlines, …"
 * (the alliance groups don't drive those rows).
 */
export function tpConfigSummary(cfg?: Partial<TpTableConfigInput> | null): string {
  if (!cfg) return 'Transfer Partner Table';
  const programs = (cfg.programs ?? []).map(tpProgramLabel).join(' · ');
  const rows = (cfg.partnerNames ?? []).length > 0
    ? `Airlines: ${cfg.partnerNames!.join(', ')}`
    : (cfg.alliances ?? []).join(', ');
  return [programs || 'No programs', rows].filter(Boolean).join(' — ');
}

/** CMS-141: lowercase haystack for searching a tp-table instance — labels AND ids.
 * CMS-145: airline names + ids searchable too ("jal" finds the JAL table). */
export function tpConfigSearchText(cfg?: Partial<TpTableConfigInput> | null): string {
  if (!cfg) return '';
  return [
    ...(cfg.programs ?? []),
    ...(cfg.programs ?? []).map(tpProgramLabel),
    ...(cfg.alliances ?? []),
    ...(cfg.partners ?? []),
    ...(cfg.partnerNames ?? []),
    cfg.description ?? '',
  ].join(' ').toLowerCase();
}
