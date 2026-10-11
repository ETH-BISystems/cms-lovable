import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { PositionTrackingDoc, PositionFilters } from '../../types';
import { PositionHistoryChart } from './PositionHistoryChart';
import { SERPHistoryPanel } from './SERPHistoryPanel';

const POSITION_GROUPS = [
  { label: '#1-3', value: '1-3' },
  { label: '#4-10', value: '4-10' },
  { label: '#11-20', value: '11-20' },
  { label: '#21-50', value: '21-50' },
  { label: '#51-100', value: '51-100' },
  { label: 'Not Ranking', value: 'not-ranking' },
];

interface KeywordTableProps {
  keywords: PositionTrackingDoc[];
  filters: PositionFilters;
  onFiltersChange: (filters: PositionFilters) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRefresh: (keyword: PositionTrackingDoc) => void;
  onResearch: (keyword: PositionTrackingDoc) => void;
  onViewArticle: (keyword: PositionTrackingDoc) => void;
}

type SortCol = 'volume' | 'position' | 'change';

function posColor(pos: number | null) {
  if (pos === null) return 'text-muted-foreground';
  if (pos <= 10) return 'text-success';
  if (pos <= 20) return 'text-warning';
  return 'text-destructive';
}

function kdColor(kd: number) {
  if (kd <= 30) return 'bg-success';
  if (kd <= 60) return 'bg-warning';
  return 'bg-destructive';
}

export function KeywordTable({
  keywords,
  filters,
  onFiltersChange,
  selectedIds,
  onSelectionChange,
  onRefresh,
  onResearch,
  onViewArticle,
}: KeywordTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<Record<string, 'position' | 'serp'>>({});
  const [sortCol, setSortCol] = useState<SortCol>('volume');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const sorted = useMemo(() => {
    const rows = [...keywords];
    rows.sort((a, b) => {
      let av: number, bv: number;
      if (sortCol === 'volume') {
        av = a.volume;
        bv = b.volume;
      } else if (sortCol === 'position') {
        av = a.position ?? 999;
        bv = b.position ?? 999;
      } else {
        av = a.positionChange ?? 0;
        bv = b.positionChange ?? 0;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return rows;
  }, [keywords, sortCol, sortDir]);

  const paged = sorted.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === paged.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(paged.map((k) => k.id)));
    }
  };

  const getTab = (kw: string) => expandedTab[kw] || 'position';
  const setTab = (kw: string, tab: 'position' | 'serp') =>
    setExpandedTab((prev) => ({ ...prev, [kw]: tab }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Position</label>
          <Select
            value={filters.positionRange}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, positionRange: v })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {POSITION_GROUPS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Change</label>
          <Select
            value={filters.changeType}
            onValueChange={(v) =>
              onFiltersChange({ ...filters, changeType: v as PositionFilters['changeType'] })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="improved">Improved</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="new">New</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Volume Min</label>
          <Input
            placeholder="e.g. 5000"
            value={filters.volumeMin}
            onChange={(e) =>
              onFiltersChange({ ...filters, volumeMin: e.target.value })
            }
            className="w-28"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Keyword</label>
          <Input
            placeholder="Search..."
            value={filters.keywordSearch}
            onChange={(e) =>
              onFiltersChange({ ...filters, keywordSearch: e.target.value })
            }
            className="w-40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={paged.length > 0 && selectedIds.size === paged.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground min-w-[180px]">
                  KEYWORD
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('position')}
                >
                  POSITION{' '}
                  {sortCol === 'position'
                    ? sortDir === 'desc'
                      ? '↓'
                      : '↑'
                    : ''}
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('change')}
                >
                  CHANGE{' '}
                  {sortCol === 'change'
                    ? sortDir === 'desc'
                      ? '↓'
                      : '↑'
                    : ''}
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  BEST
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('volume')}
                >
                  VOLUME{' '}
                  {sortCol === 'volume'
                    ? sortDir === 'desc'
                      ? '↓'
                      : '↑'
                    : ''}
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  KD
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  INTENT
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ETH URL
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  SERP
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  COMPETITORS
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((k, i) => {
                const isBigMove =
                  k.positionChange !== null && Math.abs(k.positionChange) >= 5;
                const borderClass = isBigMove
                  ? k.positionChange! > 0
                    ? 'border-l-4 border-l-success'
                    : 'border-l-4 border-l-destructive'
                  : '';
                const isExpanded = expandedRow === k.id;
                const currentTab = getTab(k.id);

                return (
                  <KeywordRow
                    key={k.id}
                    keyword={k}
                    index={i}
                    borderClass={borderClass}
                    isBigMove={isBigMove}
                    isExpanded={isExpanded}
                    currentTab={currentTab}
                    isSelected={selectedIds.has(k.id)}
                    onToggleExpand={() =>
                      setExpandedRow(isExpanded ? null : k.id)
                    }
                    onToggleSelect={() => toggleSelect(k.id)}
                    onSetTab={(tab) => setTab(k.id, tab)}
                    onRefresh={() => onRefresh(k)}
                    onResearch={() => onResearch(k)}
                    onViewArticle={() => onViewArticle(k)}
                  />
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-8 text-center text-muted-foreground text-sm"
                  >
                    No keywords match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–
            {Math.min(page * perPage, sorted.length)} of {sorted.length}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Individual row component ─────────────────────────────────────────── */

interface KeywordRowProps {
  keyword: PositionTrackingDoc;
  index: number;
  borderClass: string;
  isBigMove: boolean;
  isExpanded: boolean;
  currentTab: 'position' | 'serp';
  isSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onSetTab: (tab: 'position' | 'serp') => void;
  onRefresh: () => void;
  onResearch: () => void;
  onViewArticle: () => void;
}

function KeywordRow({
  keyword: k,
  index: i,
  borderClass,
  isBigMove,
  isExpanded,
  currentTab,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onSetTab,
  onRefresh,
  onResearch,
  onViewArticle,
}: KeywordRowProps) {
  const intentColor: Record<string, string> = {
    Comm: 'border-blue-400 text-blue-600',
    Info: 'border-green-400 text-green-600',
    Trans: 'border-red-400 text-red-600',
    Navi: 'border-gray-400 text-gray-600',
  };

  return (
    <>
      <tr
        className={cn(
          'border-b border-border hover:bg-muted/30',
          i % 2 === 1 ? 'bg-muted/20' : '',
          borderClass
        )}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="rounded"
          />
        </td>
        <td className="px-3 py-3">
          <button
            onClick={onToggleExpand}
            className="font-semibold text-foreground hover:text-accent text-left inline-flex items-center gap-1"
          >
            {k.keyword}
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </td>
        <td className={cn('px-3 py-3 font-bold', posColor(k.position))}>
          {k.position ? `#${k.position}` : '—'}
        </td>
        <td className="px-3 py-3">
          {k.changeType === 'new' ? (
            <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
              New
            </Badge>
          ) : k.positionChange === null ? (
            <span className="text-muted-foreground">—</span>
          ) : k.positionChange > 0 ? (
            <span
              className={cn('text-success', isBigMove ? 'font-bold' : '')}
            >
              ↑{k.positionChange}
            </span>
          ) : k.positionChange < 0 ? (
            <span
              className={cn('text-destructive', isBigMove ? 'font-bold' : '')}
            >
              ↓{Math.abs(k.positionChange)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-muted-foreground" title={k.bestPositionDate}>
          {k.bestPosition ? `#${k.bestPosition}` : '—'}
        </td>
        <td className="px-3 py-3 text-foreground">
          {k.volume.toLocaleString()}
        </td>
        <td className="px-3 py-3">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full mr-1',
              kdColor(k.kd)
            )}
          />
          {k.kd}
        </td>
        <td className="px-3 py-3">
          <Badge
            variant="outline"
            className={cn('text-xs', intentColor[k.intent] ?? '')}
          >
            {k.intent}
          </Badge>
        </td>
        <td className="px-3 py-3">
          {k.ethUrl ? (
            <button
              onClick={onViewArticle}
              className="text-xs text-accent hover:underline truncate max-w-[120px] block"
            >
              {k.ethUrl}
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-[3px] flex-wrap">
            {k.serpFeatures.map((f) => (
              <span
                key={f}
                className="text-[10px] font-semibold uppercase rounded-lg px-1.5 py-0.5"
                style={{
                  background: 'hsl(213 93% 95%)',
                  color: 'hsl(217 91% 60%)',
                }}
              >
                {f}
              </span>
            ))}
            {k.serpFeatures.length === 0 && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1 flex-wrap max-w-[160px]">
            {(() => {
              const show =
                k.competitors.length > 3
                  ? k.competitors.slice(0, 2)
                  : k.competitors;
              const overflow =
                k.competitors.length > 3 ? k.competitors.length - 2 : 0;
              return (
                <>
                  {show.map((c) => (
                    <span
                      key={c.name}
                      className="text-[11px] font-medium rounded-[10px] px-2 py-0.5 bg-muted text-foreground"
                    >
                      {c.name} #{c.position}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span
                      className="text-[11px] font-medium rounded-[10px] px-2 py-0.5 bg-muted text-foreground cursor-default"
                      title={k.competitors
                        .slice(2)
                        .map((c) => `${c.name} #${c.position}`)
                        .join(', ')}
                    >
                      +{overflow}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        </td>
        <td className="px-3 py-3">
          {k.ethUrl ? (
            <button
              onClick={onRefresh}
              className="text-xs font-medium rounded-full border border-accent text-accent px-3 py-1 hover:bg-accent/10"
            >
              Refresh
            </button>
          ) : (
            <button
              onClick={onResearch}
              className="text-xs font-medium rounded-full bg-accent text-accent-foreground px-3 py-1 hover:bg-accent/90"
            >
              Research
            </button>
          )}
        </td>
      </tr>

      {/* Expanded row */}
      {isExpanded &&
        (k.positionHistory.length > 0 || k.serpSnapshots.length > 0) && (
          <tr className="bg-muted/20">
            <td colSpan={12} className="px-6 py-4">
              {/* Tab toggle */}
              <div className="flex gap-1 mb-3 bg-muted rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => onSetTab('position')}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    currentTab === 'position'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Position History
                </button>
                {k.serpSnapshots.length > 0 && (
                  <button
                    onClick={() => onSetTab('serp')}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium transition-colors',
                      currentTab === 'serp'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    SERP History
                  </button>
                )}
              </div>

              {currentTab === 'position' && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Position History — {k.keyword}
                  </p>
                  <PositionHistoryChart history={k.positionHistory} />
                </div>
              )}

              {currentTab === 'serp' && k.serpSnapshots.length > 0 && (
                <SERPHistoryPanel snapshots={k.serpSnapshots} />
              )}
            </td>
          </tr>
        )}
    </>
  );
}
