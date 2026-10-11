import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChartCard } from '../../analytics/ChartCard';
import { SortableHead } from '../../analytics/SortableHead';
import { exportRowsToCsv } from '../../analytics/exportCsv';
import { DataTablePagination } from '../../shared/DataTablePagination';
import { ExternalOpen } from '../shared/ExternalOpen';
import { useSortedPagination } from '../../../hooks/useSortedPagination';
import {
  TRAFFIC_CHANNEL_LABELS,
  type MarketPlayerRow,
  type TrafficChannel,
} from '../../../types/trafficMarket';
import { formatCompact } from '../shared/trafficFormat';
import { SignedDelta } from './SignedDelta';

interface MarketPlayersTableProps {
  players: MarketPlayerRow[];
  /** Canonical domain → SERIES_COLORS color, shared across all page sections. */
  colorOf: (domain: string) => string;
  loading: boolean;
}

/** Canonical channel column order — the TrafficChannel union order. */
const CHANNEL_ORDER = Object.keys(TRAFFIC_CHANNEL_LABELS) as TrafficChannel[];

/** Player row flattened with `ch_{channel}` visit fields so channel columns sort. */
type PlayerSortRow = MarketPlayerRow & Record<string, unknown>;

/**
 * MO-03 — Market Players: every tracked domain with market share, visits, and
 * one column per traffic channel present in the response. Sortable on every
 * column, CSV-exportable, and horizontally scrollable.
 */
export function MarketPlayersTable({ players, colorOf, loading }: MarketPlayersTableProps) {
  const channels = useMemo(
    () => CHANNEL_ORDER.filter((channel) => players.some((p) => p.channels[channel] !== undefined)),
    [players],
  );

  const rows = useMemo(
    () =>
      players.map((player) => {
        const row = { ...player } as PlayerSortRow;
        channels.forEach((channel) => {
          row[`ch_${channel}`] = player.channels[channel]?.visits ?? null;
        });
        return row;
      }),
    [players, channels],
  );

  const table = useSortedPagination(rows, 'visits');
  const head = (label: string, key: string, className?: string) => (
    <SortableHead
      key={key}
      label={label}
      sortKey={key}
      activeKey={table.sortKey}
      direction={table.direction}
      onSort={table.toggleSort}
      className={cn(className, table.sortKey === key && 'bg-accent/[0.06] text-foreground')}
    />
  );

  const onExport = () => {
    exportRowsToCsv(
      'market-players.csv',
      players.map((player) => {
        const row: Record<string, string | number | null> = {
          domain: player.domain,
          'market share %': player.marketSharePct,
          visits: player.visits,
          'visits diff %': player.visitsDeltaPct,
        };
        channels.forEach((channel) => {
          const entry = player.channels[channel];
          row[`${TRAFFIC_CHANNEL_LABELS[channel]} visits`] = entry?.visits ?? null;
          row[`${TRAFFIC_CHANNEL_LABELS[channel]} diff %`] = entry?.diffPct ?? null;
        });
        return row;
      }),
    );
  };

  return (
    <ChartCard
      title={players.length > 0 ? `Market Players (${players.length})` : 'Market Players'}
      description="All tracked domains with per-channel traffic (latest month vs previous)"
      loading={loading}
      skeletonHeight={420}
      actions={
        <Button variant="outline" size="sm" disabled={players.length === 0} onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          CSV
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              {head('Domain', 'domain')}
              {head('Market Share', 'marketSharePct', 'w-32')}
              {head('Visits', 'visits', 'w-40')}
              {channels.map((channel) =>
                head(TRAFFIC_CHANNEL_LABELS[channel], `ch_${channel}`, 'w-40'),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.map((row) => (
              <TableRow key={row.domain}>
                <TableCell className="whitespace-nowrap font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: colorOf(row.domain) }}
                      aria-hidden
                    />
                    {row.domain}
                    <ExternalOpen href={`https://${row.domain}`} label={`Open ${row.domain} in a new tab`} />
                  </span>
                </TableCell>
                <TableCell className="tabular-nums">{row.marketSharePct.toFixed(1)}%</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {formatCompact(row.visits)}
                  <SignedDelta value={row.visitsDeltaPct} className="ml-1.5 text-[11px]" />
                </TableCell>
                {channels.map((channel) => {
                  const entry = row.channels[channel];
                  return (
                    <TableCell key={channel} className="whitespace-nowrap tabular-nums">
                      {entry ? (
                        <>
                          {formatCompact(entry.visits)}
                          <SignedDelta value={entry.diffPct} className="ml-1.5 text-[11px]" />
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {table.pageRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3 + channels.length}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No market players in the current domain set.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Range visibility for large pulls — DataTablePagination shows only totals. */}
      {table.totalItems > 0 && (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          Showing {(table.page - 1) * table.pageSize + 1}–
          {Math.min(table.page * table.pageSize, table.totalItems)} of {table.totalItems} players
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
