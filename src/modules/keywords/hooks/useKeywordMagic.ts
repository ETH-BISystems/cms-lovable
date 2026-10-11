import { useCallback, useMemo, useRef, useState } from 'react';
import { keywordMagicSearch } from '../services/keywordMagicService';
import { applyMatchType, sortKeywords } from '../utils/keywordMatch';
import {
  EMPTY_MAGIC_FILTERS,
  type KeywordMagicResult,
  type MagicFilters,
  type MagicKeyword,
  type MagicMatchType,
  type MagicSortState,
} from '../types/magic';

function applyFilters(keywords: MagicKeyword[], filters: MagicFilters, group: string | null): MagicKeyword[] {
  const includeTerms = filters.include.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
  const excludeTerms = filters.exclude.toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

  return keywords.filter(k => {
    if (filters.volumeMin !== null && k.volume < filters.volumeMin) return false;
    if (filters.volumeMax !== null && k.volume > filters.volumeMax) return false;
    if (filters.kdMin !== null && k.kd < filters.kdMin) return false;
    if (filters.kdMax !== null && k.kd > filters.kdMax) return false;
    if (filters.cpcMin !== null && k.cpc < filters.cpcMin) return false;
    if (filters.cpcMax !== null && k.cpc > filters.cpcMax) return false;
    if (filters.intents.length > 0 && !filters.intents.includes(k.intent as MagicFilters['intents'][number])) return false;
    if (includeTerms.length > 0 && !includeTerms.some(t => k.keyword.includes(t))) return false;
    if (excludeTerms.length > 0 && excludeTerms.some(t => k.keyword.includes(t))) return false;
    if (group && !k.keyword.split(/\s+/).some(t => t.replace(/[^a-z0-9]/g, '') === group)) return false;
    return true;
  });
}

export interface UseKeywordMagicReturn {
  result: KeywordMagicResult | null;
  loading: boolean;
  error: string | null;
  search: (seed: string) => Promise<void>;
  /**
   * Replace the result set without an API call — used to re-open a saved
   * search snapshot. Resets paging/group state exactly like a fresh search.
   */
  loadResult: (result: KeywordMagicResult) => void;

  matchType: MagicMatchType;
  setMatchType: (m: MagicMatchType) => void;
  filters: MagicFilters;
  setFilters: (f: MagicFilters) => void;
  activeGroup: string | null;
  setActiveGroup: (g: string | null) => void;
  sort: MagicSortState;
  toggleSort: (column: MagicSortState['column']) => void;

  /** Keywords after match tab + filters + group + sort (all pages). */
  filteredKeywords: MagicKeyword[];
  /** Current page slice. */
  pageKeywords: MagicKeyword[];
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  totalPages: number;

  stats: { count: number; totalVolume: number; avgKd: number };
}

// CMS-156: the default view keeps the server's relevance-ranked order so
// exact/phrase/AND-matched keywords surface above volume-heavy drift; picking
// any column header switches to that sort as before.
const DEFAULT_SORT: MagicSortState = { column: 'relevance', direction: 'desc' };

export function useKeywordMagic(initialResult: KeywordMagicResult | null = null): UseKeywordMagicReturn {
  const [result, setResult] = useState<KeywordMagicResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Monotonic id so a slow, superseded search can never overwrite the results
  // of a newer one (httpsCallable cannot be aborted).
  const requestIdRef = useRef(0);

  const [matchType, setMatchTypeState] = useState<MagicMatchType>('all');
  const [filters, setFiltersState] = useState<MagicFilters>(EMPTY_MAGIC_FILTERS);
  const [activeGroup, setActiveGroupState] = useState<string | null>(null);
  const [sort, setSort] = useState<MagicSortState>(DEFAULT_SORT);
  const [page, setPageState] = useState(0);
  const [pageSize, setPageSizeState] = useState(50);

  const search = useCallback(async (seed: string) => {
    const trimmed = seed.trim();
    if (!trimmed) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setActiveGroupState(null);
    setPageState(0);
    try {
      const data = await keywordMagicSearch({ seed: trimmed });
      if (requestId !== requestIdRef.current) return; // superseded by a newer search
      setResult(data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setResult(null);
      setError((err as Error).message || 'Keyword search failed');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadResult = useCallback((data: KeywordMagicResult) => {
    // Supersede any in-flight search so it can't overwrite the snapshot.
    requestIdRef.current += 1;
    setLoading(false);
    setError(null);
    setActiveGroupState(null);
    setPageState(0);
    setResult(data);
  }, []);

  const setMatchType = useCallback((m: MagicMatchType) => {
    setMatchTypeState(m);
    setPageState(0);
  }, []);

  const setFilters = useCallback((f: MagicFilters) => {
    setFiltersState(f);
    setPageState(0);
  }, []);

  const setActiveGroup = useCallback((g: string | null) => {
    setActiveGroupState(prev => (prev === g ? null : g));
    setPageState(0);
  }, []);

  const toggleSort = useCallback((column: MagicSortState['column']) => {
    setSort(prev => prev.column === column
      ? { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { column, direction: column === 'keyword' ? 'asc' : 'desc' });
    setPageState(0);
  }, []);

  const setPageSize = useCallback((s: number) => {
    setPageSizeState(s);
    setPageState(0);
  }, []);

  const filteredKeywords = useMemo(() => {
    if (!result) return [];
    const matched = applyMatchType(result.keywords, matchType, result.seed);
    const filtered = applyFilters(matched, filters, activeGroup);
    return sortKeywords(filtered, sort);
  }, [result, matchType, filters, activeGroup, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredKeywords.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageKeywords = useMemo(
    () => filteredKeywords.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    [filteredKeywords, clampedPage, pageSize]
  );

  const stats = useMemo(() => {
    const count = filteredKeywords.length;
    const totalVolume = filteredKeywords.reduce((sum, k) => sum + k.volume, 0);
    const avgKd = count > 0 ? Math.round(filteredKeywords.reduce((sum, k) => sum + k.kd, 0) / count) : 0;
    return { count, totalVolume, avgKd };
  }, [filteredKeywords]);

  return {
    result,
    loading,
    error,
    search,
    loadResult,
    matchType,
    setMatchType,
    filters,
    setFilters,
    activeGroup,
    setActiveGroup,
    sort,
    toggleSort,
    filteredKeywords,
    pageKeywords,
    page: clampedPage,
    setPage: setPageState,
    pageSize,
    setPageSize,
    totalPages,
    stats,
  };
}
