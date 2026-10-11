import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, FileBarChart, Globe, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { trafficMarketService, type DomainScopedInput } from '../../services/trafficMarketService';
import type {
  ClickstreamTopPageRow,
  TrafficChannel,
  TrafficTopPagesResult,
  TrendingBucket,
} from '../../types/trafficMarket';
import { TRAFFIC_CHANNEL_LABELS } from '../../types/trafficMarket';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../../hooks/useSortedPagination';
import { DataTablePagination } from '../shared/DataTablePagination';
import { MiniSparkline } from '../shared/MiniSparkline';
import { ChartCard } from '../analytics/ChartCard';
import { HERO_BUTTON_CLASS, HERO_INPUT_CLASS, PageHero } from '../analytics/PageHero';
import { ErrorState } from '../analytics/StatusStates';
import { SortableHead } from '../analytics/SortableHead';
import { exportRowsToCsv } from '../analytics/exportCsv';
import { formatNumber } from '../analytics/format';
import { SERIES_COLORS } from '../analytics/chartTheme';
import { ExternalOpen, pageHref } from './shared/ExternalOpen';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TopGrowingPages } from './shared/TopGrowingPages';
import { TrafficFilterBar } from './shared/TrafficFilterBar';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { formatCompact, formatDuration, formatShare } from './shared/trafficFormat';

/** Stable initial input: domain omitted → backend resolves the primary domain. */
const INITIAL_INPUT: DomainScopedInput = {};

const TRENDING_TABS: Array<{ bucket: TrendingBucket; tabLabel: string; cardTitle: string; emptyMessage: string }> = [
  {
    bucket: 'growing',
    tabLabel: 'Growing',
    cardTitle: 'Top Growing Pages',
    emptyMessage: 'No growing pages detected this period.',
  },
  {
    bucket: 'declining',
    tabLabel: 'Declining',
    cardTitle: 'Top Declining Pages',
    emptyMessage: 'No declining pages detected this period.',
  },
  {
    bucket: 'new',
    tabLabel: 'Newly Detected',
    cardTitle: 'Newly Detected Pages',
    emptyMessage: 'No newly detected pages this period.',
  },
];

/** Fixed channel order so segment colors stay stable across rows. */
const CHANNEL_ORDER = Object.keys(TRAFFIC_CHANNEL_LABELS) as TrafficChannel[];

function channelColor(channel: TrafficChannel): string {
  return SERIES_COLORS[CHANNEL_ORDER.indexOf(channel) % SERIES_COLORS.length];
}

/** Expanded-row content: one thin segmented bar + legend chips per channel. */
function ChannelBreakdown({ channelShares }: { channelShares: ClickstreamTopPageRow['channelShares'] }) {
  const entries = CHANNEL_ORDER
    .map(channel => ({ channel, share: channelShares[channel] ?? 0 }))
    .filter(entry => entry.share > 0);
  const total = entries.reduce((sum, entry) => sum + entry.share, 0);

  if (entries.length === 0 || total <= 0) {
    return <p className="py-2 text-sm text-muted-foreground">No channel breakdown available for this page.</p>;
  }

  return (
    <div className="space-y-2.5 py-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Traffic by channel</p>
      <div className="flex h-2 w-full overflow-hidden rounded-full ring-1 ring-black/[0.06]">
        {entries.map(entry => (
          <div
            key={entry.channel}
            title={`${TRAFFIC_CHANNEL_LABELS[entry.channel]} · ${formatShare(entry.share)}`}
            style={{ width: `${(entry.share / total) * 100}%`, background: channelColor(entry.channel) }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(entry => (
          <span
            key={entry.channel}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-xs ring-1 ring-black/[0.05]"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: channelColor(entry.channel) }} />
            {TRAFFIC_CHANNEL_LABELS[entry.channel]}
            <span className="font-semibold tabular-nums">{formatShare(entry.share)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * TMP-02 sortable, expandable traffic table with pagination. Null-tolerant:
 * `yearTrend: null` renders a dash, and the clickstream-only engagement
 * columns (Unique Pageviews / Unique Visitors / Avg Visit Duration) hide
 * entirely on 'dataforseo' where no row carries values.
 */
function TopPagesTable({ rows, domain }: { rows: ClickstreamTopPageRow[]; domain?: string }) {
  const table = useSortedPagination(rows, 'trafficShare');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const maxShare = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.trafficShare), 0),
    [rows],
  );

  const hasEngagement = useMemo(
    () =>
      rows.some(
        row => row.uniquePageviews != null || row.uniqueVisitors != null || row.avgVisitDuration != null,
      ),
    [rows],
  );
  // Ranked-keyword counts come from the DataForSEO path — hidden entirely
  // when no row carries one (clickstream snapshots).
  const hasKeywords = useMemo(() => rows.some(row => row.keywordCount != null), [rows]);
  // Page | Traffic Share | 1Y Trend | [Keywords] | [3 engagement cols] | Visits | expander.
  const columnCount = 5 + (hasEngagement ? 3 : 0) + (hasKeywords ? 1 : 0);

  const toggleExpanded = (page: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  };

  const head = (label: string, key: string, className?: string) => (
    <SortableHead
      label={label}
      sortKey={key}
      activeKey={table.sortKey}
      direction={table.direction}
      onSort={table.toggleSort}
      className={cn(className, table.sortKey === key && 'bg-accent/[0.06] text-foreground')}
    />
  );

  return (
    <>
      <div className="overflow-x-auto">
        <Table className="min-w-[880px]">
          <TableHeader>
            <TableRow>
              {head('Page', 'page')}
              {head('Traffic Share', 'trafficShare', 'w-44')}
              <TableHead className="w-28">1Y Trend</TableHead>
              {hasKeywords && head('Keywords', 'keywordCount', 'w-28')}
              {hasEngagement && head('Unique Pageviews', 'uniquePageviews', 'w-36')}
              {hasEngagement && head('Unique Visitors', 'uniqueVisitors', 'w-32')}
              {head('Visits', 'visits', 'w-28')}
              {hasEngagement && head('Avg Visit Duration', 'avgVisitDuration', 'w-36')}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.map(row => {
              const isExpanded = expanded.has(row.page);
              return (
                <Fragment key={row.page}>
                  <TableRow className="cursor-pointer" onClick={() => toggleExpanded(row.page)}>
                    <TableCell className="max-w-[320px]">
                      <span className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate font-medium" title={row.page}>
                          {row.page}
                        </span>
                        {domain && (
                          <ExternalOpen
                            href={pageHref(domain, row.page)}
                            label={`Open ${row.page} in a new tab`}
                          />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${maxShare > 0 ? (row.trafficShare / maxShare) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-sm">{formatShare(row.trafficShare)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.yearTrend ? (
                        <MiniSparkline data={row.yearTrend} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {hasKeywords && (
                      <TableCell className="tabular-nums">
                        {row.keywordCount != null ? formatNumber(row.keywordCount) : '—'}
                      </TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell className="tabular-nums">{formatCompact(row.uniquePageviews)}</TableCell>
                    )}
                    {hasEngagement && (
                      <TableCell className="tabular-nums">{formatCompact(row.uniqueVisitors)}</TableCell>
                    )}
                    <TableCell className="tabular-nums">{formatCompact(row.visits)}</TableCell>
                    {hasEngagement && (
                      <TableCell className="tabular-nums">{formatDuration(row.avgVisitDuration)}</TableCell>
                    )}
                    <TableCell>
                      <button
                        type="button"
                        aria-label={isExpanded ? 'Collapse channel breakdown' : 'Expand channel breakdown'}
                        aria-expanded={isExpanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(row.page);
                        }}
                        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="bg-muted/30">
                        <ChannelBreakdown channelShares={row.channelShares} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {table.pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-8 text-center text-sm text-muted-foreground">
                  No pages match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Range visibility for large pulls — DataTablePagination shows only totals. */}
      {table.totalItems > 0 && (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          Showing {(table.page - 1) * table.pageSize + 1}–
          {Math.min(table.page * table.pageSize, table.totalItems)} of {table.totalItems} pages
        </p>
      )}
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
 * Traffic & Market · Top Pages (Session 31, TMP-01..02) — per-page
 * clickstream traffic for any domain. Sibling of the ORGANIC Top Pages under
 * Domain Analytics: same house feel, but powered by the Similarweb-adapter
 * clickstream backend instead of ranked-keyword estimates.
 */
export function TrafficTopPagesPage() {
  // History-first: consult saved searches before firing any API call. The
  // initial input stays undefined while checking (and forever, once saved
  // history exists), so the query only auto-runs on a true first visit; with
  // history, the HistoryGate below offers the last searches instead.
  const historyFirst = useHistoryFirst('top-pages');
  const query = useAnalyticsQuery(
    trafficMarketService.topPages,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );

  // Domain control — seeded once from the first data object (live or snapshot).
  const [domainInput, setDomainInput] = useState('');
  const seededRef = useRef(false);

  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  const runWith = (domain: string, monthWindow: number) => {
    const input: DomainScopedInput = domain ? { domain } : {};
    if (monthWindow !== 12) input.months = monthWindow;
    query.run(input);
  };

  // Snapshot view: the page is a single topPages section, so a loaded
  // snapshot replaces the whole data object; Apply returns to live.
  const history = useHistorySnapshot<TrafficTopPagesResult>({
    // "Refresh live data" refetches the domain the snapshot shows.
    onRefreshLive: snapshot => runWith(snapshot.payload.domain || domainInput.trim(), months),
  });
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as TrafficTopPagesResult | null)?.rows)
      ? (history.snapshot.payload as TrafficTopPagesResult)
      : null;
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

  useEffect(() => {
    if (data && !seededRef.current) {
      seededRef.current = true;
      setDomainInput(data.domain);
    }
  }, [data]);

  const applyDomain = () => {
    if (query.loading) return;
    history.clearSnapshot();
    runWith(domainInput.trim(), months);
  };

  const onMonthsChange = (monthWindow: number) => {
    setMonths(monthWindow);
    history.clearSnapshot();
    runWith(domainInput.trim(), monthWindow);
  };

  const [bucket, setBucket] = useState<TrendingBucket>('growing');
  const activeTab = TRENDING_TABS.find(tab => tab.bucket === bucket) ?? TRENDING_TABS[0];
  const trendingCards = useMemo(
    () =>
      (data?.trending ?? [])
        .filter(card => card.bucket === bucket)
        .map(({ page, visits, changePct, trend }) => ({ page, visits, changePct, trend })),
    [data, bucket],
  );

  const [pageFilter, setPageFilter] = useState('');
  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    const needle = pageFilter.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row => row.page.toLowerCase().includes(needle));
  }, [data, pageFilter]);

  const exportCsv = () => {
    if (!data) return;
    exportRowsToCsv(
      `${data.domain}-traffic-top-pages.csv`,
      filteredRows.map(row => ({
        page: row.page,
        trafficShare: row.trafficShare,
        keywordCount: row.keywordCount,
        uniquePageviews: row.uniquePageviews,
        uniqueVisitors: row.uniqueVisitors,
        visits: row.visits,
        avgVisitDurationSeconds: row.avgVisitDuration,
      })),
    );
  };

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Traffic & Market"
        title={`Top Pages${data ? `: ${data.domain}` : ''}`}
        icon={FileBarChart}
        description="Per-page traffic for any domain — trending movers, traffic share, and channel mix. Distinct from the organic Top Pages under Domain Analytics."
        actions={<HistoryPanel page="top-pages" onLoad={history.loadSnapshot} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-md">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyDomain()}
              placeholder="Enter a domain, e.g. elitetravelhackers.com"
              data-hero-search-input=""
              className={cn('h-10 pl-9', HERO_INPUT_CLASS)}
            />
          </div>
          <Button onClick={applyDomain} disabled={query.loading} className={cn('h-10', HERO_BUTTON_CLASS)}>
            {query.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </div>
      </PageHero>

      {history.banner}
      <SampleDataBanner meta={data?.meta} />
      <ProviderCaption meta={data?.meta} />

      {/* Cross-page filter row — hidden during snapshot view (fixed period). */}
      {!history.snapshot && data && data.meta.dataSource !== 'disabled' && (
        <TrafficFilterBar
          months={months}
          onMonthsChange={onMonthsChange}
          region={data.meta.region}
          disabled={query.loading}
        />
      )}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : data?.meta.dataSource === 'disabled' ? (
        <SimilarwebDisabledCard />
      ) : (
        <>
          {/* TMP-01 · Trending pages by bucket — on 'dataforseo' the buckets
              come from diffing history snapshots; until two exist the backend
              sends an explanatory trendingNote instead. */}
          <TopGrowingPages
            cards={trendingCards}
            loading={loading}
            title={activeTab.cardTitle}
            domain={data?.domain}
            emptyMessage={data?.trendingNote ?? activeTab.emptyMessage}
            actions={
              <Tabs value={bucket} onValueChange={(value) => setBucket(value as TrendingBucket)}>
                <TabsList>
                  {TRENDING_TABS.map(tab => (
                    <TabsTrigger key={tab.bucket} value={tab.bucket}>
                      {tab.tabLabel}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            }
          />

          {/* TMP-02 · Top pages traffic table */}
          <ChartCard
            title="Top Pages"
            description={
              data ? `${formatNumber(data.rows.length)} pages ranked by traffic share` : undefined
            }
            loading={loading}
            skeletonHeight={480}
            actions={
              <div className="flex items-center gap-2">
                <Input
                  value={pageFilter}
                  onChange={(e) => setPageFilter(e.target.value)}
                  placeholder="Filter by page…"
                  className="h-8 w-52"
                />
                <Button variant="outline" size="sm" disabled={filteredRows.length === 0} onClick={exportCsv}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            }
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {/* Max-results visibility: how much of the upstream set was pulled. */}
              {data && data.totalCount > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {data.pulledCount >= data.totalCount
                    ? `Showing all ${formatNumber(data.pulledCount)} of ${formatNumber(data.totalCount)} pages`
                    : `Showing ${formatNumber(data.pulledCount)} of ${formatNumber(data.totalCount)} pages`}
                </Badge>
              )}
              {pageFilter.trim() && (
                <Badge variant="secondary" className="font-normal">
                  {formatNumber(filteredRows.length)} of {formatNumber(data?.rows.length ?? 0)} pages match
                  “{pageFilter.trim()}”
                </Badge>
              )}
            </div>
            <TopPagesTable rows={filteredRows} domain={data?.domain} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
