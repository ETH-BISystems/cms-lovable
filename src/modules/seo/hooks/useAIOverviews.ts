import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeAIOverviews, callTrackAIOverviews } from '../services/seoService';
import type { AIOverviewDoc, AIOverviewFilters } from '../types';

const SITE_ID = 'epm';

const DEFAULT_FILTERS: AIOverviewFilters = {
  hasAIOverview: 'All',
  ethCited: 'All',
  volumeMin: '',
  ctrImpact: 'All',
};

export function useAIOverviews() {
  const [overviews, setOverviews] = useState<AIOverviewDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AIOverviewFilters>(DEFAULT_FILTERS);
  const [timeRange, setTimeRange] = useState('30 days');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribeAIOverviews(
      SITE_ID,
      (d) => { setOverviews(d); setLoading(false); setError(null); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const filteredOverviews = useMemo(() => {
    return overviews.filter(o => {
      if (filters.hasAIOverview === 'Has AI Overview' && !o.hasAIOverview) return false;
      if (filters.hasAIOverview === 'No AI Overview' && o.hasAIOverview) return false;
      if (filters.ethCited !== 'All' && o.ethCited !== filters.ethCited) return false;
      if (filters.volumeMin && (o.volume || 0) < parseInt(filters.volumeMin)) return false;
      if (filters.ctrImpact !== 'All') {
        if (filters.ctrImpact === 'High' && o.ctrImpact <= 30) return false;
        if (filters.ctrImpact === 'Medium' && (o.ctrImpact <= 10 || o.ctrImpact > 30)) return false;
        if (filters.ctrImpact === 'Low' && o.ctrImpact > 10) return false;
      }
      return true;
    });
  }, [overviews, filters]);

  const stats = useMemo(() => {
    const withAIO = overviews.filter(o => o.hasAIOverview);
    const keywordsWithAIOverview = withAIO.length;
    const ethCitedCount = withAIO.filter(o => o.ethCited === 'Yes' || o.ethCited === 'Partial').length;
    const estCtrImpact = keywordsWithAIOverview
      ? Math.round(withAIO.reduce((s, o) => s + (o.ctrImpact || 0), 0) / keywordsWithAIOverview * 10) / 10
      : 0;
    const trafficAtRisk = withAIO.reduce(
      (s, o) => s + Math.round((o.volume || 0) * ((o.ctrImpact || 0) / 100)),
      0
    );
    return { keywordsWithAIOverview, ethCitedCount, estCtrImpact, trafficAtRisk };
  }, [overviews]);

  const trackAIOverviews = useCallback(async () => {
    setActionLoading(true);
    try { await callTrackAIOverviews({ siteId: SITE_ID }); } finally { setActionLoading(false); }
  }, []);

  return {
    overviews,
    filteredOverviews,
    stats,
    loading,
    error,
    filters,
    setFilters,
    timeRange,
    setTimeRange,
    trackAIOverviews,
    actionLoading,
  };
}
