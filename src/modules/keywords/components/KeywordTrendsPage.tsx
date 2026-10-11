import { useCallback, useState } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { RelatedQuery, TrendsResult, TrendsTimeRange, TrendsType } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { formatCompact, formatChangePct } from './analytics/format';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  SERIES_COLORS,
} from './analytics/chartTheme';

const TIME_RANGES: Array<{ value: TrendsTimeRange; label: string }> = [
  { value: 'past_7_days', label: 'Last 7 days' },
  { value: 'past_30_days', label: 'Last 30 days' },
  { value: 'past_90_days', label: 'Last 90 days' },
  { value: 'past_12_months', label: 'Last 12 months' },
  { value: 'past_5_years', label: 'Last 5 years' },
];

const TREND_TYPES: Array<{ value: TrendsType; label: string }> = [
  { value: 'web', label: 'Google Search' },
  { value: 'news', label: 'Google News' },
  { value: 'ecommerce', label: 'Google Shopping' },
];

function RelatedQueryList({ title, icon, queries }: { title: string; icon: React.ReactNode; queries: RelatedQuery[] }) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</h4>
      {queries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No queries found.</p>
      ) : (
        <ul className="space-y-1.5">
          {queries.map((q) => (
            <li key={q.keyword} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{q.keyword}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
                {formatCompact(q.volume)}
                {q.growthPct !== null && (
                  <Badge variant={q.growthPct > 0 ? 'default' : 'secondary'} className="text-[10px]">
                    {formatChangePct(q.growthPct)}
                  </Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Keyword Trends — DataForSEO Trends popularity over time, regional interest,
 * demographics, and related queries for up to 5 comma-separated keywords.
 */
export function KeywordTrendsPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.trends);
  const { run } = query;
  const [timeRange, setTimeRange] = useState<TrendsTimeRange>('past_12_months');
  const [type, setType] = useState<TrendsType>('web');

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate offers the last searches — no API call.
  const historyFirst = useHistoryFirst('keyword-trends');

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<TrendsResult>({
    // "Refresh live data" re-explores the snapshot's own keyword set.
    onRefreshLive: snapshot => {
      const kws = Array.isArray(snapshot.payload.keywords) ? snapshot.payload.keywords.slice(0, 5) : [];
      if (kws.length > 0) run({ keywords: kws, timeRange, type });
    },
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as TrendsResult | null)?.interestOverTime)
      ? (history.snapshot.payload as TrendsResult)
      : null;

  const onSubmit = useCallback((value: string) => {
    const keywords = value.split(',').map(k => k.trim()).filter(Boolean).slice(0, 5);
    if (keywords.length > 0) {
      clearSnapshot();
      run({ keywords, timeRange, type });
    }
  }, [run, timeRange, type, clearSnapshot]);

  const data = snapshotData ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;
  const keywords = data?.keywords ?? [];

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
        title="Keyword Trends"
        description="Popularity over time, geography, and demographics — up to 5 keywords, comma separated."
        inputPlaceholder="e.g. travel hacking, credit card points, airline miles"
        buttonLabel="Explore"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="keyword-trends" onLoad={history.loadSnapshot} />}
        extraControls={
          <>
            {/* CMS-34: match the hero's glass styling (same as Business
                Research) so all three header controls read consistently. */}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TrendsTimeRange)}>
              <SelectTrigger className="h-10 w-40 border-white/15 bg-white/10 text-white focus:ring-cyan-300/40 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as TrendsType)}>
              <SelectTrigger className="h-10 w-40 border-white/15 bg-white/10 text-white focus:ring-cyan-300/40 focus:ring-offset-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TREND_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {history.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : !data && !loading ? (
        <EmptyPrompt message="Enter one or more keywords above to explore their popularity trends, regions, and demographics." />
      ) : (
        <>
          <ChartCard
            title="Interest Over Time"
            description="Relative popularity (0–100), one line per keyword"
            loading={loading}
            skeletonHeight={320}
          >
            {(data?.interestOverTime ?? []).length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.interestOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="date" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis domain={[0, 100]} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    {keywords.map((kw, i) => (
                      <Line
                        key={kw}
                        type="monotone"
                        dataKey={kw}
                        stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No trend data returned.</p>
            )}
          </ChartCard>

          <ChartCard
            title="Interest by Region"
            description="Top US states by relative interest"
            loading={loading}
            skeletonHeight={320}
          >
            {(data?.regions ?? []).length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.regions} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                    <XAxis type="number" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis type="category" dataKey="region" width={110} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    {keywords.map((kw, i) => (
                      <Bar key={kw} dataKey={kw} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[0, 3, 3, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No regional data returned.</p>
            )}
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Demographics: By Age"
              loading={loading}
              skeletonHeight={256}
            >
              {(data?.demography.age ?? []).length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.demography.age}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="bucket" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                      <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend />
                      {keywords.map((kw, i) => (
                        <Bar key={kw} dataKey={kw} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No age data returned.</p>
              )}
            </ChartCard>

            <ChartCard
              title="Demographics: By Gender"
              loading={loading}
              skeletonHeight={256}
            >
              {(data?.demography.gender ?? []).length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data!.demography.gender}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="bucket" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                      <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend />
                      {keywords.map((kw, i) => (
                        <Bar key={kw} dataKey={kw} fill={SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No gender data returned.</p>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Related Queries"
            description={`Based on "${keywords[0] ?? ''}"`}
            loading={loading}
            skeletonHeight={240}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <RelatedQueryList
                title="Rising"
                icon={<Flame className="h-4 w-4 text-orange-500" />}
                queries={data?.related.rising ?? []}
              />
              <RelatedQueryList
                title="Top"
                icon={<TrendingUp className="h-4 w-4 text-accent" />}
                queries={data?.related.top ?? []}
              />
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
