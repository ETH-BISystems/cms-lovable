import { Gauge } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '../../analytics/format';

export interface ConsolidationCardProps {
  /**
   * Herfindahl–Hirschman Index over the players' market shares —
   * Σ(marketSharePct²), 0–10,000 scale. Null when no share data exists.
   */
  hhi: number | null;
  loading: boolean;
}

/** Concentration convention: Low < 1,500 · Moderate < 2,500 · High ≥ 2,500. */
function levelOf(hhi: number): { label: string; sentence: string } {
  if (hhi < 1500) return { label: 'Low', sentence: 'a fragmented, competitive market' };
  if (hhi < 2500) return { label: 'Moderate', sentence: 'moderate consolidation within the market' };
  return { label: 'High', sentence: 'a highly consolidated market' };
}

/**
 * MO-01 — Consolidation meter tile (MetricCard idiom): HHI computed from the
 * tracked players' market shares, rendered as a plain-language level with a
 * low↔high gradient track and a positioned thumb. Pure derivation — no
 * additional data beyond `players[].marketSharePct`.
 */
export function ConsolidationCard({ hhi, loading }: ConsolidationCardProps) {
  const level = hhi !== null ? levelOf(hhi) : null;
  const thumbPct = hhi !== null ? Math.min(100, Math.max(0, (hhi / 10000) * 100)) : null;

  return (
    <Card className="group animate-fade-up rounded-2xl border-0 ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgba(3,43,52,0.06),0_12px_32px_-16px_rgba(3,43,52,0.18)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(3,43,52,0.08),0_20px_48px_-16px_rgba(0,147,167,0.35)]">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-muted-foreground">Consolidation</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
            <Gauge className="h-3.5 w-3.5" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <>
            <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tracking-tight">
              {level?.label ?? '—'}
            </p>
            <div className="mt-2.5">
              <div className="relative">
                <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-80" />
                {thumbPct !== null && (
                  <span
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card shadow ring-2 ring-foreground/50"
                    style={{ left: `${thumbPct}%` }}
                    aria-hidden
                  />
                )}
              </div>
              <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {hhi !== null && level
                ? `HHI ${formatNumber(Math.round(hhi))} — ${level.sentence}`
                : 'No market share data yet'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
