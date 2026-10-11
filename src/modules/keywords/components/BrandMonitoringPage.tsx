import { useCallback } from 'react';
import { Frown, Globe2, MessageSquareText, Smile } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { BrandCountRow, BrandMonitoringInput, BrandMonitoringResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { MetricCard } from './analytics/MetricCard';
import { ErrorState } from './analytics/StatusStates';
import { formatCompact, formatNumber } from './analytics/format';

const DEFAULT_BRAND = 'elite travel hackers';

const INITIAL_INPUT: BrandMonitoringInput = { keyword: DEFAULT_BRAND };

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  negative: 'bg-red-100 text-red-800',
  neutral: 'bg-muted text-muted-foreground',
};

function CountList({ rows, uppercase }: { rows: BrandCountRow[]; uppercase?: boolean }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-2 text-sm">
          <span className={cn('w-24 truncate text-xs font-medium text-muted-foreground', uppercase && 'uppercase')}>{row.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right text-xs tabular-nums">{formatCompact(row.count)}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data available.</p>}
    </div>
  );
}

/**
 * Brand Monitoring — who is talking about the brand across the web, with
 * sentiment. Powered by the DataForSEO Content Analysis API.
 */
export function BrandMonitoringPage() {
  // History-first: check saved searches before any API call; with saved
  // history the query never auto-runs and the HistoryGate offers the last
  // searches.
  const historyFirst = useHistoryFirst('brand-monitoring');
  const query = useAnalyticsQuery(
    seoAnalyticsService.brandMonitoring,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<BrandMonitoringResult>({
    onRefreshLive: snapshot => run({ keyword: snapshot.payload.keyword || DEFAULT_BRAND }),
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as BrandMonitoringResult | null)?.mentions)
      ? (history.snapshot.payload as BrandMonitoringResult)
      : null;
  const onSubmit = useCallback((keyword: string) => { clearSnapshot(); run({ keyword }); }, [run, clearSnapshot]);

  const data: BrandMonitoringResult | null = snapshotData ?? query.data;
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

  const sentimentTotal = data ? data.sentiment.positive + data.sentiment.negative + data.sentiment.neutral : 0;
  const pct = (n: number) => sentimentTotal > 0 ? Math.round((n / sentimentTotal) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Brand Monitoring${data ? `: ${data.keyword}` : ''}`}
        description="Every web mention of a brand or phrase, with sentiment — powered by the DataForSEO Content Analysis API."
        inputPlaceholder="Enter a brand or phrase, e.g. elite travel hackers"
        initialValue={DEFAULT_BRAND}
        buttonLabel="Monitor"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="brand-monitoring" onLoad={history.loadSnapshot} />}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Mentions" value={formatCompact(data?.totalMentions)} icon={MessageSquareText} loading={loading} />
            <MetricCard
              label="Positive"
              value={loading ? '' : `${pct(data?.sentiment.positive ?? 0)}%`}
              sub={data ? `${formatNumber(data.sentiment.positive)} mentions` : undefined}
              icon={Smile}
              loading={loading}
            />
            <MetricCard
              label="Negative"
              value={loading ? '' : `${pct(data?.sentiment.negative ?? 0)}%`}
              sub={data ? `${formatNumber(data.sentiment.negative)} mentions` : undefined}
              icon={Frown}
              loading={loading}
            />
            <MetricCard
              label="Sources"
              value={formatCompact(data?.topDomains.length)}
              sub="top referring domains"
              icon={Globe2}
              loading={loading}
            />
          </div>

          <ChartCard title="Sentiment Split" description="How the web talks about this phrase" loading={loading} skeletonHeight={96}>
            <div className="space-y-3">
              <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-green-500" style={{ width: `${pct(data?.sentiment.positive ?? 0)}%` }} />
                <div className="bg-slate-300" style={{ width: `${pct(data?.sentiment.neutral ?? 0)}%` }} />
                <div className="bg-red-400" style={{ width: `${pct(data?.sentiment.negative ?? 0)}%` }} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Positive {pct(data?.sentiment.positive ?? 0)}%</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" />Neutral {pct(data?.sentiment.neutral ?? 0)}%</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-400" />Negative {pct(data?.sentiment.negative ?? 0)}%</span>
              </div>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Top Sources" description="Domains mentioning this phrase most" loading={loading} skeletonHeight={220}>
              <CountList rows={data?.topDomains ?? []} />
            </ChartCard>
            <ChartCard title="Emotional Fingerprint" description="Dominant emotional tones detected" loading={loading} skeletonHeight={220}>
              {(data?.emotions ?? []).length >= 3 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={(data?.emotions ?? []).map(e => ({ tone: e.label, value: e.count }))} outerRadius="75%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="tone" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar dataKey="value" stroke="hsl(188, 100%, 33%)" fill="hsl(188, 100%, 33%)" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <CountList rows={data?.emotions ?? []} />
              )}
            </ChartCard>
            <ChartCard title="Countries" description="Where mentions are published" loading={loading} skeletonHeight={220}>
              <CountList rows={data?.countries ?? []} uppercase />
            </ChartCard>
          </div>

          <ChartCard title="Recent Mentions" description="Latest pages mentioning this phrase" loading={loading} skeletonHeight={400}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mention</TableHead>
                  <TableHead className="w-44">Source</TableHead>
                  <TableHead className="w-24">Authority</TableHead>
                  <TableHead className="w-28">Sentiment</TableHead>
                  <TableHead className="w-28">Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.mentions ?? []).map((mention, i) => (
                  <TableRow key={`${mention.url || mention.title}-${i}`}>
                    <TableCell className="max-w-[360px]">
                      {mention.url ? (
                        <a href={mention.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-accent hover:underline">
                          {mention.title || mention.url}
                        </a>
                      ) : (
                        <span className="block truncate font-medium">{mention.title}</span>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{mention.snippet}</p>
                    </TableCell>
                    <TableCell className="max-w-[170px] truncate text-xs text-muted-foreground">{mention.domain}</TableCell>
                    <TableCell className="tabular-nums text-xs">{mention.domainRank || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[11px] capitalize', SENTIMENT_STYLES[mention.sentiment])}>
                        {mention.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{mention.datePublished ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {(data?.mentions ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No individual mentions returned for this phrase.
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
