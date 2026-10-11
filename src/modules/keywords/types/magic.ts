/**
 * Types for the Keyword Magic Tool (SEMRush-style keyword research).
 * Data comes from the `keywordMagicSearch` Cloud Function (DataForSEO).
 */

export interface MagicKeyword {
  keyword: string;
  volume: number;
  kd: number;
  cpc: number;
  competition: number;
  intent: string;
  serpFeatures: string[];
  trend: number[];
  /** CMS-146: 'ideas' = the DFS Keyword Database source (SEMrush-scale). */
  source: 'suggestions' | 'related' | 'ideas';
  updatedAt: string;
}

export interface KeywordGroup {
  name: string;
  count: number;
  totalVolume: number;
}

export interface KeywordMagicInput {
  seed: string;
  limit?: number;
}

export interface KeywordMagicResult {
  seed: string;
  keywords: MagicKeyword[];
  totalCount: number;
  groups: KeywordGroup[];
}

/** Match-type tabs. All filtering is computed client-side from the merged result set. */
export type MagicMatchType = 'all' | 'questions' | 'broad' | 'phrase' | 'exact' | 'related';

export type MagicIntent = 'informational' | 'commercial' | 'transactional' | 'navigational';

export interface MagicFilters {
  volumeMin: number | null;
  volumeMax: number | null;
  kdMin: number | null;
  kdMax: number | null;
  cpcMin: number | null;
  cpcMax: number | null;
  intents: MagicIntent[];
  include: string;
  exclude: string;
}

/**
 * Sortable columns. 'relevance' is the passive default (CMS-156): it keeps
 * the server's relevance-ranked order until the user picks a real column.
 * It has no sortable header in the UI.
 */
export type MagicSortColumn = 'relevance' | 'keyword' | 'volume' | 'kd' | 'cpc' | 'serpFeatures';

export interface MagicSortState {
  column: MagicSortColumn;
  direction: 'asc' | 'desc';
}

export const EMPTY_MAGIC_FILTERS: MagicFilters = {
  volumeMin: null,
  volumeMax: null,
  kdMin: null,
  kdMax: null,
  cpcMin: null,
  cpcMax: null,
  intents: [],
  include: '',
  exclude: '',
};
