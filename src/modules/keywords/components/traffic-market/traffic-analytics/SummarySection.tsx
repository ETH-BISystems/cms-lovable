import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartCard } from '../../analytics/ChartCard';
import { exportRowsToCsv } from '../../analytics/exportCsv';
import { formatCompact } from '../../analytics/format';
import { ExternalOpen } from '../shared/ExternalOpen';
import { MultiDomainTrendChart } from '../shared/MultiDomainTrendChart';
import { formatDuration, formatShare } from '../shared/trafficFormat';
import { DeltaBadge, DeviceSplitBar, domainColor, InlineEmpty, InlineError } from './common';
import { TRAFFIC_METRIC_LABELS } from '../../../types/trafficMarket';
import type { TrafficMetricKey, TrafficSummaryResult } from '../../../types/trafficMarket';

const METRIC_KEYS: TrafficMetricKey[] = [
  'visits',
  'uniqueVisitors',
  'pagesPerVisit',
  'avgVisitDuration',
  'bounceRate',
];

/** Trend tabs = engagement metrics + the DataForSEO search-channel splits. */
type TrendTab = TrafficMetricKey | 'organic' | 'paid';

const SEARCH_TAB_LABELS: Record<'organic' | 'paid', string> = {
  organic: 'Organic',
  paid: 'Paid',
};

function tabLabel(tab: TrendTab): string {
  return tab === 'organic' || tab === 'paid' ? SEARCH_TAB_LABELS[tab] : TRAFFIC_METRIC_LABELS[tab];
}

/** Per-tab value formatting for the trend chart axis + tooltip. */
const METRIC_FORMATTERS: Record<TrendTab, (value: number) => string> = {
  visits: formatCompact,
  uniqueVisitors: formatCompact,
  pagesPerVisit: value => value.toFixed(2),
  avgVisitDuration: formatDuration,
  bounceRate: formatShare,
  organic: formatCompact,
  paid: formatCompact,
};

interface SummarySectionProps {
  data: TrafficSummaryResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Page-level domain ordering — keeps series colors consistent across sections. */
  orderedDomains: string[];
}

/**
 * TA-01 — competitive summary table (latest-month metrics with
 * period-over-period deltas) plus the multi-domain Traffic Trend chart with
 * metric tabs. On 'dataforseo', clickstream-only engagement columns hide when
 * no row carries values, the Organic/Paid search-split columns and trend tabs
 * appear, and trend tabs with empty series are hidden. The query itself lives
 * on the page (its response also feeds the banner and seeds the hero chips).
 */
export function SummarySection({ data, loading, error, onRetry, orderedDomains }: SummarySectionProps) {
  const [tab, setTab] = useState<TrendTab>('visits');

  const showSkeleton = loading || (!data && !error);
  const rows = useMemo(() => data?.rows ?? [], [data]);

  // Column availability — engagement/device columns are clickstream-only and
  // hide entirely when no row carries a value; the Organic/Paid search split
  // shows whenever DataForSEO supplied it.
  const hasSearchSplit = rows.some(row => row.organicVisits != null || row.paidVisits != null);
  const hasEngagement = rows.some(
    row =>
      row.uniqueVisitors != null ||
      row.pagesPerVisit != null ||
      row.avgVisitDuration != null ||
      row.bounceRate != null,
  );
  const hasDeviceSplit = rows.some(row => row.desktopShare != null && row.mobileShare != null);

  /** Tabs with real series only — clickstream metrics carry empty arrays when gated. */
  const availableTabs = useMemo<TrendTab[]>(() => {
    if (!data) return ['visits'];
    const tabs: TrendTab[] = METRIC_KEYS.filter(key => (data.trends[key] ?? []).length > 0);
    (['organic', 'paid'] as const).forEach(key => {
      if ((data.searchTrends?.[key] ?? []).length > 0) tabs.push(key);
    });
    return tabs.length > 0 ? tabs : ['visits'];
  }, [data]);

  /** Keep the selection valid without an effect: fall back to the first tab. */
  const activeTab: TrendTab = availableTabs.includes(tab) ? tab : availableTabs[0];

  const trendSeries = useMemo(() => {
    if (!data) return [];
    return activeTab === 'organic' || activeTab === 'paid'
      ? data.searchTrends?.[activeTab] ?? []
      : data.trends[activeTab] ?? [];
  }, [data, activeTab]);

  const formatMetric = METRIC_FORMATTERS[activeTab];

  const exportSummary = () => {
    if (!data) return;
    exportRowsToCsv(
      'traffic-analytics-summary.csv',
      data.rows.map(row => ({
        domain: row.domain,
        visits: row.visits,
        visits_delta_pct: row.visitsDeltaPct,
        organic_visits: row.organicVisits,
        paid_visits: row.paidVisits,
        unique_visitors: row.uniqueVisitors,
        unique_visitors_delta_pct: row.uniqueVisitorsDeltaPct,
        pages_per_visit: row.pagesPerVisit,
        pages_per_visit_delta_pct: row.pagesPerVisitDeltaPct,
        avg_visit_duration_seconds: row.avgVisitDuration,
        avg_visit_duration_delta_pct: row.avgVisitDurationDeltaPct,
        bounce_rate: row.bounceRate,
        bounce_rate_delta_pct: row.bounceRateDeltaPct,
        desktop_share: row.desktopShare,
        mobile_share: row.mobileShare,
      })),
    );
  };

  return (
    <>
      <ChartCard
        title="Competitive Summary"
        description="Latest-month traffic across the domain set, with period-over-period change"
        loading={showSkeleton}
        skeletonHeight={220}
        actions={
          <Button variant="outline" size="sm" onClick={exportSummary} disabled={!data || data.rows.length === 0}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      >
        {error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : rows.length === 0 ? (
          <InlineEmpty message="No traffic data for this domain set yet." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Visits</TableHead>
                  {hasSearchSplit && <TableHead>Organic</TableHead>}
                  {hasSearchSplit && <TableHead>Paid</TableHead>}
                  {hasEngagement && <TableHead>Unique Visitors</TableHead>}
                  {hasEngagement && <TableHead>Pages / Visit</TableHead>}
                  {hasEngagement && <TableHead>Avg. Visit Duration</TableHead>}
                  {hasEngagement && <TableHead>Bounce Rate</TableHead>}
                  {hasDeviceSplit && <TableHead className="w-36">Desktop / Mobile</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.domain}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: domainColor(row.domain, i, orderedDomains) }}
                        />
                        {row.domain}
                        <ExternalOpen href={`https://${row.domain}`} label={`Open ${row.domain} in a new tab`} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium tabular-nums">{formatCompact(row.visits)}</span>
                        <DeltaBadge value={row.visitsDeltaPct} />
                      </div>
                    </TableCell>
                    {hasSearchSplit && (
                      <TableCell className="tabular-nums">{formatCompact(row.organicVisits)}</TableCell>
                    )}
                    {hasSearchSplit && (
                      <TableCell className="tabular-nums">{formatCompact(row.paidVisits)}</TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium tabular-nums">{formatCompact(row.uniqueVisitors)}</span>
                          <DeltaBadge value={row.uniqueVisitorsDeltaPct} />
                        </div>
                      </TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium tabular-nums">
                            {row.pagesPerVisit != null ? row.pagesPerVisit.toFixed(2) : '—'}
                          </span>
                          <DeltaBadge value={row.pagesPerVisitDeltaPct} />
                        </div>
                      </TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium tabular-nums">{formatDuration(row.avgVisitDuration)}</span>
                          <DeltaBadge value={row.avgVisitDurationDeltaPct} />
                        </div>
                      </TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell>
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium tabular-nums">{formatShare(row.bounceRate)}</span>
                          {/* Rising bounce rate is a negative outcome → inverted colors. */}
                          <DeltaBadge value={row.bounceRateDeltaPct} invert />
                        </div>
                      </TableCell>
                    )}
                    {hasDeviceSplit && (
                      <TableCell>
                        {row.desktopShare != null && row.mobileShare != null ? (
                          <DeviceSplitBar desktop={row.desktopShare} mobile={row.mobileShare} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Traffic Trend"
        description="Monthly history per domain — switch the metric with the tabs"
        loading={showSkeleton}
        skeletonHeight={360}
      >
        {error ? (
          <InlineError message={error} onRetry={onRetry} />
        ) : trendSeries.length === 0 ? (
          <InlineEmpty message="No trend history available." />
        ) : (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={value => setTab(value as TrendTab)}>
              <TabsList className="h-auto flex-wrap">
                {availableTabs.map(key => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {tabLabel(key)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <MultiDomainTrendChart
              months={data?.meta.months ?? []}
              series={trendSeries}
              colorOf={(domain, i) => domainColor(domain, i, orderedDomains)}
              height={320}
              axisFormatter={formatMetric}
              tooltipFormatter={formatMetric}
              yAxisWidth={64}
              emptyMessage="No trend history available."
            />
          </div>
        )}
      </ChartCard>
    </>
  );
}
