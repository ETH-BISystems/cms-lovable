import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAIOverviews } from '../hooks/useAIOverviews';
import { useSEOActions } from '../hooks/useSEOActions';
import { TimeRangeSelector } from './shared/TimeRangeSelector';
import { BulkActionBar } from './shared/BulkActionBar';
import { AIOverviewSummaryCards } from './ai-overview/AIOverviewSummaryCards';
import { InsightBanner } from './ai-overview/InsightBanner';
import { AIOverviewTrendChart } from './ai-overview/AIOverviewTrendChart';
import { AIOverviewTable } from './ai-overview/AIOverviewTable';
import type { AIOverviewDoc } from '../types';

const TIME_OPTIONS = ['30 days', '60 days', '90 days', '6 months', 'Custom'];

// Placeholder trend data — in production this would come from a hook or service
const TREND_DATA = [
  { month: 'Oct', aioPercent: 18, ctrImpact: -6 },
  { month: 'Nov', aioPercent: 20, ctrImpact: -6.5 },
  { month: 'Dec', aioPercent: 22, ctrImpact: -7.1 },
  { month: 'Jan', aioPercent: 24, ctrImpact: -7.5 },
  { month: 'Feb', aioPercent: 26, ctrImpact: -7.8 },
  { month: 'Mar', aioPercent: 27.5, ctrImpact: -8.2 },
];

export function AIOverviewTrackerPage() {
  const {
    overviews,
    filteredOverviews,
    stats,
    loading,
    error,
    filters,
    setFilters,
    timeRange,
    setTimeRange,
  } = useAIOverviews();

  const {
    handleOptimizeFromAIOverview,
    handleCreateFromAIOverview,
  } = useSEOActions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleOptimize = (overview: AIOverviewDoc) => {
    handleOptimizeFromAIOverview({ keyword: overview.keyword, id: overview.id });
  };

  const handleAlt = (keyword: string, volume: number) => {
    handleCreateFromAIOverview({ keyword, volume });
  };

  const handleExpand = (overview: AIOverviewDoc) => {
    // Expansion is handled internally by the table
  };

  const handleExportCSV = () => {
    toast.success(`Exporting ${selectedIds.size} keywords to CSV…`);
    setSelectedIds(new Set());
  };

  const handleTrackAlternatives = () => {
    toast.success(`Tracking alternatives for ${selectedIds.size} keywords`);
    setSelectedIds(new Set());
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              AI Overview Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor Google's AI Overviews and their impact on your organic
              click-through rates
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            AI Overview Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor Google's AI Overviews and their impact on your organic
            click-through rates
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
          <p className="text-sm text-destructive font-medium">
            Failed to load AI overview data
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

  // Empty state
  if (
    overviews.length === 0 &&
    filters.hasAIOverview === 'All' &&
    filters.ethCited === 'All' &&
    filters.volumeMin === '' &&
    filters.ctrImpact === 'All'
  ) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              AI Overview Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor Google's AI Overviews and their impact on your organic
              click-through rates
            </p>
          </div>
          <TimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            options={TIME_OPTIONS}
          />
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            No AI overview data yet
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Start tracking keywords to monitor AI Overview presence and impact.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            AI Overview Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor Google's AI Overviews and their impact on your organic
            click-through rates
          </p>
        </div>
        <TimeRangeSelector
          value={timeRange}
          onChange={setTimeRange}
          options={TIME_OPTIONS}
        />
      </div>

      {/* Summary Cards */}
      <AIOverviewSummaryCards stats={stats} totalKeywords={overviews.length} />

      {/* Insight Banner */}
      <InsightBanner
        stats={stats}
        overviews={overviews}
        totalKeywords={overviews.length}
      />

      {/* Trend Chart */}
      <AIOverviewTrendChart data={TREND_DATA} />

      {/* AI Overview Table */}
      <AIOverviewTable
        overviews={filteredOverviews}
        filters={filters}
        onFiltersChange={setFilters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onOptimize={handleOptimize}
        onAlt={handleAlt}
        onExpand={handleExpand}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          { label: 'Export CSV', onClick: handleExportCSV },
          { label: 'Track Alternatives', onClick: handleTrackAlternatives },
        ]}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
