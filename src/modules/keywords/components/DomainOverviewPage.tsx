import { useCallback, useEffect, useState } from 'react';
import { Award, Clock, Download, Link2, MousePointerClick, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import { subscribeToDomainHistory, type DomainHistoryEntry } from '../services/keywordHistoryService';
import { cn } from '@/lib/utils';
import type { DomainCompetitorLite, DomainOverviewInput, DomainOverviewResult, DomainTopKeyword } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../hooks/useSortedPagination';
import { KDBar } from './shared/KDBar';
import { DataTablePagination } from './shared/DataTablePagination';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { AnalyticsIntentBadge } from './analytics/AnalyticsIntentBadge';
import { exportRowsToCsv } from './analytics/exportCsv';
import { ChartCard } from './analytics/ChartCard';
import { MetricCard } from './analytics/MetricCard';
import { ErrorState } from './analytics/StatusStates';
import { SortableHead } from './analytics/SortableHead';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCompact, formatCurrency, formatNumber } from './analytics/format';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from './analytics/chartTheme';
import { ChartGradient, InlineBar, IntentSplit, PositionChip } from './analytics/dataViz';

const INITIAL_INPUT: DomainOverviewInput = { domain: DEFAULT_DOMAIN };

/** Competitive positioning: keywords (x) vs traffic (y), bubble = overlap. */
function PositioningMap({ competitors, self }: {
  competitors: DomainCompetitorLite[];
  self: { domain: string; organicKeywords: number; organicTraffic: number };
}) {
  const points = [
    { ...self, commonKeywords: 0, isSelf: true },
    ...competitors.map(c => ({ ...c, isSelf: false })),
  ];
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis type="number" dataKey="organicKeywords" name="Organic keywords" tickFormatter={v => formatCompact(v as number)} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
          <YAxis type="number" dataKey="organicTraffic" name="Organic traffic" tickFormatter={v => formatCompact(v as number)} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
          <ZAxis type="number" dataKey="commonKeywords" range={[80, 600]} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => [formatCompact(value), name]}
            labelFormatter={() => ''}
            content={({ payload }) => {
              const point = payload?.[0]?.payload as (typeof points)[number] | undefined;
              if (!point) return null;
              return (
                <div className="rounded-lg border bg-card p-2.5 text-xs shadow-md">
                  <p className="font-semibold">{point.domain}{point.isSelf ? ' (you)' : ''}</p>
                  <p className="text-muted-foreground">Keywords: {formatCompact(point.organicKeywords)} · Traffic: {formatCompact(point.organicTraffic)}</p>
                  {!point.isSelf && <p className="text-muted-foreground">Shared keywords: {formatNumber(point.commonKeywords)}</p>}
                </div>
              );
            }}
          />
          <Scatter data={points} fillOpacity={0.75}>
            {points.map((point, i) => (
              <Cell key={i} fill={point.isSelf ? 'hsl(var(--accent))' : '#94a3b8'} stroke={point.isSelf ? 'hsl(var(--accent))' : 'none'} strokeWidth={2} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopKeywordsTable({ keywords }: { keywords: DomainTopKeyword[] }) {
  const table = useSortedPagination(keywords, 'traffic');
  const maxVolume = Math.max(1, ...keywords.map(k => k.volume));
  const maxTraffic = Math.max(1, ...keywords.map(k => k.traffic));
  const head = (label: string, key: string, className?: string) => (
    <SortableHead
      label={label}
      sortKey={key}
      activeKey={table.sortKey}
      direction={table.direction}
      onSort={table.toggleSort}
      className={className}
    />
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {head('Keyword', 'keyword')}
            <TableHead className="w-28">Intent</TableHead>
            {head('Position', 'position', 'w-24')}
            {head('Volume', 'volume', 'w-28')}
            {head('KD', 'kd', 'w-28')}
            {head('CPC', 'cpc', 'w-24')}
            {head('Traffic', 'traffic', 'w-28')}
            {head('URL', 'url')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map((kw) => (
            <TableRow key={`${kw.keyword}-${kw.url}`}>
              <TableCell className="font-medium">{kw.keyword}</TableCell>
              <TableCell><AnalyticsIntentBadge intent={kw.intent ?? null} /></TableCell>
              <TableCell><PositionChip position={kw.position} /></TableCell>
              <TableCell><InlineBar value={kw.volume} max={maxVolume} label={formatNumber(kw.volume)} /></TableCell>
              <TableCell><KDBar kd={kw.kd} /></TableCell>
              <TableCell className="tabular-nums">{formatCurrency(kw.cpc)}</TableCell>
              <TableCell><InlineBar value={kw.traffic} max={maxTraffic} label={formatNumber(kw.traffic)} /></TableCell>
              <TableCell className="max-w-[280px]">
                <a
                  href={kw.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-muted-foreground hover:text-accent hover:underline"
                >
                  {kw.url}
                </a>
              </TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                No ranked keywords found for this domain.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <DataTablePagination
        page={table.page}
        pageSize={table.pageSize}
        totalPages={table.totalPages}
        totalItems={table.totalItems}
        setPage={table.setPage}
        setPageSize={table.setPageSize}
      />
    </>
  );
}

/**
 * Domain Overview — SEMRush-style snapshot: traffic metrics, ranking
 * distribution, and the domain's top organic keywords.
 */
export function DomainOverviewPage() {
  // History-first: check saved searches before any API call; the query only
  // auto-runs when the check resolves with no history at all (true first
  // visit). With history, the HistoryGate below offers the last searches.
  const historyFirst = useHistoryFirst('domain-overview');
  const query = useAnalyticsQuery(
    seoAnalyticsService.domainOverview,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;
  const [viewed, setViewed] = useState<DomainOverviewResult | null>(null);
  const [history, setHistory] = useState<DomainHistoryEntry[]>([]);
  useEffect(() => subscribeToDomainHistory(setHistory, () => {}), []);

  // Snapshot view — a loaded snapshot replaces both live data and the rail's
  // "viewed" entry until the user runs a new search or clicks Back to live.
  const snapshots = useHistorySnapshot<DomainOverviewResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = snapshots;
  const snapshotData =
    snapshots.snapshot && Array.isArray((snapshots.snapshot.payload as DomainOverviewResult | null)?.topKeywords)
      ? (snapshots.snapshot.payload as DomainOverviewResult)
      : null;
  const onSubmit = useCallback((domain: string) => { setViewed(null); clearSnapshot(); run({ domain }); }, [run, clearSnapshot]);

  const data: DomainOverviewResult | null = snapshotData ?? viewed ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !snapshots.snapshot &&
    !viewed &&
    !query.data &&
    !query.loading &&
    !query.error;

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Domain Overview${data ? `: ${data.domain}` : ''}`}
        description="Organic and paid visibility snapshot powered by DataForSEO Labs."
        inputPlaceholder="Enter a domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="domain-overview" onLoad={snapshots.loadSnapshot} />}
      />

      {snapshots.banner}

      {history.length > 1 && (
        <div className="animate-fade-up space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Recent domains — saved, re-open free
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {history.map(entry => (
              <button
                key={entry.id}
                onClick={() => { clearSnapshot(); setViewed(entry.result); }}
                className={cn(
                  'shrink-0 rounded-xl border bg-card px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md',
                  data?.domain === entry.domain && 'border-accent ring-1 ring-accent/30',
                )}
              >
                <p className="max-w-44 truncate text-sm font-medium">{entry.domain}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatCompact(entry.organicTraffic)} traffic · {formatCompact(entry.organicKeywords)} kw
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => snapshots.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !viewed && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Organic Traffic"
              value={formatCompact(data?.metrics.organicTraffic)}
              sub={data ? `${formatCompact(data.metrics.organicKeywords)} keywords` : undefined}
              icon={TrendingUp}
              loading={loading}
            />
            <MetricCard
              label="Paid Traffic"
              value={formatCompact(data?.metrics.paidTraffic)}
              sub={data ? `${formatCompact(data.metrics.paidKeywords)} keywords` : undefined}
              icon={MousePointerClick}
              loading={loading}
            />
            <MetricCard
              label="Backlinks"
              value={formatCompact(data?.metrics.backlinks ?? null)}
              icon={Link2}
              loading={loading}
            />
            <MetricCard
              label="Domain Authority"
              value={data?.metrics.domainRank !== null && data?.metrics.domainRank !== undefined
                ? `${Math.min(100, Math.round(data.metrics.domainRank / 10))}/100`
                : '—'}
              sub={data?.metrics.domainRank ? `DataForSEO rank ${formatNumber(data.metrics.domainRank)}` : undefined}
              icon={Award}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Ranking Distribution"
              description="Organic keywords by Google position range"
              loading={loading}
              skeletonHeight={256}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.rankingDistribution ?? []}>
                    <defs><ChartGradient id="domainBars" /></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="bucket" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(188 100% 33% / 0.06)' }} />
                    <Bar dataKey="count" name="Keywords" fill="url(#domainBars)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Keywords by Intent"
              description="What searchers want when they find this domain"
              loading={loading}
              skeletonHeight={256}
            >
              <IntentSplit slices={data?.intentDistribution ?? []} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ChartCard
                title="Competitive Positioning"
                description="Organic keywords vs traffic — bubble size is keyword overlap with you"
                loading={loading}
                skeletonHeight={288}
              >
                <PositioningMap
                  competitors={data?.competitors ?? []}
                  self={{
                    domain: data?.domain ?? '',
                    organicKeywords: data?.metrics.organicKeywords ?? 0,
                    organicTraffic: data?.metrics.organicTraffic ?? 0,
                  }}
                />
              </ChartCard>
            </div>
            <div className="lg:col-span-2">
              <ChartCard
                title="Main Organic Competitors"
                description="Domains competing for the same keywords"
                loading={loading}
                skeletonHeight={288}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead className="w-20 text-right">Shared</TableHead>
                      <TableHead className="w-24 text-right">Traffic</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.competitors ?? []).map(competitor => (
                      <TableRow key={competitor.domain}>
                        <TableCell className="max-w-[160px] truncate font-medium">{competitor.domain}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(competitor.commonKeywords)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCompact(competitor.organicTraffic)}</TableCell>
                      </TableRow>
                    ))}
                    {(data?.competitors ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          No competitors detected yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ChartCard>
            </div>
          </div>

          <ChartCard
            title="Top Organic Keywords"
            description="Highest-traffic keywords this domain ranks for"
            loading={loading}
            skeletonHeight={400}
            actions={
              <Button
                variant="outline"
                size="sm"
                disabled={!data || data.topKeywords.length === 0}
                onClick={() => data && exportRowsToCsv(`${data.domain}-keywords.csv`, data.topKeywords.map(kw => ({
                  keyword: kw.keyword, intent: kw.intent ?? '', position: kw.position,
                  volume: kw.volume, kd: kw.kd, cpc: kw.cpc, traffic: kw.traffic, url: kw.url,
                })))}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            }
          >
            <TopKeywordsTable keywords={data?.topKeywords ?? []} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
