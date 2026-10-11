import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { usePositionTracking } from '../hooks/usePositionTracking';
import { useSEOActions } from '../hooks/useSEOActions';
import { TimeRangeSelector } from './shared/TimeRangeSelector';
import { BulkActionBar } from './shared/BulkActionBar';
import { PositionSummaryCards } from './position-tracking/PositionSummaryCards';
import { PositionDistribution } from './position-tracking/PositionDistribution';
import { ChangeStatCards } from './position-tracking/ChangeStatCards';
import { KeywordTable } from './position-tracking/KeywordTable';
import type { PositionTrackingDoc } from '../types';

const TIME_OPTIONS = ['7 days', '30 days', '90 days', '6 months', '12 months', 'Custom'];

export function PositionTrackingPage() {
  const {
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
  } = usePositionTracking();

  const {
    handleRefreshFromPosition,
    handleOptimizeFromAIOverview,
  } = useSEOActions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleRefresh = (kw: PositionTrackingDoc) => {
    handleRefreshFromPosition({ keyword: kw.keyword, ethUrl: kw.ethUrl });
  };

  const handleResearch = (kw: PositionTrackingDoc) => {
    toast.info(`Opening research for "${kw.keyword}"…`);
  };

  const handleViewArticle = (kw: PositionTrackingDoc) => {
    toast.info(`Opening article for "${kw.keyword}"…`);
  };

  const handleExportCSV = () => {
    toast.success(`Exporting ${selectedIds.size} keywords to CSV…`);
    setSelectedIds(new Set());
  };

  const handleRemoveFromTracking = () => {
    toast.success(`Removed ${selectedIds.size} keywords from tracking`);
    setSelectedIds(new Set());
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Position Tracking</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor your keyword rankings and track position changes over time
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Position Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your keyword rankings and track position changes over time
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
          <p className="text-sm text-destructive font-medium">
            Failed to load position tracking data
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
  if (filteredKeywords.length === 0 && filters.positionRange === 'all' && filters.changeType === 'all' && filters.keywordSearch === '' && filters.volumeMin === '') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Position Tracking</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor your keyword rankings and track position changes over time
            </p>
          </div>
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />
        </div>
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No keywords tracked yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add keywords to start monitoring your search rankings.
          </p>
          <button
            onClick={() => toast.info('Add Keywords flow')}
            className="mt-4 px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:bg-accent/90"
          >
            Add Keywords
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
          <h1 className="text-2xl font-bold text-foreground">Position Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor your keyword rankings and track position changes over time
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} options={TIME_OPTIONS} />
      </div>

      {/* Summary Cards */}
      <PositionSummaryCards stats={stats} />

      {/* Position Distribution */}
      <PositionDistribution
        distribution={distribution}
        activeFilter={filters.positionRange}
        onFilterChange={(filter) =>
          setFilters({ ...filters, positionRange: filter })
        }
      />

      {/* Change Stat Cards */}
      <ChangeStatCards
        changeStats={changeStats}
        activeFilter={filters.changeType}
        onFilterChange={(filter) =>
          setFilters({ ...filters, changeType: filter as typeof filters.changeType })
        }
      />

      {/* Keyword Table */}
      <KeywordTable
        keywords={filteredKeywords}
        filters={filters}
        onFiltersChange={setFilters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRefresh={handleRefresh}
        onResearch={handleResearch}
        onViewArticle={handleViewArticle}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        actions={[
          { label: 'Export CSV', onClick: handleExportCSV },
          {
            label: 'Remove from Tracking',
            onClick: handleRemoveFromTracking,
            variant: 'destructive',
          },
        ]}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
