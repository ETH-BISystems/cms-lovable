import { useState, useCallback, useMemo } from 'react';
import type { SortState, KeywordOpportunity, RevenuePotential } from '../types';

type SortableColumn =
  | 'opportunityScore'
  | 'searchVolume'
  | 'kd'
  | 'cpc'
  | 'contentGapScore'
  | 'revenuePotential'
  | 'backlinksToRank'
  | 'intent';

const REVENUE_ORDER: Record<RevenuePotential, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const INTENT_ORDER: Record<string, number> = {
  Transactional: 4,
  Commercial: 3,
  Informational: 2,
  Navigational: 1,
};

export function useKeywordSort(
  defaultColumn: SortableColumn = 'opportunityScore',
  defaultDirection: 'asc' | 'desc' = 'desc',
) {
  const [sort, setSortState] = useState<SortState<SortableColumn>>({
    column: defaultColumn,
    direction: defaultDirection,
  });

  const setSort = useCallback((column: SortableColumn) => {
    setSortState((prev) => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const applySortToArray = useCallback(
    (items: KeywordOpportunity[]): KeywordOpportunity[] => {
      const sorted = [...items];
      const { column, direction } = sort;
      const multiplier = direction === 'asc' ? 1 : -1;

      sorted.sort((a, b) => {
        let aVal: number;
        let bVal: number;

        if (column === 'revenuePotential') {
          aVal = REVENUE_ORDER[a.revenuePotential] ?? 0;
          bVal = REVENUE_ORDER[b.revenuePotential] ?? 0;
        } else if (column === 'intent') {
          aVal = INTENT_ORDER[a.intent] ?? 0;
          bVal = INTENT_ORDER[b.intent] ?? 0;
        } else {
          aVal = (a[column] as number) ?? 0;
          bVal = (b[column] as number) ?? 0;
        }

        return (aVal - bVal) * multiplier;
      });

      return sorted;
    },
    [sort],
  );

  return useMemo(
    () => ({ sort, setSort, applySortToArray }),
    [sort, setSort, applySortToArray],
  );
}
