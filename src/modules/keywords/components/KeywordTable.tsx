import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { OpportunityBadge } from './shared/OpportunityBadge';
import { RevenuePill } from './shared/RevenuePill';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { MiniSparkline } from './shared/MiniSparkline';
import { DataTablePagination } from './shared/DataTablePagination';
import type { ColumnVisibility } from './ColumnCustomizer';
import type { KeywordOpportunity, SortState } from '../types';

interface KeywordTableProps {
  keywords: KeywordOpportunity[];
  columns: ColumnVisibility;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onKeywordClick: (id: string) => void;
  onResearch: (keyword: KeywordOpportunity) => void;
  onRefresh: (keyword: KeywordOpportunity) => void;
  canPerformActions: boolean;
  sort: SortState;
  onSort: (column: string) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
}

export function KeywordTable({
  keywords,
  columns,
  selectedIds,
  onSelectionChange,
  onKeywordClick,
  onResearch,
  onRefresh,
  canPerformActions,
  sort,
  onSort,
  pagination,
}: KeywordTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const allSelected = keywords.length > 0 && keywords.every((kw) => selectedIds.includes(kw.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(keywords.map((kw) => kw.id));
    }
  };

  const toggleSelect = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sort.column === column && (
          <span className="text-xs">{sort.direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </TableHead>
              <TableHead>Keyword</TableHead>
              {columns.sparkline && <TableHead>Trend</TableHead>}
              {columns.volume && <SortableHeader column="searchVolume">Volume</SortableHeader>}
              {columns.kd && <SortableHeader column="kd">KD</SortableHeader>}
              {columns.cpc && <SortableHeader column="cpc">CPC</SortableHeader>}
              {columns.intent && <SortableHeader column="intent">Intent</SortableHeader>}
              {columns.revenue && <SortableHeader column="revenuePotential">Revenue</SortableHeader>}
              {columns.score && <SortableHeader column="opportunityScore">Score</SortableHeader>}
              {columns.gap && <SortableHeader column="contentGapScore">Gap</SortableHeader>}
              {columns.serpFeatures && <TableHead>SERP</TableHead>}
              {columns.backlinks && <SortableHeader column="backlinksToRank">Backlinks</SortableHeader>}
              {columns.competitors && <TableHead>Competitors</TableHead>}
              {columns.ethStatus && <TableHead>ETH Status</TableHead>}
              {columns.format && <TableHead>Format</TableHead>}
              {canPerformActions && <TableHead className="w-24">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                  No keywords match your filters
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((kw) => (
                <>
                  <TableRow
                    key={kw.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onKeywordClick(kw.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(kw.id)}
                        onCheckedChange={() => toggleSelect(kw.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{kw.keyword}</TableCell>
                    {columns.sparkline && (
                      <TableCell><MiniSparkline data={kw.monthlyTrend} /></TableCell>
                    )}
                    {columns.volume && (
                      <TableCell className="tabular-nums">{kw.searchVolume.toLocaleString()}</TableCell>
                    )}
                    {columns.kd && <TableCell><KDBar kd={kw.kd} /></TableCell>}
                    {columns.cpc && (
                      <TableCell><CpcTrendIndicator cpc={kw.cpc} trend={kw.cpcTrend} /></TableCell>
                    )}
                    {columns.intent && <TableCell><IntentBadge intent={kw.intent} /></TableCell>}
                    {columns.revenue && <TableCell><RevenuePill revenue={kw.revenuePotential} /></TableCell>}
                    {columns.score && <TableCell><OpportunityBadge score={kw.opportunityScore} /></TableCell>}
                    {columns.gap && (
                      <TableCell className="tabular-nums">{kw.contentGapScore}</TableCell>
                    )}
                    {columns.serpFeatures && (
                      <TableCell><SerpFeaturePills features={kw.serpFeatures} /></TableCell>
                    )}
                    {columns.backlinks && (
                      <TableCell className="tabular-nums">{kw.backlinksToRank}</TableCell>
                    )}
                    {columns.competitors && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => toggleExpand(kw.id)}
                        >
                          {kw.competitors.length}
                          {expandedRows.has(kw.id) ? (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronRight className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                    {columns.ethStatus && (
                      <TableCell>
                        <Badge variant={kw.ethStatus === 'ranking' ? 'default' : 'secondary'}>
                          {kw.ethStatus === 'ranking'
                            ? `#${kw.ethRankPosition}`
                            : 'No Content'}
                        </Badge>
                      </TableCell>
                    )}
                    {columns.format && (
                      <TableCell className="text-xs">{kw.format}</TableCell>
                    )}
                    {canPerformActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {kw.ethStatus === 'no-content' ? (
                          <Button size="sm" variant="outline" onClick={() => onResearch(kw)}>
                            Research
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => onRefresh(kw)}>
                            Refresh
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                  {expandedRows.has(kw.id) && columns.competitors && (
                    <TableRow key={`${kw.id}-expanded`}>
                      <TableCell colSpan={20} className="bg-muted/30 py-2 px-8">
                        <div className="space-y-1">
                          {kw.competitors.map((c) => (
                            <div key={c.site} className="flex items-center gap-4 text-sm">
                              <span className="font-medium w-40 truncate">{c.site}</span>
                              <Badge variant="outline" className="tabular-nums">#{c.position}</Badge>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination {...pagination} />
    </div>
  );
}
