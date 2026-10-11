import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LayoutGrid, List } from 'lucide-react';
import { KeywordStatsBar } from './KeywordStatsBar';
import { AIRecommendations } from './AIRecommendations';
import { ColumnCustomizer, DEFAULT_VISIBILITY } from './ColumnCustomizer';
import type { ColumnVisibility } from './ColumnCustomizer';
import { BulkActionBar } from './BulkActionBar';
import { KeywordTable } from './KeywordTable';
import { KeywordCard } from './KeywordCard';
import type { KeywordOpportunity, TopicCluster, RevenuePotential, ETHStatus } from '../types';

const TOPIC_CLUSTERS: TopicCluster[] = [
  'Chase Cards', 'Amex Cards', 'Capital One', 'Airlines', 'Hotels',
  'Transfer Partners', 'Lounges', 'Strategy', 'Deals', 'Trusted Traveler',
];

interface KeywordOpportunitiesTabProps {
  keywords: KeywordOpportunity[];
  paginatedKeywords: KeywordOpportunity[];
  stats: { total: number; noContent: number; underperforming: number; newThisWeek: number };
  loading: boolean;
  filters: {
    topicCluster: TopicCluster | null;
    kdRange: [number, number];
    minVolume: number;
    revenuePotential: RevenuePotential | null;
    ethStatus: ETHStatus | 'underperforming' | null;
  };
  setFilter: <K extends string>(key: K, value: unknown) => void;
  sort: { column: string; direction: 'asc' | 'desc' };
  setSort: (column: string) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  onKeywordClick: (id: string) => void;
  onResearch: (keyword: KeywordOpportunity) => void;
  onRefresh: (keyword: KeywordOpportunity) => void;
  onExportCsv: (ids: string[]) => void;
  canPerformActions: boolean;
  allKeywords: KeywordOpportunity[];
}

export function KeywordOpportunitiesTab({
  keywords,
  paginatedKeywords,
  stats,
  loading,
  filters,
  setFilter,
  sort,
  setSort,
  pagination,
  onKeywordClick,
  onResearch,
  onRefresh,
  onExportCsv,
  canPerformActions,
  allKeywords,
}: KeywordOpportunitiesTabProps) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnVisibility>(DEFAULT_VISIBILITY);

  return (
    <div className="space-y-4">
      <KeywordStatsBar stats={stats} loading={loading} />

      <AIRecommendations
        keywords={allKeywords}
        onKeywordClick={onKeywordClick}
        onResearch={onResearch}
        canPerformActions={canPerformActions}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.topicCluster ?? 'all'}
          onValueChange={(v) => setFilter('topicCluster', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Topic Cluster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clusters</SelectItem>
            {TOPIC_CLUSTERS.map((tc) => (
              <SelectItem key={tc} value={tc}>{tc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">KD</span>
          <Slider
            value={filters.kdRange}
            min={0}
            max={100}
            step={1}
            onValueChange={(v) => setFilter('kdRange', v as [number, number])}
            className="w-32"
          />
          <span className="text-xs tabular-nums">{filters.kdRange[0]}-{filters.kdRange[1]}</span>
        </div>

        <Input
          type="number"
          placeholder="Min Volume"
          className="w-28"
          value={filters.minVolume || ''}
          onChange={(e) => setFilter('minVolume', Number(e.target.value) || 0)}
        />

        <Select
          value={filters.revenuePotential ?? 'all'}
          onValueChange={(v) => setFilter('revenuePotential', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Revenue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.ethStatus ?? 'all'}
          onValueChange={(v) => setFilter('ethStatus', v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ETH Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="no-content">No ETH Content</SelectItem>
            <SelectItem value="underperforming">ETH Underperforming</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <ColumnCustomizer columns={columns} onChange={setColumns} />
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onExportCsv={() => onExportCsv(selectedIds)}
        onTrack={() => {}}
        onResearchSelected={() => {}}
        canPerformActions={canPerformActions}
      />

      {viewMode === 'table' ? (
        <KeywordTable
          keywords={paginatedKeywords}
          columns={columns}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onKeywordClick={onKeywordClick}
          onResearch={onResearch}
          onRefresh={onRefresh}
          canPerformActions={canPerformActions}
          sort={sort}
          onSort={setSort}
          pagination={pagination}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedKeywords.map((kw) => (
            <KeywordCard
              key={kw.id}
              keyword={kw}
              onClick={() => onKeywordClick(kw.id)}
              onResearch={() => onResearch(kw)}
              onRefresh={() => onRefresh(kw)}
              canPerformActions={canPerformActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
