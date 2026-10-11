import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribePageAudits, callAuditPage, callRunSiteAudit, callUpdateAuditSchedule } from '../services/seoService';
import type { SiteId, PageAuditDoc, AuditFilters, UpdateAuditScheduleInput } from '../types';

const DEFAULT_FILTERS: AuditFilters = {
  scoreRange: 'all',
  severity: 'All',
  topicCluster: '',
  author: '',
  search: '',
};

function inScoreRange(score: number, range: string): boolean {
  switch (range) {
    case '90-100': return score >= 90;
    case '80-89': return score >= 80 && score <= 89;
    case '70-79': return score >= 70 && score <= 79;
    case '60-69': return score >= 60 && score <= 69;
    case 'below-60': return score < 60;
    default: return true;
  }
}

export function usePageAudits(siteId: SiteId = 'eth') {
  const [audits, setAudits] = useState<PageAuditDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribePageAudits(
      siteId,
      (d) => { setAudits(d); setLoading(false); setError(null); },
      (err) => { setError(err); setLoading(false); }
    );
    return () => unsub();
  }, [siteId]);

  const filteredAudits = useMemo(() => {
    return audits.filter(a => {
      if (filters.scoreRange !== 'all' && !inScoreRange(a.seoScore || 0, filters.scoreRange)) return false;
      if (filters.severity !== 'All') {
        if (filters.severity === 'Critical' && !(a.criticalCount > 0)) return false;
        if (filters.severity === 'Warning' && !(a.warningCount > 0)) return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const title = (a.title || '').toLowerCase();
        const keyword = (a.keyword || '').toLowerCase();
        if (!title.includes(q) && !keyword.includes(q)) return false;
      }
      return true;
    });
  }, [audits, filters]);

  const stats = useMemo(() => {
    const articlesAudited = audits.length;
    const avgScore = articlesAudited
      ? Math.round(audits.reduce((s, a) => s + (a.seoScore || 0), 0) / articlesAudited)
      : 0;
    const criticalIssues = audits.reduce((s, a) => s + (a.criticalCount || 0), 0);
    const scoring90Plus = audits.filter(a => (a.seoScore || 0) >= 90).length;
    return { articlesAudited, avgScore, criticalIssues, scoring90Plus };
  }, [audits]);

  const scoreDistribution = useMemo(() => ([
    { label: '90-100', count: audits.filter(a => inScoreRange(a.seoScore || 0, '90-100')).length },
    { label: '80-89', count: audits.filter(a => inScoreRange(a.seoScore || 0, '80-89')).length },
    { label: '70-79', count: audits.filter(a => inScoreRange(a.seoScore || 0, '70-79')).length },
    { label: '60-69', count: audits.filter(a => inScoreRange(a.seoScore || 0, '60-69')).length },
    { label: 'Below 60', count: audits.filter(a => inScoreRange(a.seoScore || 0, 'below-60')).length },
  ]), [audits]);

  const withAction = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    setActionLoading(p => ({ ...p, [key]: true }));
    try { const r = await fn(); setActionLoading(p => ({ ...p, [key]: false })); return r; }
    catch (e) { setActionLoading(p => ({ ...p, [key]: false })); throw e; }
  }, []);

  return {
    audits,
    filteredAudits,
    stats,
    scoreDistribution,
    loading,
    error,
    filters,
    setFilters,
    actionLoading,
    auditPage: (articleId: string) => withAction('auditPage', () => callAuditPage({ siteId, articleId })),
    runSiteAudit: () => withAction('runSiteAudit', () => callRunSiteAudit({ siteId })),
    updateAuditSchedule: (input: UpdateAuditScheduleInput) => withAction('updateSchedule', () => callUpdateAuditSchedule(input)),
  };
}
