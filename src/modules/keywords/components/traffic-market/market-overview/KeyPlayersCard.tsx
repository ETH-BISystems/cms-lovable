import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartCard } from '../../analytics/ChartCard';
import { ExternalOpen } from '../shared/ExternalOpen';
import type { MarketPlayerRow } from '../../../types/trafficMarket';
import { formatCompact } from '../shared/trafficFormat';
import { SignedDelta } from './SignedDelta';

interface KeyPlayersCardProps {
  players: MarketPlayerRow[];
  /** Canonical domain → SERIES_COLORS color, shared across all page sections. */
  colorOf: (domain: string) => string;
  loading: boolean;
}

/** MO-01 — Key Players: market share, visits, and visits delta per domain. */
export function KeyPlayersCard({ players, colorOf, loading }: KeyPlayersCardProps) {
  return (
    <ChartCard
      title="Key Players"
      description="Top domains by share of the tracked market (latest month)"
      loading={loading}
      skeletonHeight={280}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead className="w-64">Market Share</TableHead>
            <TableHead className="w-32">Visits</TableHead>
            <TableHead className="w-28">Delta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player) => (
            <TableRow key={player.domain}>
              <TableCell className="whitespace-nowrap font-medium">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: colorOf(player.domain) }}
                    aria-hidden
                  />
                  {player.domain}
                  <ExternalOpen href={`https://${player.domain}`} label={`Open ${player.domain} in a new tab`} />
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, Math.max(0, player.marketSharePct))}%` }}
                    />
                  </div>
                  <span className="text-sm tabular-nums">{player.marketSharePct.toFixed(1)}%</span>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{formatCompact(player.visits)}</TableCell>
              <TableCell>
                <SignedDelta value={player.visitsDeltaPct} className="text-sm" />
              </TableCell>
            </TableRow>
          ))}
          {players.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No key players in the current domain set.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ChartCard>
  );
}
