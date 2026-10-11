import { useState, useCallback, useMemo } from 'react';
import type { KeywordFilters, KeywordOpportunity } from '../types';

const DEFAULT_FILTERS: KeywordFilters = {
  topicCluster: null,
  kdRange: [0, 100],
  minVolume: 0,
  revenuePotential: null,
  ethStatus: null,
  positionRange: null,
  intent: null,
  includeText: '',
  excludeText: '',
};

export function useKeywordFilters() {
  const [filters, setFilters] = useState<KeywordFilters>(DEFAULT_FILTERS);

  const setFilter = useCallback(
    <K extends keyof KeywordFilters>(key: K, value: KeywordFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const applyFilters = useCallback(
    (keywords: KeywordOpportunity[]): KeywordOpportunity[] => {
      return keywords.filter((kw) => {
        // Topic cluster filter
        if (filters.topicCluster && kw.topicCluster !== filters.topicCluster) {
          return false;
        }

        // KD range filter
        if (kw.kd < filters.kdRange[0] || kw.kd > filters.kdRange[1]) {
          return false;
        }

        // Minimum volume filter
        if (kw.searchVolume < filters.minVolume) {
          return false;
        }

        // Revenue potential filter
        if (filters.revenuePotential && kw.revenuePotential !== filters.revenuePotential) {
          return false;
        }

        // ETH status filter
        if (filters.ethStatus) {
          if (filters.ethStatus === 'underperforming') {
            if (kw.ethStatus !== 'ranking') return false;
          } else {
            if (kw.ethStatus !== filters.ethStatus) return false;
          }
        }

        // Position range filter
        if (filters.positionRange) {
          const pos = kw.ethRankPosition;
          if (pos == null) return false;
          if (pos < filters.positionRange[0] || pos > filters.positionRange[1]) {
            return false;
          }
        }

        // Intent filter
        if (filters.intent && kw.intent !== filters.intent) {
          return false;
        }

        // Include text filter
        if (filters.includeText) {
          const lower = kw.keyword.toLowerCase();
          if (!lower.includes(filters.includeText.toLowerCase())) {
            return false;
          }
        }

        // Exclude text filter
        if (filters.excludeText) {
          const lower = kw.keyword.toLowerCase();
          if (lower.includes(filters.excludeText.toLowerCase())) {
            return false;
          }
        }

        return true;
      });
    },
    [filters],
  );

  return useMemo(
    () => ({ filters, setFilter, clearFilters, applyFilters }),
    [filters, setFilter, clearFilters, applyFilters],
  );
}
