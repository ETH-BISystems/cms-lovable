/** Shared recharts styling for the SEO Analytics suite. */

/** Series palette — accent (teal) first, then distinguishable companions. */
export const SERIES_COLORS = [
  'hsl(var(--accent))',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#ef4444',
];

/** Stacked ranking-distribution colors, best positions first. */
export const RANKING_COLORS = ['#0d9488', '#2dd4bf', '#fbbf24', '#fb923c', '#f87171'];

export const CHART_TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
} as const;

export const CHART_AXIS_TICK = { fontSize: 11 } as const;
export const CHART_AXIS_STROKE = 'hsl(var(--muted-foreground))';
export const CHART_GRID_STROKE = 'hsl(var(--border))';
