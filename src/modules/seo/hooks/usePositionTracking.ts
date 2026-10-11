import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribePositionTracking, callTrackPositions } from '../services/seoService';
import type { PositionTrackingDoc, PositionFilters } from '../types';

const SITE_ID = 'epm';

const DEFAULT_FILTERS: PositionFilters = {
  positionRange: 'all',
  changeType: 'all',
  volumeMin: '',
  keywordSearch: '',
};

function inBucket(pos: number | null, bucket: string): boolean {
  switch (bucket) {
    case '1-3': return pos !== null && pos >= 1 && pos <= 3;
    case '4-10': return pos !== null && pos >= 4 && pos <= 10;
    case '11-20': return pos !== null && pos >= 11 && pos <= 20;
    case '21-50': return pos !== null && pos >= 21 && pos <= 50;
    case '51-100': return pos !== null && pos >= 51 && pos <= 100;
    case 'not-ranking': return pos === null;
    default: return true;
  }
}

export function usePositionTracking() {
  const [keywords, setKeywords] = useState<PositionTrackingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<PositionFilters>(DEFAULT_FILTERS);
  const [timeRange, setTimeRange] = useState('30 days');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribePositionTracking(
      SITE_ID,
      (docs) => { setKeywords(docs); setLoading(false); setError(null); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const filteredKeywords = useMemo(() => {
    return keywords.filter(kw => {
      if (filters.positionRange !== 'all' && !inBucket(kw.position, filters.positionRange)) return false;
      if (filters.changeType !== 'all' && kw.changeType !== filters.changeType) return false;
      if (filters.volumeMin && (kw.volume || 0) < parseInt(filters.volumeMin)) return false;
      if (filters.keywordSearch && !kw.keyword.toLowerCase().includes(filters.keywordSearch.toLowerCase())) return false;
      return true;
    });
  }, [keywords, filters]);

  const stats = useMemo(() => {
    const trackedCount = keywords.length;
    const onPage1Count = keywords.filter(k => k.position !== null && k.position <= 10).length;
    const ranked = keywords.filter(k => k.position !== null);
    const avgPosition = ranked.length
      ? Math.round((ranked.reduce((s, k) => s + (k.position as number), 0) / ranked.length) * 10) / 10
      : 0;
    // Visibility: average of (101 - position)/100 across all tracked keywords
    const visibilityScore = trackedCount
      ? Math.round(keywords.reduce((s, k) => s + (k.position !== null && k.position <= 100 ? (101 - k.position) / 100 : 0), 0) / trackedCount * 100)
      : 0;
    return { trackedCount, onPage1Count, avgPosition, visibilityScore };
  }, [keywords]);

  const distribution = useMemo(() => ([
    { label: '#1-3', count: keywords.filter(k => inBucket(k.position, '1-3')).length },
    { label: '#4-10', count: keywords.filter(k => inBucket(k.position, '4-10')).length },
    { label: '#11-20', count: keywords.filter(k => inBucket(k.position, '11-20')).length },
    { label: '#21-50', count: keywords.filter(k => inBucket(k.position, '21-50')).length },
    { label: '#51-100', count: keywords.filter(k => inBucket(k.position, '51-100')).length },
    { label: 'Not Ranking', count: keywords.filter(k => k.position === null).length },
  ]), [keywords]);

  const changeStats = useMemo(() => ({
    improved: keywords.filter(k => k.changeType === 'improved').length,
    declined: keywords.filter(k => k.changeType === 'declined').length,
    newPage1: keywords.filter(k =>
      k.position !== null && k.position <= 10 && (
        k.changeType === 'new' ||
        (typeof k.positionChange === 'number' && k.positionChange > 0 && k.position + k.positionChange > 10)
      )
    ).length,
  }), [keywords]);

  const trackPositions = useCallback(async () => {
    setActionLoading(true);
    try { await callTrackPositions({ siteId: SITE_ID }); } finally { setActionLoading(false); }
  }, []);

  return {
    keywords,
    filteredKeywords,
    stats,
    distribution,
    changeStats,
    loading,
    error,
    filters,
    setFilters,
    timeRange,
    setTimeRange,
    trackPositions,
    actionLoading,
  };
}
