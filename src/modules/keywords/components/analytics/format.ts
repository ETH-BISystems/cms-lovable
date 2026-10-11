/** Compact number for metric cards and table cells: 12435 → "12.4K". */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Full number with thousands separators. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString();
}

/** CPC / currency with two decimals. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `$${value.toFixed(2)}`;
}

/** Signed percentage: 12.5 → "+12.5%". */
export function formatChangePct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : ''}${value}%`;
}

/** "YYYY-MM" → "Aug 25" for chart axes. */
export function formatMonthLabel(date: string): string {
  const [year, month] = date.split('-').map(Number);
  if (!year || !month) return date;
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${String(year).slice(2)}`;
}

/** Turn a snake_case SERP feature into a display label. */
export function featureLabel(feature: string): string {
  return feature
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
