import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { AIOverviewDoc, AIOverviewFilters } from '../../types';
import { AIAnswerPanel } from './AIAnswerPanel';

interface AIOverviewTableProps {
  overviews: AIOverviewDoc[];
  filters: AIOverviewFilters;
  onFiltersChange: (filters: AIOverviewFilters) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onOptimize: (overview: AIOverviewDoc) => void;
  onAlt: (keyword: string, volume: number) => void;
  onExpand: (overview: AIOverviewDoc) => void;
}

type SortCol = 'ctrImpact' | 'volume';

function posColor(p: number | null) {
  if (p === null) return 'text-muted-foreground';
  if (p <= 10) return 'text-success';
  if (p <= 20) return 'text-warning';
  return 'text-destructive';
}

export function AIOverviewTable({
  overviews,
  filters,
  onFiltersChange,
  selectedIds,
  onSelectionChange,
  onOptimize,
  onAlt,
  onExpand,
}: AIOverviewTableProps) {
  const [sortCol, setSortCol] = useState<SortCol>('ctrImpact');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const sorted = useMemo(() => {
    const rows = [...overviews];
    rows.sort((a, b) => {
      const av = sortCol === 'ctrImpact' ? a.ctrImpact : a.volume;
      const bv = sortCol === 'ctrImpact' ? b.ctrImpact : b.volume;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [overviews, sortCol, sortDir]);

  const paged = sorted.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortCol(col);
      setSortDir(col === 'ctrImpact' ? 'asc' : 'desc');
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            AI Overview
          </label>
          <Select
            value={filters.hasAIOverview}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                hasAIOverview: v as AIOverviewFilters['hasAIOverview'],
              })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Has AI Overview">Has AI Overview</SelectItem>
              <SelectItem value="No AI Overview">No AI Overview</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            ETH Cited
          </label>
          <Select
            value={filters.ethCited}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                ethCited: v as AIOverviewFilters['ethCited'],
              })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Yes">Cited</SelectItem>
              <SelectItem value="No">Not Cited</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Volume Min
          </label>
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
          <label className="text-xs text-muted-foreground block mb-1">
            CTR Impact
          </label>
          <Select
            value={filters.ctrImpact}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                ctrImpact: v as AIOverviewFilters['ctrImpact'],
              })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="High">High (&gt;15%)</SelectItem>
              <SelectItem value="Medium">Medium (5-15%)</SelectItem>
              <SelectItem value="Low">Low (&lt;5%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-3 w-8">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="px-2 py-3 w-8" />
                <th className="px-3 py-3 text-left font-medium text-muted-foreground min-w-[180px]">
                  KEYWORD
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
                  AI OVERVIEW
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ETH CITED
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  TYPE
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('ctrImpact')}
                >
                  CTR IMPACT{' '}
                  {sortCol === 'ctrImpact'
                    ? sortDir === 'asc'
                      ? '↑'
                      : '↓'
                    : ''}
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  POSITION
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ACTUAL CTR
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  TREND
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((k, i) => (
                <AIOverviewRow
                  key={k.id}
                  overview={k}
                  index={i}
                  isExpanded={expandedRow === k.id}
                  isSelected={selectedIds.has(k.id)}
                  openPopoverId={openPopoverId}
                  onToggleExpand={() =>
                    setExpandedRow(expandedRow === k.id ? null : k.id)
                  }
                  onToggleSelect={() => toggleSelect(k.id)}
                  onSetPopover={setOpenPopoverId}
                  onOptimize={() => onOptimize(k)}
                  onAlt={(kw, vol) => onAlt(kw, vol)}
                />
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
                    className="px-3 py-8 text-center text-muted-foreground text-sm"
                  >
                    No AI overview data matches the current filters.
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

/* ── Individual row ───────────────────────────────────────────────────── */

interface AIOverviewRowProps {
  overview: AIOverviewDoc;
  index: number;
  isExpanded: boolean;
  isSelected: boolean;
  openPopoverId: string | null;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onSetPopover: (id: string | null) => void;
  onOptimize: () => void;
  onAlt: (keyword: string, volume: number) => void;
}

function AIOverviewRow({
  overview: k,
  index: i,
  isExpanded,
  isSelected,
  openPopoverId,
  onToggleExpand,
  onToggleSelect,
  onSetPopover,
  onOptimize,
  onAlt,
}: AIOverviewRowProps) {
  return (
    <>
      <tr
        className={cn(
          'border-b border-border hover:bg-muted/30',
          i % 2 === 1 ? 'bg-muted/20' : ''
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
        <td className="px-2 py-3">
          {k.hasAIOverview && k.aiAnswer && (
            <button
              onClick={onToggleExpand}
              className="text-muted-foreground hover:text-accent transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </td>
        <td className="px-3 py-3 font-semibold text-foreground">{k.keyword}</td>
        <td className="px-3 py-3 text-foreground">
          {k.volume.toLocaleString()}
        </td>
        <td className="px-3 py-3">
          {k.hasAIOverview ? (
            <Badge className="bg-accent/15 text-accent border-accent/30 text-xs">
              Yes
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              No
            </Badge>
          )}
        </td>
        <td className="px-3 py-3">
          {k.ethCited === 'Yes' && (
            <span className="text-success font-bold">✓ Yes</span>
          )}
          {k.ethCited === 'Partial' && (
            <span className="text-warning font-bold">~ Partial</span>
          )}
          {k.ethCited === 'No' && (
            <span className="text-destructive font-bold">✗ No</span>
          )}
          {k.ethCited === 'N/A' && (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-3">
          {k.aiOverviewType ? (
            <Badge variant="outline" className="text-xs">
              {k.aiOverviewType}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td
          className={cn(
            'px-3 py-3 font-bold',
            Math.abs(k.ctrImpact) > 15
              ? 'text-destructive'
              : Math.abs(k.ctrImpact) >= 5
                ? 'text-warning'
                : k.ctrImpact === 0
                  ? 'text-muted-foreground'
                  : 'text-success'
          )}
        >
          {k.ctrImpact === 0 ? '0%' : `${k.ctrImpact}%`}
        </td>
        <td className={cn('px-3 py-3 font-bold', posColor(k.position))}>
          {k.position ? `#${k.position}` : '—'}
        </td>
        <td className="px-3 py-3 text-foreground">
          {k.actualCtr != null ? `${k.actualCtr}%` : '—'}
        </td>
        <td className="px-3 py-3">
          {k.trend === 'New' && (
            <Badge className="bg-warning/15 text-warning border-warning/30 text-xs">
              New
            </Badge>
          )}
          {k.trend === 'Stable' && (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              Stable
            </Badge>
          )}
          {k.trend === 'Removed' && (
            <Badge className="bg-success/15 text-success border-success/30 text-xs">
              Removed
            </Badge>
          )}
          {!k.trend && <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-3">
          {k.hasAIOverview && (
            <div className="flex gap-1">
              {/* Optimize popover */}
              <Popover
                open={openPopoverId === `opt-${k.id}`}
                onOpenChange={(open) =>
                  onSetPopover(open ? `opt-${k.id}` : null)
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-accent border-accent hover:bg-accent/10 text-xs h-7"
                  >
                    Optimize
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Optimization Tips
                  </p>
                  <ul className="space-y-1.5">
                    {k.optimizationTips.map((tip, j) => (
                      <li
                        key={j}
                        className="text-xs text-muted-foreground flex gap-1.5"
                      >
                        <span className="text-accent shrink-0">•</span>
                        {tip}
                      </li>
                    ))}
                    {k.optimizationTips.length === 0 && (
                      <li className="text-xs text-muted-foreground">
                        No tips available
                      </li>
                    )}
                  </ul>
                  <Separator className="my-2" />
                  <Button
                    size="sm"
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7"
                    onClick={() => {
                      onSetPopover(null);
                      onOptimize();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Continue to
                    Refresh...
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Alt keywords popover */}
              <Popover
                open={openPopoverId === `alt-${k.id}`}
                onOpenChange={(open) =>
                  onSetPopover(open ? `alt-${k.id}` : null)
                }
              >
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground text-xs h-7"
                  >
                    Alt
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Keywords without AI Overviews
                  </p>
                  <div className="space-y-2">
                    {k.alternativeKeywords.map((alt, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="text-foreground font-medium">
                            {alt.keyword}
                          </p>
                          <p className="text-muted-foreground">
                            Vol: {alt.volume.toLocaleString()} · KD: {alt.kd}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            onSetPopover(null);
                            onAlt(alt.keyword, alt.volume);
                          }}
                          className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-6 px-2"
                        >
                          Research
                        </Button>
                      </div>
                    ))}
                    {k.alternativeKeywords.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No alternatives found
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded AI Answer Panel */}
      {isExpanded && k.aiAnswer && (
        <tr>
          <td colSpan={12} className="p-0">
            <AIAnswerPanel overview={k} />
          </td>
        </tr>
      )}
    </>
  );
}
