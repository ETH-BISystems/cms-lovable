import { useState, useCallback, useMemo } from 'react';
import { keywordFunctionsService } from '../services/keywordFunctionsService';
import type { ExplorerKeyword } from '../types';

const MAX_RECENT_SEARCHES = 10;

export function useKeywordExplorer() {
  const [results, setResults] = useState<ExplorerKeyword[]>([]);
  const [clusters, setClusters] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<string>('all');
  const [selectedCluster, setCluster] = useState<string | null>(null);

  const search = useCallback(async (seed: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await keywordFunctionsService.callExploreKeywords({ seed });
      setResults(data.keywords);
      setClusters(data.clusters);

      // Add to recent searches
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== seed);
        return [seed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Explorer search failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply match type and cluster filters client-side
  const filteredResults = useMemo(() => {
    let filtered = results;

    if (matchType !== 'all') {
      filtered = filtered.filter((kw) => kw.matchType === matchType);
    }

    if (selectedCluster) {
      filtered = filtered.filter((kw) => kw.cluster === selectedCluster);
    }

    return filtered;
  }, [results, matchType, selectedCluster]);

  return {
    results: filteredResults,
    allResults: results,
    clusters,
    loading,
    error,
    recentSearches,
    matchType,
    selectedCluster,
    search,
    setMatchType,
    setCluster,
  };
}
