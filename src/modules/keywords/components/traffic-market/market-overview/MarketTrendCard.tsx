import { ChartCard } from '../../analytics/ChartCard';
import { MultiDomainTrendChart } from '../shared/MultiDomainTrendChart';
import type { DomainSeries } from '../../../types/trafficMarket';
import { formatCompact } from '../shared/trafficFormat';

interface MarketTrendCardProps {
  /** Shared month axis (meta.months, YYYY-MM ascending). */
  months: string[];
  /** One line per domain, already in canonical color order. */
  series: DomainSeries[];
  colorOf: (domain: string) => string;
  loading: boolean;
}

/** Distinct muted tone for the summed "Market" line (slate, dashed). */
const MARKET_LINE_COLOR = '#94a3b8';

/**
 * MO-01 — Market Traffic Trend: multi-domain visits over time plus a summed
 * "Market" line, rendered by the shared MultiDomainTrendChart (dot markers,
 * checkbox-chip series toggles, partial-month fade).
 */
export function MarketTrendCard({ months, series, colorOf, loading }: MarketTrendCardProps) {
  return (
    <ChartCard
      title="Market Traffic Trend"
      description="Monthly visits per domain, with the summed market total"
      loading={loading}
      skeletonHeight={320}
    >
      <MultiDomainTrendChart
        months={months}
        series={series}
        colorOf={domain => colorOf(domain)}
        height={320}
        tooltipFormatter={formatCompact}
        totalLine={{ name: 'Market (total)', color: MARKET_LINE_COLOR }}
        emptyMessage="No trend data for the current domain set."
      />
    </ChartCard>
  );
}
