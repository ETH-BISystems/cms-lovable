import { Link } from '@/lib/router-compat';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AiVisibilityJoinRow } from '../../../types/trafficMarket';
import { AI_ENGINE_LABELS } from '../../../types/trafficMarket';
import { ChartCard } from '../../analytics/ChartCard';
import { SERIES_COLORS } from '../../analytics/chartTheme';
import { formatCompact } from '../shared/trafficFormat';

export interface VisibilityTrafficPanelProps {
  /** D6 join rows, already filtered to the selected engines. */
  rows: AiVisibilityJoinRow[];
  loading?: boolean;
}

/** Second series color — pairs against the accent used for visibility. */
const TRAFFIC_COLOR = SERIES_COLORS[1];

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

/**
 * D6 differentiator — "AI Visibility → AI Traffic": per engine, mirrored
 * horizontal bars pairing the AI Visibility mention score (0–100, accent, left)
 * with the actual AI referral traffic share (right), plus monthly visits.
 */
export function VisibilityTrafficPanel({ rows, loading }: VisibilityTrafficPanelProps) {
  return (
    <ChartCard
      title="AI Visibility → AI Traffic"
      description="Who mentions you vs who actually clicks through — each engine's mention share paired with the AI referral traffic it converts into."
      loading={loading}
      skeletonHeight={280}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/keywords/ai-visibility">
            Open AI Visibility
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No visibility-to-traffic data for the selected engines.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_6rem_1fr] items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="flex items-center justify-end gap-1.5 text-right">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Visibility score (0–100)
            </span>
            <span aria-hidden />
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: TRAFFIC_COLOR }} />
              Traffic share · monthly visits
            </span>
          </div>

          {rows.map(row => (
            <div key={row.engine} className="grid grid-cols-[1fr_6rem_1fr] items-center gap-3">
              <div className="flex items-center justify-end gap-2">
                <span className="shrink-0 text-xs font-medium tabular-nums">{Math.round(row.visibilityScore)}</span>
                <div className="flex h-3 w-full max-w-[280px] justify-end overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${clampPct(row.visibilityScore)}%` }}
                  />
                </div>
              </div>

              <span className="truncate text-center text-sm font-medium">{AI_ENGINE_LABELS[row.engine]}</span>

              <div className="flex items-center gap-2">
                <div className="h-3 w-full max-w-[280px] overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${clampPct(row.trafficSharePct)}%`, background: TRAFFIC_COLOR }}
                  />
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {row.trafficSharePct.toFixed(1)}% · {formatCompact(row.monthlyVisits)} visits
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
