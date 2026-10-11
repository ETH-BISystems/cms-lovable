import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ExternalOpen } from '../shared/ExternalOpen';
import type { AiSourceRow } from '../../../types/trafficMarket';
import { AI_ENGINE_LABELS } from '../../../types/trafficMarket';
import { useSortedPagination } from '../../../hooks/useSortedPagination';
import { ChartCard } from '../../analytics/ChartCard';
import { SortableHead } from '../../analytics/SortableHead';
import { exportRowsToCsv } from '../../analytics/exportCsv';
import { SERIES_COLORS } from '../../analytics/chartTheme';
import { DataTablePagination } from '../../shared/DataTablePagination';
import { formatShare } from '../shared/trafficFormat';

export interface AiSourcesTableProps {
  /** Sources already filtered to the selected engines. */
  rows: AiSourceRow[];
  /** Ordered domain set — drives split-bar colors (SERIES_COLORS by index). */
  domains: string[];
  loading?: boolean;
}

/**
 * AIT-03 — sortable "All Sources" table: AI referral source, category badge,
 * per-domain stacked traffic-split bar, group traffic share %, with a category
 * filter and CSV export.
 */
export function AiSourcesTable({ rows, domains, loading }: AiSourcesTableProps) {
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => [...new Set(rows.map(r => r.category))].sort(), [rows]);
  const filtered = useMemo(
    () => (category === 'all' ? rows : rows.filter(r => r.category === category)),
    [rows, category],
  );
  const table = useSortedPagination(filtered, 'groupTrafficSharePct');

  const onExport = () => {
    exportRowsToCsv(
      'ai-traffic-sources.csv',
      filtered.map(r => ({
        source: r.source,
        category: r.category,
        engine: AI_ENGINE_LABELS[r.engine],
        group_traffic_share_pct: r.groupTrafficSharePct,
        ...Object.fromEntries(domains.map(d => [`split_${d}`, r.groupTrafficSplit[d] ?? 0])),
      })),
    );
  };

  return (
    <ChartCard
      title="All Sources"
      description="Every AI referral source across the selected engines, with the traffic split across the domain set"
      loading={loading}
      skeletonHeight={360}
      actions={
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onExport} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {domains.map((domain, i) => (
          <span
            key={domain}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            {domain}
          </span>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label="Source"
              sortKey="source"
              activeKey={table.sortKey}
              direction={table.direction}
              onSort={table.toggleSort}
              className={cn(table.sortKey === 'source' && 'bg-accent/[0.06] text-foreground')}
            />
            <SortableHead
              label="Category"
              sortKey="category"
              activeKey={table.sortKey}
              direction={table.direction}
              onSort={table.toggleSort}
              className={cn('w-40', table.sortKey === 'category' && 'bg-accent/[0.06] text-foreground')}
            />
            <TableHead className="w-52">Group Traffic Split</TableHead>
            <SortableHead
              label="Group Traffic Share"
              sortKey="groupTrafficSharePct"
              activeKey={table.sortKey}
              direction={table.direction}
              onSort={table.toggleSort}
              className={cn(
                'w-44 text-right',
                table.sortKey === 'groupTrafficSharePct' && 'bg-accent/[0.06] text-foreground',
              )}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map(row => (
            <TableRow key={`${row.source}-${row.engine}`}>
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-medium">{row.source}</span>
                  <span className="text-xs text-muted-foreground">{AI_ENGINE_LABELS[row.engine]}</span>
                  {row.source.includes('.') && (
                    <ExternalOpen href={`https://${row.source}`} label={`Open ${row.source} in a new tab`} />
                  )}
                </span>
              </TableCell>
              <TableCell>
                {row.category ? (
                  <Badge variant="secondary" className="font-normal text-muted-foreground">
                    {row.category}
                  </Badge>
                ) : (
                  <span className="text-xs italic text-muted-foreground/70">No category</span>
                )}
              </TableCell>
              <TableCell>
                <div
                  className="flex h-2.5 w-44 overflow-hidden rounded-full bg-muted"
                  title={domains.map(d => `${d}: ${formatShare(row.groupTrafficSplit[d] ?? 0)}`).join(' · ')}
                >
                  {domains.map((d, i) => {
                    const share = row.groupTrafficSplit[d] ?? 0;
                    if (share <= 0) return null;
                    return (
                      <div
                        key={d}
                        className="h-full"
                        style={{ width: `${share * 100}%`, background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      />
                    );
                  })}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.groupTrafficSharePct.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No sources match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Range visibility for large pulls — DataTablePagination shows only totals. */}
      {table.totalItems > 0 && (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          Showing {(table.page - 1) * table.pageSize + 1}–
          {Math.min(table.page * table.pageSize, table.totalItems)} of {table.totalItems} sources
        </p>
      )}

      <DataTablePagination
        page={table.page}
        pageSize={table.pageSize}
        totalPages={table.totalPages}
        totalItems={table.totalItems}
        setPage={table.setPage}
        setPageSize={table.setPageSize}
      />
    </ChartCard>
  );
}
