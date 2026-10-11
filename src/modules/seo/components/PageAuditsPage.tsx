import { useState } from 'react';
import { RefreshCw, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usePageAudits } from '../hooks/usePageAudits';
import { useAuditRuns } from '../hooks/useAuditRuns';
import { useAuditSchedule } from '../hooks/useAuditSchedule';
import { useSEOActions } from '../hooks/useSEOActions';
import { AuditSummaryCards } from './page-audits/AuditSummaryCards';
import { ScoreDistribution } from './page-audits/ScoreDistribution';
import { AuditResultsTab } from './page-audits/AuditResultsTab';
import { AuditHistoryTab } from './page-audits/AuditHistoryTab';
import { ScheduleConfigModal } from './page-audits/ScheduleConfigModal';
import type { PageAuditDoc } from '../types';

export function PageAuditsPage() {
  const {
    filteredAudits,
    stats,
    scoreDistribution,
    loading: auditsLoading,
    error: auditsError,
    filters,
    setFilters,
  } = usePageAudits();

  const {
    filteredRuns,
    loading: runsLoading,
    filters: historyFilters,
    setFilters: setHistoryFilters,
  } = useAuditRuns();

  const { config, saveConfig } = useAuditSchedule();
  const { handleAuditPage, handleRunSiteAudit } = useSEOActions();

  const [activeTab, setActiveTab] = useState('results');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  const loading = auditsLoading || runsLoading;
  const error = auditsError;

  const runFullAudit = async () => {
    setAuditing(true);
    setAuditProgress(0);
    try {
      await handleRunSiteAudit('eth');
      // Simulate progress
      const iv = setInterval(() => {
        setAuditProgress((p) => {
          if (p >= 100) {
            clearInterval(iv);
            setAuditing(false);
            return 100;
          }
          return p + 8;
        });
      }, 200);
    } catch {
      setAuditing(false);
    }
  };

  const handleAuditSingle = async (articleId: string) => {
    try {
      await handleAuditPage('eth', articleId);
      toast.success('Audit complete — results updated');
    } catch {
      // Error handled by useSEOActions
    }
  };

  const handleViewArticle = (audit: PageAuditDoc) => {
    toast.info(`Opening article "${audit.title}"…`);
  };

  const handleViewResults = (runDate: string) => {
    toast.info(`Showing results from audit on ${runDate}`);
    setActiveTab('results');
  };

  // Schedule label
  const schedLabel = config?.enabled
    ? `Auto-audits: ${
        config.frequency === 'daily'
          ? 'Daily'
          : config.frequency === 'weekly'
            ? 'Weekly'
            : config.frequency === 'biweekly'
              ? 'Bi-weekly'
              : 'Monthly'
      } at ${config.timeOfDay}`
    : 'Auto-audits: Off';

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Page Audits</h1>
            <p className="text-sm text-muted-foreground mt-1">
              On-page SEO health scores for every published article
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Page Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            On-page SEO health scores for every published article
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
          <p className="text-sm text-destructive font-medium">
            Failed to load audit data
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-accent hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Page Audits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            On-page SEO health scores for every published article — find and fix
            issues fast
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setScheduleOpen(true)}
            className="text-accent border-accent hover:bg-accent/10"
          >
            <CalendarClock className="w-4 h-4 mr-2" />
            Schedule Audits
          </Button>
          <Button
            onClick={runFullAudit}
            disabled={auditing}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${auditing ? 'animate-spin' : ''}`}
            />
            {auditing ? 'Auditing...' : 'Run Full Audit'}
          </Button>
        </div>
      </div>

      {/* Audit Schedule Status Bar */}
      <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>🔄 {schedLabel}</span>
        <span>Next: Scheduled</span>
        <span>Last: Recently by System (automated)</span>
        <button
          onClick={() => setScheduleOpen(true)}
          className="text-accent hover:underline font-medium"
        >
          Edit Schedule
        </button>
      </div>

      {/* Audit progress */}
      {auditing && (
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-foreground mb-2">
            Auditing articles... {Math.round(auditProgress)}%
          </p>
          <Progress value={auditProgress} className="h-2" />
        </div>
      )}

      {/* Summary Cards */}
      <AuditSummaryCards
        stats={stats}
        onFilterCritical={() =>
          setFilters({ ...filters, scoreRange: 'below-60' })
        }
        onFilter90Plus={() =>
          setFilters({ ...filters, scoreRange: '90-100' })
        }
      />

      {/* Score Distribution */}
      <ScoreDistribution
        distribution={scoreDistribution}
        activeFilter={filters.scoreRange}
        onFilterChange={(filter) =>
          setFilters({ ...filters, scoreRange: filter })
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="results">Audit Results</TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          <AuditResultsTab
            audits={filteredAudits}
            filters={filters}
            onFiltersChange={setFilters}
            onAuditPage={handleAuditSingle}
            onRunFullAudit={runFullAudit}
            onViewArticle={handleViewArticle}
            auditing={auditing}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <AuditHistoryTab
            runs={filteredRuns}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            onViewResults={handleViewResults}
          />
        </TabsContent>
      </Tabs>

      {/* Schedule Config Modal */}
      <ScheduleConfigModal
        config={config}
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSave={async (cfg) => {
          try {
            await saveConfig(cfg);
            toast.success('Audit schedule saved successfully');
          } catch {
            toast.error('Failed to save audit schedule');
          }
        }}
      />
    </div>
  );
}
