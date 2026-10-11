import { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FileSearch, Minus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { OrganicResearchInput, OrganicResearchResult, PositionKeyword } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../hooks/useSortedPagination';
import { KDBar } from './shared/KDBar';
import { DataTablePagination } from './shared/DataTablePagination';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { AnalyticsIntentBadge } from './analytics/AnalyticsIntentBadge';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { ChartCard } from './analytics/ChartCard';
import { CoverageCaption } from './analytics/CoverageCaption';
import { MetricCard } from './analytics/MetricCard';
import { ErrorState } from './analytics/StatusStates';
import { SortableHead } from './analytics/SortableHead';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCompact, formatCurrency, formatNumber } from './analytics/format';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from './analytics/chartTheme';
import { ChartGradient, InlineBar, IntentSplit, PositionChip, type IntentSlice } from './analytics/dataViz';
import { exportRowsToCsv } from './analytics/exportCsv';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INITIAL_INPUT: OrganicResearchInput = { domain: DEFAULT_DOMAIN };

type MovementFilter = 'all' | 'new' | 'improved' | 'declined' | 'lost';

const MOVEMENT_COLORS: Array<{ key: 'newKeywords' | 'improved' | 'declined' | 'lost'; label: string; color: string }> = [
  { key: 'newKeywords', label: 'New', color: '#22c55e' },
  { key: 'improved', label: 'Improved', color: '#0093A7' },
  { key: 'declined', label: 'Declined', color: '#f59e0b' },
  { key: 'lost', label: 'Lost', color: '#ef4444' },
];

/** Colored movement bars — the week's keyword churn at a glance. */
function MovementSummary({ metrics }: { metrics: OrganicResearchResult['metrics'] | undefined }) {
  const max = Math.max(1, ...MOVEMENT_COLORS.map(m => metrics?.[m.key] ?? 0));
  return (
    <div className="space-y-3 pt-1">
      {MOVEMENT_COLORS.map(m => {
        const value = metrics?.[m.key] ?? 0;
        return (
          <div key={m.key} className="flex items-center gap-2 text-sm">
            <span className="w-20 text-xs font-medium text-muted-foreground">{m.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / max) * 100}%`, background: m.color }} />
            </div>
            <span className="w-12 text-right font-semibold tabular-nums">{value.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

function PositionCell({ row }: { row: PositionKeyword }) {
  return (
    <div className="flex items-center gap-1.5">
      <PositionChip position={row.position} />
      {row.isLost ? (
        <Badge className="bg-red-100 px-1.5 py-0 text-[10px] text-red-700 hover:bg-red-100" title="No longer ranking — position shown is the last known rank">
          Lost
        </Badge>
      ) : row.isNew ? (
        <Badge className="bg-accent text-accent-foreground hover:bg-accent px-1.5 py-0 text-[10px]">New</Badge>
      ) : row.change !== null && row.change !== 0 ? (
        <span className={`flex items-center text-xs tabular-nums ${row.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {row.change > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(row.change)}
        </span>
      ) : (
        <Minus className="h-3 w-3 text-muted-foreground" />
      )}
    </div>
  );
}

function MovementTable({ rows }: { rows: PositionKeyword[] }) {
  const table = useSortedPagination(rows, 'traffic');
  const maxVolume = Math.max(1, ...rows.map(r => r.volume));
  const maxTraffic = Math.max(1, ...rows.map(r => r.traffic));
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
            {head('Position', 'position', 'w-28')}
            {head('Volume', 'volume', 'w-24')}
            {head('KD', 'kd', 'w-28')}
            {head('CPC', 'cpc', 'w-20')}
            {head('Traffic', 'traffic', 'w-24')}
            {head('URL', 'url')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map(row => (
            <TableRow key={`${row.keyword}-${row.url}`}>
              <TableCell className="font-medium">{row.keyword}</TableCell>
              <TableCell><AnalyticsIntentBadge intent={row.intent} /></TableCell>
              <TableCell><PositionCell row={row} /></TableCell>
              <TableCell><InlineBar value={row.volume} max={maxVolume} label={formatNumber(row.volume)} /></TableCell>
              <TableCell><KDBar kd={row.kd} /></TableCell>
              <TableCell className="tabular-nums">{formatCurrency(row.cpc)}</TableCell>
              <TableCell><InlineBar value={row.traffic} max={maxTraffic} label={formatNumber(row.traffic)} /></TableCell>
              <TableCell className="max-w-[240px]">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-xs text-muted-foreground hover:text-accent hover:underline"
                >
                  {row.url}
                </a>
              </TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                No keywords in this segment.
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
 * Organic Research — SEMRush-style position changes: new / improved / declined
 * counters, ranking distribution, and a per-keyword movement table.
 */
export function OrganicResearchPage() {
  // History-first: consult saved searches before firing any API call. The
  // initial input stays undefined while checking; with saved history the
  // query never auto-runs and the HistoryGate offers the last searches.
  const historyFirst = useHistoryFirst('organic-research');
  const query = useAnalyticsQuery(
    seoAnalyticsService.organicResearch,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;
  const [filter, setFilter] = useState<MovementFilter>('all');

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<OrganicResearchResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as OrganicResearchResult | null)?.keywords)
      ? (history.snapshot.payload as OrganicResearchResult)
      : null;
  const onSubmit = useCallback((domain: string) => { clearSnapshot(); run({ domain }); }, [run, clearSnapshot]);

  const data: OrganicResearchResult | null = snapshotData ?? query.data;
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


  const intentSlices = useMemo<IntentSlice[]>(() => {
    const agg = new Map<string, IntentSlice>();
    for (const kw of data?.keywords ?? []) {
      const intent = kw.intent ?? 'unknown';
      const slice = agg.get(intent) ?? { intent, count: 0, volume: 0 };
      slice.count += 1;
      slice.volume += kw.volume;
      agg.set(intent, slice);
    }
    return [...agg.values()].sort((a, b) => b.count - a.count);
  }, [data]);

  const filtered = useMemo(() => {
    const keywords = data?.keywords ?? [];
    switch (filter) {
      case 'new': return keywords.filter(k => k.isNew);
      case 'improved': return keywords.filter(k => k.isUp && !k.isNew);
      case 'declined': return keywords.filter(k => k.isDown);
      // CMS-36: lost keywords come from a dedicated historical pull — they
      // are no longer ranked, so they never appear in `keywords`.
      case 'lost': return data?.lostKeywords ?? [];
      default: return keywords;
    }
  }, [data, filter]);

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Organic Research${data ? `: ${data.domain}` : ''}`}
        description="Position changes across the domain's organic keywords — what's new, improving, and slipping."
        inputPlaceholder="Enter a domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="organic-research" onLoad={history.loadSnapshot} />}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Keywords" value={formatCompact(data?.metrics.keywords)} icon={FileSearch} loading={loading} />
            <MetricCard label="Est. Traffic" value={formatCompact(data?.metrics.traffic)} icon={TrendingUp} loading={loading} />
            <MetricCard label="New" value={formatCompact(data?.metrics.newKeywords)} icon={Sparkles} loading={loading} />
            <MetricCard label="Improved" value={formatCompact(data?.metrics.improved)} icon={ArrowUp} loading={loading} />
            <MetricCard label="Declined" value={formatCompact(data?.metrics.declined)} icon={ArrowDown} loading={loading} />
            <MetricCard label="Lost" value={formatCompact(data?.metrics.lost)} icon={TrendingDown} loading={loading} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Ranking Distribution"
            description="Organic keywords by Google position range"
            loading={loading}
            skeletonHeight={224}
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.rankingDistribution ?? []}>
                  <defs><ChartGradient id="organicBars" /></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="bucket" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <YAxis tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'hsl(188 100% 33% / 0.06)' }} />
                  <Bar dataKey="count" name="Keywords" fill="url(#organicBars)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Keyword Movement" description="Churn since the last DataForSEO update" loading={loading} skeletonHeight={224}>
            <MovementSummary metrics={data?.metrics} />
          </ChartCard>

          <ChartCard title="Keywords by Intent" description="Ranked keywords by search intent" loading={loading} skeletonHeight={224}>
            <IntentSplit slices={intentSlices} />
          </ChartCard>
          </div>

          <ChartCard
            title="Position Changes"
            description="Keyword movement since the previous DataForSEO update"
            loading={loading}
            skeletonHeight={480}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filtered.length === 0}
                  onClick={() => exportRowsToCsv(`${data?.domain ?? 'domain'}-position-changes.csv`, filtered.map(r => ({
                    keyword: r.keyword, intent: r.intent ?? '', position: r.position,
                    previousPosition: r.previousPosition ?? '', volume: r.volume, kd: r.kd,
                    cpc: r.cpc, traffic: r.traffic, url: r.url,
                  })))}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  CSV
                </Button>
              <Tabs value={filter} onValueChange={v => setFilter(v as MovementFilter)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="new">New</TabsTrigger>
                  <TabsTrigger value="improved">Improved</TabsTrigger>
                  <TabsTrigger value="declined">Declined</TabsTrigger>
                  <TabsTrigger value="lost">Lost</TabsTrigger>
                </TabsList>
              </Tabs>
              </div>
            }
          >
            <CoverageCaption data={data} noun="keywords" className="mb-2" />
            {filter === 'lost' && data && data.lostKeywords === undefined && (
              <p className="mb-2 text-xs text-muted-foreground">
                This saved result predates lost-keyword extraction — run a new search to fetch the actual lost keywords.
              </p>
            )}
            <MovementTable rows={filtered} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
