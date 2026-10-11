import { useCallback, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  SERIES_COLORS,
} from '../../analytics/chartTheme';
import { formatCompact, formatMonthLabel, formatNumber } from '../../analytics/format';
import type { DomainSeries } from '../../../types/trafficMarket';

/** True when the axis' final month is the current (still in progress) month. */
export function isPartialLastMonth(months: string[]): boolean {
  if (months.length < 2) return false;
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return months[months.length - 1] === current;
}

export interface MultiDomainTrendChartProps {
  /** Shared YYYY-MM axis, ascending; series values align by index. */
  months: string[];
  series: DomainSeries[];
  /**
   * Series color per domain — defaults to SERIES_COLORS by series index.
   * Pass the page-level color map to keep colors consistent across sections.
   */
  colorOf?: (domain: string, seriesIndex: number) => string;
  /** Chart body height in px (the legend chips add their own height). */
  height?: number;
  /** Thinner strokes + wider tick gaps for the small side-by-side charts. */
  compact?: boolean;
  /** Y-axis tick formatter (default compact figures). */
  axisFormatter?: (value: number) => string;
  /** Tooltip value formatter (default full numbers). */
  tooltipFormatter?: (value: number) => string;
  yAxisWidth?: number;
  /** Adds a dashed summed line across all series (Market Overview total). */
  totalLine?: { name: string; color?: string };
  /** Interactive checkbox-chip legend above the chart (default on). */
  showLegend?: boolean;
  emptyMessage?: string;
}

/**
 * The house multi-domain monthly line chart, shared by every Traffic & Market
 * trend surface: dot markers on monthly points, checkbox-chip legend that
 * toggles series on/off, and a subtle fade over the final month when it is
 * the current (partial) month. Domain names contain dots — recharts would
 * treat them as nested-path dataKeys — so rows are keyed by series index
 * (`d0`, `d1`, …) and each Line carries the real domain via `name`.
 */
export function MultiDomainTrendChart({
  months,
  series,
  colorOf,
  height = 300,
  compact = false,
  axisFormatter = formatCompact,
  tooltipFormatter = formatNumber,
  yAxisWidth = 44,
  totalLine,
  showLegend = true,
  emptyMessage = 'No trend data available.',
}: MultiDomainTrendChartProps) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((name: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const rows = useMemo(
    () =>
      months.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month };
        let total = 0;
        series.forEach((s, seriesIndex) => {
          const value = s.values[monthIndex] ?? 0;
          row[`d${seriesIndex}`] = value;
          total += value;
        });
        if (totalLine) row.total = total;
        return row;
      }),
    [months, series, totalLine],
  );

  const seriesColor = useCallback(
    (domain: string, seriesIndex: number) =>
      colorOf ? colorOf(domain, seriesIndex) : SERIES_COLORS[seriesIndex % SERIES_COLORS.length],
    [colorOf],
  );

  if (months.length === 0 || series.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const partial = isPartialLastMonth(months);
  // Per-point dots stay legible up to ~13 points; long history pulls drop them.
  const showDots = months.length <= 13;
  const dotRadius = compact ? 2 : 2.5;

  const legendItems: Array<{ name: string; color: string }> = [
    ...series.map((s, i) => ({ name: s.domain, color: seriesColor(s.domain, i) })),
    ...(totalLine ? [{ name: totalLine.name, color: totalLine.color ?? '#94a3b8' }] : []),
  ];

  return (
    <div>
      {showLegend && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {legendItems.map(item => {
            const active = !hidden.has(item.name);
            return (
              <button
                key={item.name}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(item.name)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
                  active
                    ? 'bg-muted text-foreground ring-black/[0.06]'
                    : 'text-muted-foreground/60 ring-black/[0.05] hover:text-foreground',
                )}
              >
                <span
                  className="flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] ring-1 ring-black/[0.08] transition-colors"
                  style={active ? { background: item.color } : undefined}
                  aria-hidden
                >
                  {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
                </span>
                {item.name}
              </button>
            );
          })}
          {partial && (
            <span className="ml-1 text-[11px] text-muted-foreground/80">Final month is partial</span>
          )}
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              tick={CHART_AXIS_TICK}
              stroke={CHART_AXIS_STROKE}
              minTickGap={compact ? 24 : 12}
            />
            <YAxis
              width={yAxisWidth}
              tick={CHART_AXIS_TICK}
              stroke={CHART_AXIS_STROKE}
              tickFormatter={(value: number) => axisFormatter(value)}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelFormatter={formatMonthLabel}
              formatter={(value: number, name: string) => [tooltipFormatter(value), name]}
            />
            {series.map((s, i) => {
              const color = seriesColor(s.domain, i);
              return (
                <Line
                  key={s.domain}
                  type="monotone"
                  dataKey={`d${i}`}
                  name={s.domain}
                  stroke={color}
                  strokeWidth={compact ? 1.8 : 2.2}
                  dot={showDots ? { r: dotRadius, fill: color, strokeWidth: 0 } : false}
                  activeDot={{ r: 3.5 }}
                  hide={hidden.has(s.domain)}
                />
              );
            })}
            {totalLine && (
              <Line
                type="monotone"
                dataKey="total"
                name={totalLine.name}
                stroke={totalLine.color ?? '#94a3b8'}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                hide={hidden.has(totalLine.name)}
              />
            )}
            {/* Painted after the lines: a translucent card-tone wash that fades
                the final (partial) month segment of every visible series. */}
            {partial && (
              <ReferenceArea
                x1={months[months.length - 2]}
                x2={months[months.length - 1]}
                fill="hsl(var(--card))"
                fillOpacity={0.55}
                strokeOpacity={0}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
