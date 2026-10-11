import { AlertCircle, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SERIES_COLORS } from '../../analytics/chartTheme';
import { formatDeltaPct, formatShare } from '../shared/trafficFormat';
import type { DomainSeries } from '../../../types/trafficMarket';

/**
 * Page-local building blocks shared by the Traffic Analytics sections
 * (TA-01…TA-04). Nothing here is exported outside the page.
 */

/**
 * Stable series color per domain: index into SERIES_COLORS by the domain's
 * position in the page-level ordered set so every section renders each
 * domain in the same color; falls back to the local series index.
 */
export function domainColor(domain: string, fallbackIndex: number, orderedDomains: string[]): string {
  const i = orderedDomains.indexOf(domain);
  return SERIES_COLORS[(i >= 0 ? i : fallbackIndex) % SERIES_COLORS.length];
}

/**
 * Rows for a multi-domain recharts chart. Domain names contain dots and
 * recharts treats dotted dataKeys as deep paths, so series are keyed
 * d0/d1/… — the display name goes on the Line/Bar `name` prop instead.
 */
export function buildTrendRows(months: string[], series: DomainSeries[]): Array<Record<string, string | number>> {
  return months.map((month, monthIndex) => {
    const row: Record<string, string | number> = { month };
    series.forEach((s, seriesIndex) => {
      row[`d${seriesIndex}`] = s.values[monthIndex] ?? 0;
    });
    return row;
  });
}

interface DeltaBadgeProps {
  /** Period-over-period delta in percent; null renders an em dash. */
  value: number | null;
  /** Invert outcome colors (bounce rate: an increase is bad → red). */
  invert?: boolean;
}

/** Signed delta with a green/red directional arrow. */
export function DeltaBadge({ value, invert = false }: DeltaBadgeProps) {
  if (value === null || value === undefined || value === 0) {
    return <span className="text-xs tabular-nums text-muted-foreground">{formatDeltaPct(value)}</span>;
  }
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        good ? 'text-green-600' : 'text-red-600',
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {formatDeltaPct(value)}
    </span>
  );
}

/** Small two-segment desktop/mobile split bar for the summary table. */
export function DeviceSplitBar({ desktop, mobile }: { desktop: number; mobile: number }) {
  const total = desktop + mobile;
  const desktopPct = total > 0 ? (desktop / total) * 100 : 0;
  return (
    <div className="min-w-28">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-accent" style={{ width: `${desktopPct}%` }} />
        <div className="bg-indigo-400" style={{ width: `${100 - desktopPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>D {formatShare(desktop)}</span>
        <span>M {formatShare(mobile)}</span>
      </div>
    </div>
  );
}

/** Inline error block rendered inside a section's ChartCard (never full-page). */
export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

/** Centered empty message inside a section card. */
export function InlineEmpty({ message }: { message: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{message}</p>;
}
