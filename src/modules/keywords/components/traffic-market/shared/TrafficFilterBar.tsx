import { CalendarRange, Globe2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/** Period windows offered by the bar — maps straight onto `TrafficMarketInput.months` (3–24). */
const PERIOD_OPTIONS: Array<{ months: number; label: string }> = [
  { months: 3, label: 'Last 3 months' },
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last 12 months' },
  { months: 24, label: 'Last 24 months' },
];

/** "world"/"global" → "Worldwide", 2-letter codes upper-cased, else capitalized. */
export function regionLabel(region: string): string {
  const trimmed = region.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (lower === 'world' || lower === 'worldwide' || lower === 'global') return 'Worldwide';
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export interface TrafficFilterBarProps {
  /** Currently applied trailing-month window (input.months, default 12). */
  months: number;
  /** Fires with the new window — callers refetch their queries with it. */
  onMonthsChange: (months: number) => void;
  /** Response meta.region — rendered as a display-only scope chip. */
  region?: string | null;
  /** Disable the controls (e.g. while a refetch is in flight). */
  disabled?: boolean;
}

/**
 * Compact cross-page control strip rendered under each Traffic & Market hero:
 * a Period (month-window) select wired to `TrafficMarketInput.months`, plus a
 * display chip for the region the response is scoped to. Pages hide the bar
 * while a history snapshot is being viewed (the snapshot fixes its own
 * period) and in 'disabled' mode where refetching serves nothing.
 */
export function TrafficFilterBar({ months, onMonthsChange, region, disabled }: TrafficFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 ring-1 ring-black/[0.05]">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" aria-hidden />
        Period
      </span>
      <Select
        value={String(months)}
        onValueChange={value => onMonthsChange(Number(value))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-40 bg-card text-xs" aria-label="Trend period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map(option => (
            <SelectItem key={option.months} value={String(option.months)} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {region && regionLabel(region) && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/[0.06]">
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          {regionLabel(region)}
        </span>
      )}
    </div>
  );
}
