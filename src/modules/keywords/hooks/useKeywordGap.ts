import { useState, useCallback } from 'react';
import { keywordFunctionsService } from '../services/keywordFunctionsService';
import { getGapResults, getGapAnalysisRun } from '../services/keywordGapService';
import type { KeywordGap, GapAnalysisRun, GapType } from '../types';

export function useKeywordGap() {
  const [gapResults, setGapResults] = useState<KeywordGap[]>([]);
  const [analysisRun, setAnalysisRun] = useState<GapAnalysisRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeGapType, setGapType] = useState<GapType | 'all'>('all');

  const compare = useCallback(async (competitors: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const result = await keywordFunctionsService.callAnalyzeKeywordGap({
        ethDomain: 'elitetravelhackers.com',
        competitorDomains: competitors,
      });

      // Fetch the full gap results and analysis run metadata
      const [gaps, run] = await Promise.all([
        getGapResults(result.analysisId),
        getGapAnalysisRun(result.analysisId),
      ]);

      setGapResults(gaps);
      setAnalysisRun(run);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gap analysis failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter by active gap type
  const filteredResults =
    activeGapType === 'all'
      ? gapResults
      : gapResults.filter((g) => g.gapType === activeGapType);

  return {
    gapResults: filteredResults,
    allGapResults: gapResults,
    analysisRun,
    loading,
    error,
    activeGapType,
    compare,
    setGapType,
  };
}
