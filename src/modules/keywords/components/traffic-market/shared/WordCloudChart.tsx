import { SERIES_COLORS } from '../../analytics/chartTheme';
import { formatCompact } from './trafficFormat';

export interface WordCloudChartProps {
  terms: { term: string; weight: number }[];
  /** Minimum block height in px, default 300. */
  height?: number;
}

const MIN_FONT = 12;
const MAX_FONT = 34;

/**
 * Dependency-free keyword cloud: a centered flex-wrap of terms with font size
 * scaled 12→34px on a square-root scale of weight, colors cycling
 * `SERIES_COLORS`. Hover brightens the term and shows the formatted weight
 * (e.g. "12.4K volume") as a tooltip.
 */
export function WordCloudChart({ terms, height = 300 }: WordCloudChartProps) {
  if (terms.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ minHeight: height }}>
        No keywords to display.
      </div>
    );
  }
  const maxWeight = Math.max(...terms.map(t => t.weight), 1);
  return (
    <div
      className="flex flex-wrap content-center items-center justify-center gap-x-4 gap-y-1.5 px-4 py-2"
      style={{ minHeight: height }}
    >
      {terms.map((t, i) => {
        const fontSize = MIN_FONT + Math.sqrt(Math.max(t.weight, 0) / maxWeight) * (MAX_FONT - MIN_FONT);
        return (
          <span
            key={t.term}
            title={`${formatCompact(t.weight)} volume`}
            className="cursor-default font-medium leading-tight transition-[filter] duration-200 hover:brightness-125"
            style={{ fontSize, color: SERIES_COLORS[i % SERIES_COLORS.length] }}
          >
            {t.term}
          </span>
        );
      })}
    </div>
  );
}
