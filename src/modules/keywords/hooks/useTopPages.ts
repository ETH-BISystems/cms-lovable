import { useState, useCallback } from 'react';
import { keywordFunctionsService } from '../services/keywordFunctionsService';
import type { TopPage } from '../types';

interface TopPagesStats {
  totalPages: number;
  monthlyTraffic: number;
  page1Keywords: number;
  avgAuthority: number;
}

export function useTopPages() {
  const [pages, setPages] = useState<TopPage[]>([]);
  const [stats, setStats] = useState<TopPagesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await keywordFunctionsService.callAnalyzeTopPages({ domain });
      setPages(result.pages);
      setStats(result.stats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Top pages analysis failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { pages, stats, loading, error, analyze };
}
