import { useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { useSiteHealth } from '../hooks/useSiteHealth';
import { useSEOActions } from '../hooks/useSEOActions';

import { SiteSelector } from './shared/SiteSelector';
import { TimeRangeSelector } from './shared/TimeRangeSelector';
import { SiteHealthOverview } from './site-health/SiteHealthOverview';
import { SchemaHealthTab } from './site-health/SchemaHealthTab';
import { IndexingStatusTab } from './site-health/IndexingStatusTab';
import { TechnicalIssuesTab } from './site-health/TechnicalIssuesTab';
import { BacklinksTab } from './site-health/BacklinksTab';
import { RedirectsTab } from './site-health/RedirectsTab';

const TABS = [
  'Schema Health',
  'Indexing Status',
  'Technical Issues',
  'Backlinks',
  'Redirects',
] as const;
type Tab = (typeof TABS)[number];

const SITE_DOMAINS: Record<string, string> = {
  eth: 'elitetravelhackers.com',
  epm: 'elitepointsandmiles.com',
};

export function SEOPage() {
  const {
    siteHealth,
    schemas,
    indexing,
    issues,
    backlinks,
    redirects,
    loading,
    error,
    selectedSite,
    setSelectedSite,
    timeRange,
    setTimeRange,
  } = useSiteHealth();

  const {
    handleRunSiteHealthCrawl,
    handleRunSiteAudit,
    handleSubmitForIndexing,
    handleCreateRedirect,
    handleUpdateRedirect,
    handleDeleteRedirect,
    handleTestRedirect,
  } = useSEOActions();

  const [activeTab, setActiveTab] = useState<Tab>('Schema Health');

  const siteDomain = SITE_DOMAINS[selectedSite] || 'elitetravelhackers.com';

  const handleSyncGSC = useCallback(() => {
    toast.info('Syncing GSC data…');
    handleRunSiteHealthCrawl(selectedSite);
  }, [selectedSite, handleRunSiteHealthCrawl]);

  const handleSyncSEOApi = useCallback(() => {
    toast.info('Syncing SEO API data…');
    handleRunSiteHealthCrawl(selectedSite);
  }, [selectedSite, handleRunSiteHealthCrawl]);

  const handleRunFullAudit = useCallback(async () => {
    await handleRunSiteAudit(selectedSite);
  }, [selectedSite, handleRunSiteAudit]);

  const handleSubmitIndexing = useCallback(
    async (urls: string[]) => {
      await handleSubmitForIndexing(selectedSite, urls);
    },
    [selectedSite, handleSubmitForIndexing]
  );

  // Error state
  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-card-foreground">SEO Command Center</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <SiteSelector selectedSite={selectedSite} onSiteChange={setSelectedSite} />
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <div>
              <p className="font-medium">Failed to load SEO data</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {error.message || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-card-foreground">SEO Command Center</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-9 w-[260px]" />
            <Skeleton className="h-8 w-[280px]" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {TABS.map((tab) => (
              <Skeleton key={tab} className="h-8 w-28" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!siteHealth) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-card-foreground">SEO Command Center</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <SiteSelector selectedSite={selectedSite} onSiteChange={setSelectedSite} />
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-[14px]">
            No SEO data available for this site yet.
          </p>
          <p className="text-muted-foreground text-[12px] mt-1">
            Run a site health crawl to get started.
          </p>
          <Button
            className="mt-4 gap-1.5 bg-accent text-accent-foreground"
            onClick={() => handleRunSiteHealthCrawl(selectedSite)}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Run Site Health Crawl
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* TOP BAR */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-card-foreground">SEO Command Center</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <SiteSelector selectedSite={selectedSite} onSiteChange={setSelectedSite} />
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          </div>
        </div>

        {/* Site Health Overview */}
        <SiteHealthOverview
          siteHealth={siteHealth}
          loading={false}
          timeRange={timeRange}
          selectedSite={selectedSite}
          onRunFullAudit={handleRunFullAudit}
          onSyncGSC={handleSyncGSC}
          onSyncSEOApi={handleSyncSEOApi}
          onTabChange={(tab) => setActiveTab(tab as Tab)}
        />
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
              activeTab === tab
                ? 'bg-card text-card-foreground shadow-sm'
                : 'text-muted-foreground hover:text-card-foreground'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'Schema Health' && (
        <SchemaHealthTab schemas={schemas} siteDomain={siteDomain} />
      )}

      {activeTab === 'Indexing Status' && (
        <IndexingStatusTab
          indexing={indexing}
          siteDomain={siteDomain}
          onSubmitForIndexing={handleSubmitIndexing}
        />
      )}

      {activeTab === 'Technical Issues' && (
        <TechnicalIssuesTab issues={issues} siteDomain={siteDomain} />
      )}

      {activeTab === 'Backlinks' && (
        <BacklinksTab backlinks={backlinks} siteHealth={siteHealth} />
      )}

      {activeTab === 'Redirects' && (
        <RedirectsTab
          redirects={redirects}
          selectedSite={selectedSite}
          onCreateRedirect={handleCreateRedirect}
          onUpdateRedirect={handleUpdateRedirect}
          onDeleteRedirect={handleDeleteRedirect}
          onTestRedirect={handleTestRedirect}
        />
      )}
    </div>
  );
}
