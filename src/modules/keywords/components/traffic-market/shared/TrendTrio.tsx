import { useCallback, useMemo } from 'react';
import { ChartCard } from '../../analytics/ChartCard';
import { SERIES_COLORS } from '../../analytics/chartTheme';
import { MultiDomainTrendChart } from './MultiDomainTrendChart';

export interface TrendTrioProps {
  /** Shared YYYY-MM axis; series values align by index. */
  months: string[];
  /** Multi-domain series per device tab. */
  trends: Record<'all' | 'desktop' | 'mobile', { domain: string; values: number[] }[]>;
  loading?: boolean;
  /** Title of the wide all-devices card, default "Traffic Trend". */
  title?: string;
  /** Subtitle of the wide card, default "All devices, monthly visits". */
  description?: string;
  /**
   * Render the Desktop/Mobile pair. Pass false when the provider carries no
   * device split (DataForSEO: `deviceSplitAvailable === false`) — only the
   * wide all-devices trend renders.
   */
  showDeviceSplit?: boolean;
}

/**
 * Shared Traffic-Distribution trend block: one wide all-devices "Traffic
 * Trend" card with an interactive checkbox-chip legend, plus a two-column
 * grid of smaller "Desktop Trend" / "Mobile Trend" charts. Domain colors
 * follow `SERIES_COLORS` order consistently across all three charts; dots,
 * series toggles and the partial-month fade come from MultiDomainTrendChart.
 */
export function TrendTrio({
  months,
  trends,
  loading,
  title = 'Traffic Trend',
  description = 'All devices, monthly visits',
  showDeviceSplit = true,
}: TrendTrioProps) {
  const domains = useMemo(() => {
    const ordered: string[] = [];
    (['all', 'desktop', 'mobile'] as const).forEach(key => {
      (trends[key] ?? []).forEach(s => {
        if (!ordered.includes(s.domain)) ordered.push(s.domain);
      });
    });
    return ordered;
  }, [trends]);

  // Trio-wide color map so the same domain matches across all three charts.
  const colorOf = useCallback(
    (domain: string, fallbackIndex: number) => {
      const index = domains.indexOf(domain);
      return SERIES_COLORS[(index >= 0 ? index : fallbackIndex) % SERIES_COLORS.length];
    },
    [domains],
  );

  return (
    <div className="space-y-6">
      <ChartCard title={title} description={description} loading={loading} skeletonHeight={320}>
        <MultiDomainTrendChart
          months={months}
          series={trends.all ?? []}
          colorOf={colorOf}
          height={300}
          emptyMessage="No trend data available."
        />
      </ChartCard>

      {showDeviceSplit && (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartCard title="Desktop Trend" loading={loading} skeletonHeight={220}>
            <MultiDomainTrendChart
              months={months}
              series={trends.desktop ?? []}
              colorOf={colorOf}
              height={220}
              compact
              showLegend={false}
              emptyMessage="No desktop trend data."
            />
          </ChartCard>
          <ChartCard title="Mobile Trend" loading={loading} skeletonHeight={220}>
            <MultiDomainTrendChart
              months={months}
              series={trends.mobile ?? []}
              colorOf={colorOf}
              height={220}
              compact
              showLegend={false}
              emptyMessage="No mobile trend data."
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
