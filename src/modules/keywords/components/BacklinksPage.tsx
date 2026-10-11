import { useCallback } from 'react';
import { Award, Globe2, Link2, Network } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { BacklinkDistributionRow, BacklinkHistoryPoint, BacklinksInput, BacklinksResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { CoverageCaption } from './analytics/CoverageCaption';
import { MetricCard } from './analytics/MetricCard';
import { ErrorState } from './analytics/StatusStates';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCompact, formatMonthLabel, formatNumber } from './analytics/format';
import { AreaGradient, MiniDonut } from './analytics/dataViz';
import { exportRowsToCsv } from './analytics/exportCsv';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE, SERIES_COLORS } from './analytics/chartTheme';

const INITIAL_INPUT: BacklinksInput = { domain: DEFAULT_DOMAIN };

function DistributionList({ rows }: { rows: BacklinkDistributionRow[] }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.label} className="flex items-center gap-2 text-sm">
          <span className="w-16 truncate text-xs font-medium text-muted-foreground uppercase">{row.label}</span>
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">{formatCompact(row.count)}</span>
        </div>
      ))}
      {rows.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No data available.</p>}
    </div>
  );
}

function HistoryChart({ data, dataKey, name, color }: {
  data: BacklinkHistoryPoint[];
  dataKey: 'backlinks' | 'referringDomains';
  name: string;
  color: string;
}) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs><AreaGradient id={`blGrad-${dataKey}`} color={color} /></defs>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
          <XAxis dataKey="date" tickFormatter={formatMonthLabel} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
          <YAxis tickFormatter={v => formatCompact(v as number)} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={l => formatMonthLabel(String(l))} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={color} fill={`url(#blGrad-${dataKey})`} strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Backlink Analytics — SEMRush-style backlink profile from the DataForSEO
 * Backlinks API: authority, growth history, link attributes, anchors,
 * referring domains, and the strongest individual backlinks.
 */
export function BacklinksPage() {
  // History-first: check saved searches before any API call; with saved
  // history the query never auto-runs and the HistoryGate offers the last
  // searches.
  const historyFirst = useHistoryFirst('backlink-analytics');
  const query = useAnalyticsQuery(
    seoAnalyticsService.backlinks,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;

  // Snapshot view — render a saved search result instead of the live query.
  const snapshots = useHistorySnapshot<BacklinksResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = snapshots;
  const snapshotData =
    snapshots.snapshot && Array.isArray((snapshots.snapshot.payload as BacklinksResult | null)?.history)
      ? (snapshots.snapshot.payload as BacklinksResult)
      : null;
  const onSubmit = useCallback((domain: string) => { clearSnapshot(); run({ domain }); }, [run, clearSnapshot]);

  const data: BacklinksResult | null = snapshotData ?? query.data;
  const loading = snapshotData ? false : historyFirst.checking || query.loading;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !snapshots.snapshot &&
    !query.data &&
    !query.loading &&
    !query.error;

  const followTotal = (data?.metrics.dofollow ?? 0) + (data?.metrics.nofollow ?? 0);
  const followPct = followTotal > 0 ? Math.round(((data?.metrics.dofollow ?? 0) / followTotal) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Backlink Analytics${data ? `: ${data.domain}` : ''}`}
        description="Full backlink profile powered by the DataForSEO Backlinks API."
        inputPlaceholder="Enter a domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="backlink-analytics" onLoad={snapshots.loadSnapshot} />}
      />

      {snapshots.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => snapshots.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Authority Rank"
              value={data?.metrics.rank !== null && data?.metrics.rank !== undefined ? formatNumber(data.metrics.rank) : '—'}
              sub="DataForSEO domain rank (0–1000)"
              icon={Award}
              loading={loading}
            />
            <MetricCard
              label="Backlinks"
              value={formatCompact(data?.metrics.backlinks)}
              sub={data ? `${formatCompact(data.metrics.brokenBacklinks)} broken` : undefined}
              icon={Link2}
              loading={loading}
            />
            <MetricCard
              label="Referring Domains"
              value={formatCompact(data?.metrics.referringDomains)}
              icon={Globe2}
              loading={loading}
            />
            <MetricCard
              label="Referring IPs"
              value={formatCompact(data?.metrics.referringIps)}
              icon={Network}
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Referring Domains Over Time" description="Last 12 months" loading={loading} skeletonHeight={208}>
              <HistoryChart data={data?.history ?? []} dataKey="referringDomains" name="Referring Domains" color={SERIES_COLORS[0]} />
            </ChartCard>
            <ChartCard title="Backlinks Over Time" description="Last 12 months" loading={loading} skeletonHeight={208}>
              <HistoryChart data={data?.history ?? []} dataKey="backlinks" name="Backlinks" color={SERIES_COLORS[1]} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Link Profile" description="Follow ratio and link types" loading={loading} skeletonHeight={160}>
              <div className="space-y-4">
                <MiniDonut
                  centerLabel="links"
                  slices={[
                    { label: 'Follow', value: data?.metrics.dofollow ?? 0, color: 'hsl(188, 100%, 33%)' },
                    { label: 'Nofollow', value: data?.metrics.nofollow ?? 0, color: '#cbd5e1' },
                  ]}
                />
                <MiniDonut
                  centerLabel="types"
                  slices={(data?.linkTypes ?? []).slice(0, 5).map((row, i) => ({
                    label: row.label,
                    value: row.count,
                    color: ['#6366f1', '#0ea5e9', '#8b5cf6', '#f59e0b', '#94a3b8'][i],
                  }))}
                />
              </div>
            </ChartCard>
            <ChartCard title="Top TLDs" description="Referring domains by TLD" loading={loading} skeletonHeight={160}>
              <DistributionList rows={data?.tlds ?? []} />
            </ChartCard>
            <ChartCard title="Top Countries" description="Referring domains by country" loading={loading} skeletonHeight={160}>
              <DistributionList rows={data?.countries ?? []} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Top Anchors" description="Most common anchor texts" loading={loading} skeletonHeight={320}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anchor</TableHead>
                    <TableHead className="w-28 text-right">Backlinks</TableHead>
                    <TableHead className="w-32 text-right">Ref. Domains</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.anchors ?? []).map(row => (
                    <TableRow key={row.anchor}>
                      <TableCell className="max-w-[240px] truncate font-medium">{row.anchor}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.backlinks)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.referringDomains)}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.anchors ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No anchors found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>

            <ChartCard
              title="Top Referring Domains"
              description="Highest-authority linking domains"
              loading={loading}
              skeletonHeight={320}
              actions={
                <Button variant="outline" size="sm" disabled={(data?.referringDomainsList ?? []).length === 0}
                  onClick={() => data && exportRowsToCsv(`${data.domain}-referring-domains.csv`, data.referringDomainsList.map(r => ({
                    domain: r.domain, rank: r.rank, backlinks: r.backlinks, firstSeen: r.firstSeen ?? '',
                  })))}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  CSV
                </Button>
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead className="w-20 text-right">Rank</TableHead>
                    <TableHead className="w-28 text-right">Backlinks</TableHead>
                    <TableHead className="w-28">First Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.referringDomainsList ?? []).map(row => (
                    <TableRow key={row.domain}>
                      <TableCell className="max-w-[200px] truncate font-medium">{row.domain}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.rank)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.backlinks)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.firstSeen ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.referringDomainsList ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No referring domains found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          </div>

          <ChartCard title="Top Backlinks" description="Strongest individual backlinks (one per domain)" loading={loading} skeletonHeight={400}>
            <CoverageCaption data={data} noun="backlinks" className="mb-2" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Page</TableHead>
                  <TableHead>Anchor</TableHead>
                  <TableHead className="w-20 text-right">Rank</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead className="w-28">First Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.topBacklinks ?? []).map(row => (
                  <TableRow key={row.urlFrom}>
                    <TableCell className="max-w-[320px]">
                      <a href={row.urlFrom} target="_blank" rel="noreferrer" className="block truncate font-medium hover:text-accent hover:underline">
                        {row.pageTitle || row.urlFrom}
                      </a>
                      <p className="truncate text-xs text-muted-foreground">→ {row.urlTo}</p>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{row.anchor || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(row.rank)}</TableCell>
                    <TableCell>
                      <Badge variant={row.dofollow ? 'default' : 'secondary'} className="text-[10px]">
                        {row.dofollow ? 'Follow' : 'Nofollow'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.firstSeen ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {(data?.topBacklinks ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No backlinks found.</TableCell>
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
