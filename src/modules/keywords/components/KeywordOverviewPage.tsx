import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Clock, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import { subscribeToKeywordHistory, type KeywordHistoryEntry } from '../services/keywordHistoryService';
import type { IdeaKeyword, KeywordOverviewResult } from '../types/analytics';
import type { HistoryGetResult } from '../types/trafficMarket';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { KDBar } from './shared/KDBar';
import { MiniSparkline } from './shared/MiniSparkline';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { AnalyticsIntentBadge } from './analytics/AnalyticsIntentBadge';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { ChartCard } from './analytics/ChartCard';
import { KDGauge } from './analytics/KDGauge';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { featureLabel, formatCompact, formatCurrency, formatMonthLabel, formatNumber } from './analytics/format';
import { ChartGradient, PositionChip } from './analytics/dataViz';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE } from './analytics/chartTheme';

function GlobalVolumeList({ rows }: { rows: KeywordOverviewResult['globalVolume'] }) {
  const max = Math.max(1, ...rows.map(r => r.volume));
  return (
    <div className="space-y-2">
      {rows.map(row => (
        <div key={row.code} className="flex items-center gap-2 text-sm">
          <span className="w-8 text-xs font-medium text-muted-foreground">{row.code}</span>
          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(row.volume / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right text-xs tabular-nums">{formatCompact(row.volume)}</span>
        </div>
      ))}
    </div>
  );
}

function IdeasTable({ ideas }: { ideas: IdeaKeyword[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead className="w-24 text-right">Volume</TableHead>
          <TableHead className="w-28">KD</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ideas.slice(0, 10).map(idea => (
          <TableRow key={idea.keyword}>
            <TableCell className="font-medium">{idea.keyword}</TableCell>
            <TableCell className="text-right tabular-nums">{formatNumber(idea.volume)}</TableCell>
            <TableCell><KDBar kd={idea.kd} /></TableCell>
          </TableRow>
        ))}
        {ideas.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
              No keywords found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function relativeDate(date: Date | null): string {
  if (!date) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

interface HistoryRailProps {
  entries: KeywordHistoryEntry[];
  activeKeyword: string | null;
  compareMode: boolean;
  compareIds: string[];
  onOpen: (entry: KeywordHistoryEntry) => void;
  onToggleCompare: () => void;
  onPick: (entry: KeywordHistoryEntry) => void;
}

/** Saved analyses: instant re-open (no API cost) and side-by-side compare. */
function HistoryRail({ entries, activeKeyword, compareMode, compareIds, onOpen, onToggleCompare, onPick }: HistoryRailProps) {
  if (entries.length === 0) return null;
  return (
    <div className="animate-fade-up space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Recent analyses — saved, re-open free
        </p>
        {entries.length >= 2 && (
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleCompare}
          >
            <ArrowLeftRight className="mr-1.5 h-3 w-3" />
            {compareMode ? `Comparing — pick ${2 - compareIds.length} more` : 'Compare'}
          </Button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {entries.map(entry => {
          const picked = compareIds.includes(entry.id);
          return (
            <button
              key={entry.id}
              onClick={() => (compareMode ? onPick(entry) : onOpen(entry))}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md',
                activeKeyword === entry.keyword && !compareMode && 'border-accent ring-1 ring-accent/30',
                picked && 'border-accent bg-accent/5 ring-1 ring-accent/40',
              )}
            >
              <div>
                <p className="max-w-40 truncate text-sm font-medium">{entry.keyword}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatCompact(entry.volume)}/mo · KD {entry.kd} · {relativeDate(entry.fetchedAt)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Side-by-side compare of two saved analyses. */
function CompareView({ a, b, onClose }: { a: KeywordOverviewResult; b: KeywordOverviewResult; onClose: () => void }) {
  const rows: Array<{ label: string; value: (r: KeywordOverviewResult) => string }> = [
    { label: 'US volume', value: r => formatNumber(r.volume) },
    { label: 'Google Ads verified', value: r => r.adsVolume ? formatNumber(r.adsVolume.volume) : '—' },
    { label: 'Keyword difficulty', value: r => `${r.kd}${r.kdSource === 'estimated' ? ' (est.)' : ''}` },
    { label: 'Intent', value: r => r.intent ?? '—' },
    { label: 'CPC', value: r => formatCurrency(r.cpc) },
    { label: 'Top-of-page bid', value: r => r.adsVolume && r.adsVolume.highBid > 0 ? `${formatCurrency(r.adsVolume.lowBid)}–${formatCurrency(r.adsVolume.highBid)}` : '—' },
    { label: 'Avg. backlinks (top 10)', value: r => formatNumber(r.avgBacklinks) },
    { label: 'Avg. ref. domains (top 10)', value: r => formatNumber(r.avgReferringDomains) },
    { label: 'Results in Google', value: r => formatCompact(r.resultsCount) },
    { label: 'Keyword variations', value: r => formatNumber(r.variationsTotal) },
    { label: 'Question keywords', value: r => formatNumber(r.questions.length) },
    { label: 'SERP features', value: r => String(r.serpFeatures.length) },
  ];
  const sharedSerpDomains = a.serp.map(s => s.domain).filter(d => b.serp.some(s2 => s2.domain === d));

  return (
    <ChartCard
      title={`Compare: "${a.keyword}" vs "${b.keyword}"`}
      description="Saved analyses, side by side — no re-fetch needed"
      actions={<Button variant="ghost" size="sm" onClick={onClose}><X className="mr-1 h-3.5 w-3.5" />Exit compare</Button>}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="w-56 font-semibold text-foreground">{a.keyword}</TableHead>
            <TableHead className="w-56 font-semibold text-foreground">{b.keyword}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const va = row.value(a);
            const vb = row.value(b);
            return (
              <TableRow key={row.label}>
                <TableCell className="text-muted-foreground">{row.label}</TableCell>
                <TableCell className={cn('font-medium tabular-nums', va !== vb && 'text-accent')}>{va}</TableCell>
                <TableCell className={cn('font-medium tabular-nums', va !== vb && 'text-accent')}>{vb}</TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell className="text-muted-foreground">Trend (12 mo)</TableCell>
            <TableCell><MiniSparkline data={a.trend.map(t => t.volume)} width={120} height={28} /></TableCell>
            <TableCell><MiniSparkline data={b.trend.map(t => t.volume)} width={120} height={28} /></TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground">Shared top-10 domains</TableCell>
            <TableCell colSpan={2}>
              <div className="flex flex-wrap gap-1">
                {sharedSerpDomains.length > 0
                  ? sharedSerpDomains.map(d => <Badge key={d} variant="outline" className="text-[11px]">{d}</Badge>)
                  : <span className="text-xs text-muted-foreground">No overlap — distinct SERPs</span>}
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ChartCard>
  );
}

/**
 * Keyword Overview — SEMRush-style single-keyword deep dive with saved
 * history and side-by-side compare. Every analysis is persisted; re-opening
 * from the rail is instant and free.
 */
export function KeywordOverviewPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.keywordOverview);
  const { run } = query;

  const [history, setHistory] = useState<KeywordHistoryEntry[]>([]);
  const [viewed, setViewed] = useState<KeywordOverviewResult | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // CMS-33: active SERP-feature filters (chips in the SERP Analysis card).
  const [serpFeatureFilters, setSerpFeatureFilters] = useState<Set<string>>(new Set());

  useEffect(() => subscribeToKeywordHistory(setHistory, () => {}), []);

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate offers the last searches — no API call.
  const historyFirst = useHistoryFirst('keyword-overview');

  // Snapshot view — a loaded snapshot replaces live data, the rail's "viewed"
  // entry, and any active compare until the user searches or goes back to live.
  const snapshots = useHistorySnapshot<KeywordOverviewResult>({
    // "Refresh live data" re-analyzes the snapshot's own keyword.
    onRefreshLive: snapshot => {
      if (snapshot.payload.keyword) run({ keyword: snapshot.payload.keyword });
    },
  });
  const { clearSnapshot, loadSnapshot } = snapshots;
  const snapshotData =
    snapshots.snapshot && Array.isArray((snapshots.snapshot.payload as KeywordOverviewResult | null)?.trend)
      ? (snapshots.snapshot.payload as KeywordOverviewResult)
      : null;
  const onLoadSnapshot = useCallback((snapshot: HistoryGetResult) => {
    setViewed(null);
    setCompareMode(false);
    setCompareIds([]);
    setSerpFeatureFilters(new Set());
    loadSnapshot(snapshot);
  }, [loadSnapshot]);

  const onSubmit = useCallback((keyword: string) => {
    setViewed(null);
    setCompareMode(false);
    setCompareIds([]);
    setSerpFeatureFilters(new Set());
    clearSnapshot();
    run({ keyword });
  }, [run, clearSnapshot]);

  const data: KeywordOverviewResult | null = snapshotData ?? viewed ?? query.data;
  const loading = snapshotData ? false : (historyFirst.checking || query.loading) && !viewed;
  const started = historyFirst.checking || query.loading || query.error !== null || data !== null;

  const comparePair = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const a = history.find(h => h.id === compareIds[0]);
    const b = history.find(h => h.id === compareIds[1]);
    return a && b ? ([a.result, b.result] as const) : null;
  }, [compareIds, history]);

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !snapshots.snapshot &&
    !viewed &&
    !comparePair &&
    !query.data &&
    !query.loading &&
    !query.error;

  // CMS-33: the SERP-feature chips are real filters over the live top-10.
  // Features carried by at least one result are clickable; page-level
  // features with no matching organic result stay as informational chips.
  const serpRows = useMemo(() => data?.serp ?? [], [data]);
  const filterableFeatures = useMemo(() => {
    const set = new Set<string>();
    for (const row of serpRows) for (const f of row.features ?? []) set.add(f);
    return set;
  }, [serpRows]);
  const legendOnlyFeatures = useMemo(
    () => (data?.serpFeatures ?? []).filter(f => !filterableFeatures.has(f)),
    [data, filterableFeatures],
  );
  const toggleSerpFeature = useCallback((feature: string) => {
    setSerpFeatureFilters(prev => {
      const next = new Set(prev);
      if (next.has(feature)) next.delete(feature); else next.add(feature);
      return next;
    });
  }, []);
  const filteredSerp = useMemo(
    () => serpFeatureFilters.size === 0
      ? serpRows
      : serpRows.filter(row => (row.features ?? []).some(f => serpFeatureFilters.has(f))),
    [serpRows, serpFeatureFilters],
  );

  const trendDelta = useMemo(() => {
    const trend = data?.trend ?? [];
    if (trend.length < 2) return null;
    const first = trend[0].volume;
    const last = trend[trend.length - 1].volume;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Keyword Overview${data ? `: ${data.keyword}` : ''}`}
        description="Everything DataForSEO knows about one keyword — volume, difficulty, intent, trend, ideas, and the live SERP. Analyses are saved for instant re-open and compare."
        inputPlaceholder="Enter a keyword, e.g. travel hacking"
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="keyword-overview" onLoad={onLoadSnapshot} />}
      />

      {snapshots.banner}

      <HistoryRail
        entries={history}
        activeKeyword={data?.keyword ?? null}
        compareMode={compareMode}
        compareIds={compareIds}
        onOpen={entry => { clearSnapshot(); setViewed(entry.result); setCompareIds([]); setSerpFeatureFilters(new Set()); }}
        onToggleCompare={() => { clearSnapshot(); setCompareMode(m => !m); setCompareIds([]); }}
        onPick={entry => setCompareIds(ids =>
          ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id].slice(-2))}
      />

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => snapshots.loadSnapshot(snapshot, 'auto')}
        />
      ) : comparePair ? (
        <CompareView a={comparePair[0]} b={comparePair[1]} onClose={() => { setCompareMode(false); setCompareIds([]); }} />
      ) : !started ? (
        <EmptyPrompt message="Enter a keyword to see its full SEMRush-style overview — or re-open a saved analysis above." />
      ) : query.error && !viewed && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Volume" description="US monthly searches + global breakdown" loading={loading} skeletonHeight={200}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-3xl font-bold tracking-tight tabular-nums">{formatCompact(data?.volume)}</p>
                  <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
                    {formatCompact(data?.resultsCount)} results in Google
                    {data?.adsVolume ? ` · Google Ads verified: ${formatCompact(data.adsVolume.volume)}/mo` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {data && data.trend.length >= 2 && <MiniSparkline data={data.trend.map(t => t.volume)} width={90} height={30} />}
                  {trendDelta !== null && (
                    <span className={cn('text-[11px] font-medium tabular-nums', trendDelta >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {trendDelta >= 0 ? '+' : ''}{trendDelta}% / 12 mo
                    </span>
                  )}
                </div>
              </div>
              <GlobalVolumeList rows={data?.globalVolume ?? []} />
            </ChartCard>

            <ChartCard title="Keyword Difficulty" description="How hard it is to rank in the top 10" loading={loading} skeletonHeight={200}>
              <div className="flex h-full flex-col items-center justify-center py-2">
                <KDGauge value={data?.kd ?? 0} />
                {data?.kdSource === 'estimated' && (
                  <p className="mt-1 text-[10px] text-muted-foreground">estimated from top-10 authority</p>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Intent & Competition" description="Search intent, CPC, and top-10 authority" loading={loading} skeletonHeight={200}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Intent</span>
                  <span className="flex gap-1">
                    <AnalyticsIntentBadge intent={data?.intent ?? null} />
                    {data?.foreignIntents.map(fi => <AnalyticsIntentBadge key={fi} intent={fi} />)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">CPC</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(data?.cpc)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid Competition</span>
                  <span className="font-semibold capitalize">
                    {(data?.adsVolume?.competitionLevel ?? data?.competitionLevel)?.toLowerCase() ?? '—'}
                    {data?.adsVolume ? ` (${data.adsVolume.competitionIndex}/100)` : ''}
                  </span>
                </div>
                {data?.adsVolume && data.adsVolume.highBid > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Top-of-page bid</span>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(data.adsVolume.lowBid)}–{formatCurrency(data.adsVolume.highBid)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. Backlinks (top 10)</span>
                  <span className="font-semibold tabular-nums">{formatNumber(data?.avgBacklinks)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. Ref. Domains (top 10)</span>
                  <span className="font-semibold tabular-nums">{formatNumber(data?.avgReferringDomains)}</span>
                </div>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Search Volume Trend" description="Monthly searches over the last 12 months" loading={loading} skeletonHeight={224}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.trend ?? []}>
                  <defs><ChartGradient id="kwTrend" /></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatMonthLabel} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <YAxis tickFormatter={v => formatCompact(v as number)} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={l => formatMonthLabel(String(l))} cursor={{ fill: 'hsl(188 100% 33% / 0.06)' }} />
                  <Bar dataKey="volume" name="Searches" fill="url(#kwTrend)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Keyword Variations"
              description={data ? `${formatNumber(data.variationsTotal)} phrase-match keywords found` : undefined}
              loading={loading}
              skeletonHeight={320}
            >
              <IdeasTable ideas={data?.variations ?? []} />
            </ChartCard>
            <ChartCard
              title="Questions"
              description={data ? `${formatNumber(data.questions.length)} question keywords found` : undefined}
              loading={loading}
              skeletonHeight={320}
            >
              <IdeasTable ideas={data?.questions ?? []} />
            </ChartCard>
          </div>

          <ChartCard title="Related Keywords" description="Semantically related searches ('People also search for')" loading={loading} skeletonHeight={320}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-28">Intent</TableHead>
                  <TableHead className="w-24 text-right">Volume</TableHead>
                  <TableHead className="w-28">KD</TableHead>
                  <TableHead className="w-24 text-right">CPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.related ?? []).slice(0, 15).map(idea => (
                  <TableRow key={idea.keyword}>
                    <TableCell className="font-medium">{idea.keyword}</TableCell>
                    <TableCell><AnalyticsIntentBadge intent={idea.intent} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(idea.volume)}</TableCell>
                    <TableCell><KDBar kd={idea.kd} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(idea.cpc)}</TableCell>
                  </TableRow>
                ))}
                {(data?.related ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No related keywords found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ChartCard>

          <ChartCard
            title="SERP Analysis"
            description={serpFeatureFilters.size > 0
              ? `Live Google top 10 — filtered to results with ${[...serpFeatureFilters].map(featureLabel).join(', ')}`
              : 'Live Google top 10 for this keyword — click a feature chip to filter the results'}
            loading={loading}
            skeletonHeight={400}
            actions={
              data && (data.serpFeatures.length > 0 || filterableFeatures.size > 0) ? (
                <div className="flex max-w-[50%] flex-wrap items-center justify-end gap-1">
                  {/* CMS-33: chips backed by per-result data are real filters */}
                  {[...filterableFeatures].slice(0, 8).map(f => {
                    const active = serpFeatureFilters.has(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSerpFeature(f)}
                        title={active ? 'Clear this feature filter' : `Show only results with ${featureLabel(f)}`}
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                          active
                            ? 'border-accent bg-accent text-accent-foreground'
                            : 'border-border text-foreground hover:border-accent/60 hover:text-accent',
                        )}
                      >
                        {featureLabel(f)}
                      </button>
                    );
                  })}
                  {/* Page-level features with no matching organic result stay informational */}
                  {legendOnlyFeatures.slice(0, Math.max(0, 8 - filterableFeatures.size)).map(f => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="text-xs text-muted-foreground"
                      title={`${featureLabel(f)} is present on this SERP but not attached to a specific organic result`}
                    >
                      {featureLabel(f)}
                    </Badge>
                  ))}
                  {serpFeatureFilters.size > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSerpFeatureFilters(new Set())}>
                      <X className="mr-1 h-3 w-3" />
                      Clear
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="w-48">Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSerp.map(row => (
                  <TableRow key={`${row.position}-${row.url}`}>
                    <TableCell><PositionChip position={row.position} /></TableCell>
                    <TableCell>
                      <a href={row.url} target="_blank" rel="noreferrer" className="block font-medium hover:text-accent hover:underline">
                        {row.title || row.url}
                      </a>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.domain}
                      {(row.features ?? []).length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {row.features!.map(f => (
                            <Badge key={f} variant="secondary" className="px-1.5 py-0 text-[10px]">{featureLabel(f)}</Badge>
                          ))}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSerp.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                      {serpFeatureFilters.size > 0
                        ? 'No organic result carries the selected feature — clear the filter to see the full top 10.'
                        : 'No SERP results available.'}
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
