import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { formatCompact, formatNumber } from './format';
import { CHART_TOOLTIP_STYLE } from './chartTheme';

/**
 * Shared data-viz primitives for the analytics tables — the SEMRush feel:
 * data is colored and proportional, not just printed.
 */

/** Colored Google-position chip: 1–3 green, 4–10 teal, 11–20 amber, 21+ neutral. */
export function PositionChip({ position }: { position: number | null | undefined }) {
  if (!position || position <= 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const tone =
    position <= 3 ? 'bg-green-100 text-green-800 ring-green-200'
    : position <= 10 ? 'bg-accent/10 text-accent ring-accent/20'
    : position <= 20 ? 'bg-amber-100 text-amber-800 ring-amber-200'
    : 'bg-muted text-muted-foreground ring-border';
  return (
    <span className={cn('inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ring-1', tone)}>
      {position}
    </span>
  );
}

interface InlineBarProps {
  value: number;
  /** Largest value in the column — bar widths are proportional to it. */
  max: number;
  /** Formatted label; defaults to compact number. */
  label?: string;
  className?: string;
}

/** Number with a proportional bar behind it — makes magnitude scannable. */
export function InlineBar({ value, max, label, className }: InlineBarProps) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('relative min-w-20 overflow-hidden rounded-md', className)}>
      <div className="absolute inset-y-0 left-0 rounded-md bg-accent/15" style={{ width: `${pct}%` }} />
      <span className="relative block px-2 py-0.5 text-right text-xs font-medium tabular-nums">
        {label ?? formatCompact(value)}
      </span>
    </div>
  );
}

/** Percentage share bar with label, for traffic-share style columns. */
export function ShareBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{clamped.toFixed(1)}%</span>
    </div>
  );
}

/**
 * SVG gradient defs for recharts fills. Render once inside a chart:
 *   <defs><ChartGradient id="kwAccent" /></defs>
 * then use fill="url(#kwAccent)".
 */
export function ChartGradient({ id, color = 'hsl(188, 100%, 33%)' }: { id: string; color?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.85} />
      <stop offset="100%" stopColor={color} stopOpacity={0.25} />
    </linearGradient>
  );
}

/** Softer variant for area fills under lines. */
export function AreaGradient({ id, color = 'hsl(188, 100%, 33%)' }: { id: string; color?: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.35} />
      <stop offset="100%" stopColor={color} stopOpacity={0.02} />
    </linearGradient>
  );
}

export const INTENT_COLORS: Record<string, string> = {
  informational: '#3b82f6',
  commercial: '#8b5cf6',
  transactional: '#22c55e',
  navigational: '#94a3b8',
  unknown: '#cbd5e1',
};

export interface IntentSlice {
  intent: string;
  count: number;
  volume: number;
}

/** SEMRush-style keywords-by-intent split bar with legend. */
export function IntentSplit({ slices }: { slices: IntentSlice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No intent data.</p>;
  return (
    <div className="space-y-4">
      <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
        {slices.map(slice => (
          <div
            key={slice.intent}
            style={{ width: `${(slice.count / total) * 100}%`, background: INTENT_COLORS[slice.intent] ?? INTENT_COLORS.unknown }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {slices.map(slice => (
          <div key={slice.intent} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: INTENT_COLORS[slice.intent] ?? INTENT_COLORS.unknown }} />
            <span className="w-28 capitalize">{slice.intent}</span>
            <span className="w-12 text-right font-semibold tabular-nums">{Math.round((slice.count / total) * 100)}%</span>
            <span className="flex-1 text-right text-xs text-muted-foreground tabular-nums">
              {formatNumber(slice.count)} kw · {formatCompact(slice.volume)} vol
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Small donut with center total and side legend — for 2-5 category splits. */
export function MiniDonut({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel?: string }) {
  const data = slices.filter(s => s.value > 0);
  const total = data.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={40} outerRadius={58} paddingAngle={2} strokeWidth={0}>
              {data.map(slice => <Cell key={slice.label} fill={slice.color} />)}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold leading-none tabular-nums">{formatCompact(total)}</span>
          {centerLabel && <span className="text-[10px] text-muted-foreground">{centerLabel}</span>}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map(slice => (
          <div key={slice.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="min-w-0 flex-1 truncate capitalize">{slice.label}</span>
            <span className="font-semibold tabular-nums">{Math.round((slice.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
