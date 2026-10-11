import { useCallback } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { TrafficInput, TrafficResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { ChartCard } from './analytics/ChartCard';
import { ErrorState } from './analytics/StatusStates';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatChangePct, formatCompact, formatMonthLabel, formatNumber } from './analytics/format';
import { AreaGradient } from './analytics/dataViz';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  RANKING_COLORS,
  SERIES_COLORS,
} from './analytics/chartTheme';

const TRAFFIC_SERIES: Array<{ key: string; name: string }> = [
  { key: 'organic', name: 'Organic' },
  { key: 'paid', name: 'Paid' },
  { key: 'featuredSnippet', name: 'Featured Snippet' },
  { key: 'localPack', name: 'Local Pack' },
];

const INITIAL_INPUT: TrafficInput = { domain: DEFAULT_DOMAIN };

const RANKING_SERIES: Array<{ key: string; name: string }> = [
  { key: 'top3', name: 'Position 1-3' },
  { key: 'pos4_10', name: 'Position 4-10' },
  { key: 'pos11_20', name: 'Position 11-20' },
  { key: 'pos21_50', name: 'Position 21-50' },
  { key: 'pos51_100', name: 'Position 51-100' },
];

/**
 * Traffic Insights — 12-month estimated traffic and ranking-distribution
 * history for a domain, with month-over-month deltas.
 */
export function TrafficInsightsPage() {
  // History-first: check saved snapshots before any API call; the query only
  // auto-runs when the check resolves with no history at all (true first
  // visit). With saved history the query never auto-runs and the HistoryGate
  // below offers the last searches.
  const historyFirst = useHistoryFirst('traffic-insights');
  const query = useAnalyticsQuery(
    seoAnalyticsService.traffic,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<TrafficResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as TrafficResult | null)?.traffic)
      ? (history.snapshot.payload as TrafficResult)
      : null;
  const onSubmit = useCallback((domain: string) => { clearSnapshot(); run({ domain }); }, [run, clearSnapshot]);

  const data = snapshotData ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !history.snapshot &&
    !query.data &&
    !query.loading &&
    !query.error;

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Traffic Insights${data ? `: ${data.domain}` : ''}`}
        description="Historical traffic estimation and ranking movement over the last 12 months."
        inputPlaceholder="Enter a domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="traffic-insights" onLoad={history.loadSnapshot} />}
      />

      {history.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <ChartCard
            title="Traffic Over Time"
            description="Estimated monthly traffic by channel"
            loading={loading}
            skeletonHeight={320}
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.traffic ?? []}>
                  <defs>
                    {TRAFFIC_SERIES.map((series, i) => (
                      <AreaGradient key={series.key} id={`traffic-${series.key}`} color={SERIES_COLORS[i]} />
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatMonthLabel}
                    tick={CHART_AXIS_TICK}
                    stroke={CHART_AXIS_STROKE}
                  />
                  <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} tickFormatter={(v: number) => formatCompact(v)} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={formatMonthLabel} />
                  <Legend />
                  {TRAFFIC_SERIES.map((series, i) => (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.name}
                      stroke={SERIES_COLORS[i]}
                      strokeWidth={2.5}
                      fill={`url(#traffic-${series.key})`}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Historical Rankings Distribution"
            description="Keywords per position range, stacked over time"
            loading={loading}
            skeletonHeight={320}
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.rankings ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatMonthLabel}
                    tick={CHART_AXIS_TICK}
                    stroke={CHART_AXIS_STROKE}
                  />
                  <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={formatMonthLabel} />
                  <Legend />
                  {RANKING_SERIES.map((series, i) => (
                    <Area
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.name}
                      stackId="rankings"
                      stroke={RANKING_COLORS[i]}
                      fill={RANKING_COLORS[i]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Month-over-Month Changes"
            description="Latest full month compared to the previous month"
            loading={loading}
            skeletonHeight={240}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="w-32">This Month</TableHead>
                  <TableHead className="w-32">Last Month</TableHead>
                  <TableHead className="w-32">Change %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.momChanges ?? []).map((change) => {
                  const positive = (change.changePct ?? 0) > 0;
                  const negative = (change.changePct ?? 0) < 0;
                  return (
                    <TableRow key={change.metric}>
                      <TableCell className="font-medium">{change.metric}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(change.thisMonth)}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(change.lastMonth)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 tabular-nums text-sm font-medium',
                            positive && 'text-green-600',
                            negative && 'text-red-600',
                          )}
                        >
                          {positive && <TrendingUp className="h-3.5 w-3.5" />}
                          {negative && <TrendingDown className="h-3.5 w-3.5" />}
                          {formatChangePct(change.changePct)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(data?.momChanges ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Not enough history to compute month-over-month changes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ChartCard>
        </>
      )}
    </div>
  );
}
