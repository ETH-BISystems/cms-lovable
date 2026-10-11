import { useState, useEffect, useMemo } from 'react';
import { subscribeAuditRuns } from '../services/pageAuditService';
import type { SiteId, AuditRunDoc, AuditHistoryFilters } from '../types';

const DEFAULT_FILTERS: AuditHistoryFilters = {
  type: 'All',
  triggeredBy: '',
};

export function useAuditRuns(siteId: SiteId = 'eth') {
  const [runs, setRuns] = useState<AuditRunDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AuditHistoryFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeAuditRuns(siteId, (data) => {
      setRuns(data);
      setLoading(false);
      setError(null);
    });

    return () => unsubscribe();
  }, [siteId]);

  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      if (filters.type !== 'All' && run.triggerType !== filters.type) return false;

      if (filters.triggeredBy !== '') {
        const search = filters.triggeredBy.toLowerCase();
        if (!run.triggeredBy.toLowerCase().includes(search)) return false;
      }

      return true;
    });
  }, [runs, filters]);

  return {
    runs,
    filteredRuns,
    loading,
    error,
    filters,
    setFilters,
  };
}
