import { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  SERIES_COLORS,
} from '../../analytics/chartTheme';
import { formatCompact } from '../../analytics/format';

/** One domain positioned on the two chosen axis metrics. */
export interface QuadrantPointDatum {
  domain: string;
  x: number;
  y: number;
}

export interface QuadrantChartProps {
  points: QuadrantPointDatum[];
  xLabel: string;
  yLabel: string;
  /** Corner labels; defaults follow the Growth Quadrant convention. */
  quadrantLabels?: { topLeft: string; topRight: string; bottomLeft: string; bottomRight: string };
  /** Chart height in px, default 420. */
  height?: number;
}

const DEFAULT_QUADRANT_LABELS = {
  topLeft: 'Game Changers',
  topRight: 'Leaders',
  bottomLeft: 'Niche Players',
  bottomRight: 'Established Players',
} as const;

const CORNER_LABEL_CLASS =
  'pointer-events-none absolute z-10 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70';

/** Pad a [min, max] range so points and their labels sit clear of the edges. */
function padDomain(min: number, max: number): [number, number] {
  const span = max - min || Math.abs(max) || 1;
  return [min - span * 0.18, max + span * 0.18];
}

/**
 * Growth-quadrant scatter (Semrush "Growth Quadrant" parity): domains plotted
 * on two metrics, split into four labelled quadrants by the mean of each axis.
 * One colored, labelled point per domain in `SERIES_COLORS` order. Loading and
 * empty states are handled by callers; an empty `points` array renders a
 * muted placeholder.
 */
export function QuadrantChart({
  points,
  xLabel,
  yLabel,
  quadrantLabels,
  height = 420,
}: QuadrantChartProps) {
  const labels = { ...DEFAULT_QUADRANT_LABELS, ...quadrantLabels };

  const { midX, midY, xDomain, yDomain } = useMemo(() => {
    if (points.length === 0) {
      return { midX: 0, midY: 0, xDomain: [0, 1] as [number, number], yDomain: [0, 1] as [number, number] };
    }
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
    return {
      midX: mean(xs),
      midY: mean(ys),
      xDomain: padDomain(Math.min(...xs), Math.max(...xs)),
      yDomain: padDomain(Math.min(...ys), Math.max(...ys)),
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No domains to plot.
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 28, bottom: 28, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            domain={xDomain}
            tick={CHART_AXIS_TICK}
            stroke={CHART_AXIS_STROKE}
            tickFormatter={(v: number) => formatCompact(v)}
            label={{ value: xLabel, position: 'insideBottom', offset: -18, fontSize: 11, fill: CHART_AXIS_STROKE }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            domain={yDomain}
            width={56}
            tick={CHART_AXIS_TICK}
            stroke={CHART_AXIS_STROKE}
            tickFormatter={(v: number) => formatCompact(v)}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 8, fontSize: 11, fill: CHART_AXIS_STROKE }}
          />
          <ReferenceLine x={midX} stroke={CHART_GRID_STROKE} strokeWidth={1.5} />
          <ReferenceLine y={midY} stroke={CHART_GRID_STROKE} strokeWidth={1.5} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3', stroke: CHART_GRID_STROKE }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as QuadrantPointDatum;
              return (
                <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2">
                  <p className="font-semibold">{point.domain}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {xLabel}: <span className="tabular-nums text-foreground">{formatCompact(point.x)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    {yLabel}: <span className="tabular-nums text-foreground">{formatCompact(point.y)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={points} isAnimationActive={false}>
            <LabelList
              dataKey="domain"
              position="top"
              offset={8}
              style={{ fontSize: 11, fontWeight: 500, fill: 'hsl(var(--foreground))' }}
            />
            {points.map((point, i) => (
              <Cell key={point.domain} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant corner labels (inside the plot area, clear of the axes). */}
      <span className={`${CORNER_LABEL_CLASS} left-[76px] top-5`}>{labels.topLeft}</span>
      <span className={`${CORNER_LABEL_CLASS} right-8 top-5`}>{labels.topRight}</span>
      <span className={`${CORNER_LABEL_CLASS} bottom-16 left-[76px]`}>{labels.bottomLeft}</span>
      <span className={`${CORNER_LABEL_CLASS} bottom-16 right-8`}>{labels.bottomRight}</span>
    </div>
  );
}
