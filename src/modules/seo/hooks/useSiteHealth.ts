import { useState, useEffect, useCallback } from 'react';
import { subscribeSiteHealth, subscribeIssues, subscribeSchemas, subscribeIndexing, subscribeBacklinks, subscribeRedirects, callRunSiteHealthCrawl, callSubmitForIndexing, callCreateRedirect, callUpdateRedirect, callDeleteRedirect, callTestRedirect } from '../services/seoService';
import type { SiteId, SiteHealthDoc, TechnicalIssueDoc, SchemaDoc, IndexingDoc, BacklinkDoc, RedirectDoc, CreateRedirectInput, UpdateRedirectInput } from '../types';

export function useSiteHealth() {
  const [selectedSite, setSelectedSite] = useState<SiteId>('eth');
  const [timeRange, setTimeRange] = useState('30 days');
  const [siteHealth, setSiteHealth] = useState<SiteHealthDoc | null>(null);
  const [issues, setIssues] = useState<TechnicalIssueDoc[]>([]);
  const [schemas, setSchemas] = useState<SchemaDoc[]>([]);
  const [indexing, setIndexing] = useState<IndexingDoc[]>([]);
  const [backlinks, setBacklinks] = useState<BacklinkDoc[]>([]);
  const [redirects, setRedirects] = useState<RedirectDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    const onError = (err: Error) => { setError(err); setLoading(false); };
    const unsubs = [
      subscribeSiteHealth(selectedSite, (d) => { setSiteHealth(d); setLoading(false); setError(null); }, onError),
      subscribeIssues(selectedSite, setIssues, onError),
      subscribeSchemas(selectedSite, setSchemas, onError),
      subscribeIndexing(selectedSite, setIndexing, onError),
      subscribeBacklinks(selectedSite, setBacklinks, onError),
      subscribeRedirects(selectedSite, setRedirects, onError),
    ];
    return () => unsubs.forEach(u => u());
  }, [selectedSite]);

  const withAction = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    setActionLoading(p => ({ ...p, [key]: true }));
    try { const r = await fn(); setActionLoading(p => ({ ...p, [key]: false })); return r; }
    catch (e) { setActionLoading(p => ({ ...p, [key]: false })); throw e; }
  }, []);

  return {
    selectedSite, setSelectedSite, timeRange, setTimeRange,
    siteHealth, issues, schemas, indexing, backlinks, redirects, loading, error, actionLoading,
    runSiteHealthCrawl: () => withAction('crawl', () => callRunSiteHealthCrawl({ siteId: selectedSite })),
    submitForIndexing: (urls: string[]) => withAction('index', () => callSubmitForIndexing({ siteId: selectedSite, urls })),
    createRedirect: (input: CreateRedirectInput) => withAction('createRedirect', () => callCreateRedirect(input)),
    updateRedirect: (input: UpdateRedirectInput) => withAction('updateRedirect', () => callUpdateRedirect(input)),
    deleteRedirect: (redirectId: string) => withAction('deleteRedirect', () => callDeleteRedirect({ siteId: selectedSite, redirectId })),
    testRedirect: (redirectId: string) => withAction('testRedirect', () => callTestRedirect({ siteId: selectedSite, redirectId })),
  };
}
