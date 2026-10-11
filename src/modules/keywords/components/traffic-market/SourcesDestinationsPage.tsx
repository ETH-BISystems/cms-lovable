import { useMemo, useState } from 'react';
import { ArrowRightLeft, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { trafficMarketService } from '../../services/trafficMarketService';
import type {
  SourceRow,
  SourcesDestinationsResult,
  TrafficChannel,
  TrafficMarketInput,
} from '../../types/trafficMarket';
import { TRAFFIC_CHANNEL_LABELS } from '../../types/trafficMarket';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../../hooks/useSortedPagination';
import { DataTablePagination } from '../shared/DataTablePagination';
import { ChartCard } from '../analytics/ChartCard';
import { PageHero } from '../analytics/PageHero';
import { ErrorState } from '../analytics/StatusStates';
import { SortableHead } from '../analytics/SortableHead';
import { exportRowsToCsv } from '../analytics/exportCsv';
import { formatNumber } from '../analytics/format';
import { SERIES_COLORS } from '../analytics/chartTheme';
import { ClickstreamGatedCard } from './shared/ClickstreamGatedCard';
import { ExternalOpen } from './shared/ExternalOpen';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TrafficFilterBar } from './shared/TrafficFilterBar';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { formatShare } from './shared/trafficFormat';

/** Stable initial input: domains omitted → backend default competitor set. */
const INITIAL_INPUT: TrafficMarketInput = {};

type View = 'sources' | 'destinations';
type ChannelFilter = TrafficChannel | 'total';
const ALL_CATEGORIES = 'all';

/** Chip order: Total first, then the canonical TrafficChannel taxonomy order. */
const CHIP_ORDER: ChannelFilter[] = ['total', ...(Object.keys(TRAFFIC_CHANNEL_LABELS) as TrafficChannel[])];

function channelChipLabel(channel: ChannelFilter): string {
  return channel === 'total' ? 'Total' : TRAFFIC_CHANNEL_LABELS[channel];
}

/** Pill-chip row from `channelCounts`; the active chip is the channel filter. */
function ChannelChips({
  counts,
  active,
  onSelect,
}: {
  counts: Array<{ channel: ChannelFilter; count: number }>;
  active: ChannelFilter;
  onSelect: (channel: ChannelFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.map(entry => {
        const isActive = entry.channel === active;
        return (
          <button
            key={entry.channel}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(entry.channel)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground ring-accent'
                : 'bg-muted/50 text-muted-foreground ring-black/[0.06] hover:bg-muted hover:text-foreground',
            )}
          >
            {channelChipLabel(entry.channel)}
            <span className="font-semibold tabular-nums">{formatNumber(entry.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Stacked horizontal bar segmented per domain (colors follow the legend). */
function GroupSplitBar({ split, domains }: { split: Record<string, number>; domains: string[] }) {
  const segments = domains
    .map((domain, i) => ({ domain, share: split[domain] ?? 0, color: SERIES_COLORS[i % SERIES_COLORS.length] }))
    .filter(segment => segment.share > 0);
  const total = segments.reduce((sum, segment) => sum + segment.share, 0);

  if (segments.length === 0 || total <= 0) {
    return <div className="h-2 w-full rounded-full bg-muted" />;
  }

  return (
    <div className="flex h-2 w-full min-w-[120px] overflow-hidden rounded-full ring-1 ring-black/[0.06]">
      {segments.map(segment => (
        <div
          key={segment.domain}
          title={`${segment.domain} · ${formatShare(segment.share / total)}`}
          style={{ width: `${(segment.share / total) * 100}%`, background: segment.color }}
        />
      ))}
    </div>
  );
}

/** SD-01/02 sortable table (same shape both ways) with pagination. */
function SourcesTable({
  rows,
  view,
  domains,
  multiChannelNames,
}: {
  rows: SourceRow[];
  view: View;
  domains: string[];
  /** Names that appear under more than one channel — get a channel sub-label. */
  multiChannelNames: ReadonlySet<string>;
}) {
  const table = useSortedPagination(rows, 'groupTrafficSharePct');

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
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              {head(view === 'sources' ? 'Source' : 'Destination', 'name')}
              {head('Category', 'category', 'w-40')}
              {head('Channel', 'channel', 'w-40')}
              <TableHead className="w-56">Group Traffic Split</TableHead>
              {head('Group Traffic Share', 'groupTrafficSharePct', 'w-40')}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.pageRows.map(row => (
              <TableRow key={`${row.channel}-${row.name}`}>
                <TableCell className="max-w-[280px]">
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-medium" title={row.name}>
                      {row.name}
                    </span>
                    {row.name.includes('.') && (
                      <ExternalOpen href={`https://${row.name}`} label={`Open ${row.name} in a new tab`} />
                    )}
                  </span>
                  {/* Same domain across channels → channel-qualified sub-label. */}
                  {multiChannelNames.has(row.name) && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {row.name} · {TRAFFIC_CHANNEL_LABELS[row.channel]}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {row.category ? (
                    <Badge variant="secondary" className="font-normal text-muted-foreground">
                      {row.category}
                    </Badge>
                  ) : (
                    <span className="text-xs italic text-muted-foreground/70">No category</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{TRAFFIC_CHANNEL_LABELS[row.channel]}</Badge>
                </TableCell>
                <TableCell>
                  <GroupSplitBar split={row.groupTrafficSplit} domains={domains} />
                </TableCell>
                <TableCell className="tabular-nums">{row.groupTrafficSharePct.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
            {table.pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No {view === 'sources' ? 'sources' : 'destinations'} match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
 * Traffic & Market · Sources & Destinations (Session 41, SD-01..02) — every
 * referring source across all ten channels, plus where visitors go next,
 * rolled up across the configured domain set.
 */
export function SourcesDestinationsPage() {
  // History-first: consult saved searches before firing any API call. The
  // initial input stays undefined while checking (and forever, once saved
  // history exists), so the query only auto-runs on a true first visit; with
  // saved history the query never auto-runs and the HistoryGate below offers
  // the last searches.
  const historyFirst = useHistoryFirst('sources');
  const query = useAnalyticsQuery(
    trafficMarketService.sources,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );

  const [view, setView] = useState<View>('sources');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('total');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  // Snapshot view: one sources section feeds the page, so a loaded snapshot
  // replaces the data object wholesale.
  const history = useHistorySnapshot<SourcesDestinationsResult>({
    // "Refresh live data" — same rollup the page always fetches (the backend
    // resolves the configured competitor set).
    onRefreshLive: () => query.run(months !== 12 ? { months } : {}),
  });
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as SourcesDestinationsResult | null)?.sources)
      ? (history.snapshot.payload as SourcesDestinationsResult)
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

  const onMonthsChange = (monthWindow: number) => {
    setMonths(monthWindow);
    history.clearSnapshot();
    query.run(monthWindow !== 12 ? { months: monthWindow } : {});
  };

  const allRows = useMemo(
    () => (view === 'sources' ? data?.sources : data?.destinations) ?? [],
    [data, view],
  );

  /**
   * Chips in canonical channel order — Total first, Google AI Mode in its
   * taxonomy slot when present. Channels present in the rows but missing from
   * the backend counts get a computed chip so no channel is invisible.
   */
  const chipCounts = useMemo(() => {
    const counts = new Map<ChannelFilter, number>(
      (data?.channelCounts ?? []).map(entry => [entry.channel, entry.count]),
    );
    for (const row of allRows) {
      if (!counts.has(row.channel)) {
        counts.set(row.channel, allRows.reduce((n, r) => n + (r.channel === row.channel ? 1 : 0), 0));
      }
    }
    return CHIP_ORDER.filter(channel => counts.has(channel)).map(channel => ({
      channel,
      count: counts.get(channel) ?? 0,
    }));
  }, [data, allRows]);

  /** Names appearing under more than one channel — need disambiguation. */
  const multiChannelNames = useMemo(() => {
    const channelsByName = new Map<string, Set<TrafficChannel>>();
    for (const row of allRows) {
      const set = channelsByName.get(row.name) ?? new Set<TrafficChannel>();
      set.add(row.channel);
      channelsByName.set(row.name, set);
    }
    return new Set([...channelsByName].filter(([, set]) => set.size > 1).map(([name]) => name));
  }, [allRows]);

  const filteredRows = useMemo(
    () =>
      allRows.filter(
        row =>
          (channelFilter === 'total' || row.channel === channelFilter) &&
          (category === ALL_CATEGORIES || row.category === category),
      ),
    [allRows, channelFilter, category],
  );

  /** Domain set for the split bars — stable order shared with the legend. */
  const domains = useMemo(() => {
    const seen = new Set<string>();
    for (const row of allRows) {
      for (const domain of Object.keys(row.groupTrafficSplit)) seen.add(domain);
    }
    return [...seen];
  }, [allRows]);

  const exportCsv = () => {
    exportRowsToCsv(
      `traffic-${view}.csv`,
      filteredRows.map(row => ({
        name: row.name,
        category: row.category,
        channel: TRAFFIC_CHANNEL_LABELS[row.channel],
        ...Object.fromEntries(domains.map(domain => [domain, row.groupTrafficSplit[domain] ?? 0])),
        groupTrafficSharePct: row.groupTrafficSharePct,
      })),
    );
  };

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Traffic & Market"
        title="Sources & Destinations"
        icon={ArrowRightLeft}
        description="Every referring source across all channels — and where visitors go next — rolled up across the competitive domain set."
        actions={<HistoryPanel page="sources" onLoad={history.loadSnapshot} />}
      />

      {history.banner}
      <SampleDataBanner meta={data?.meta} />
      {/* CMS-38: when the rollup is gated, the gated card below is the single
          Similarweb notice — no duplicate caption on top. */}
      {!data?.gated && <ProviderCaption meta={data?.meta} />}

      {/* Cross-page filter row — hidden during snapshot view (fixed period)
          and when the rollup stands down (disabled / clickstream-gated). */}
      {!history.snapshot && data && data.meta.dataSource !== 'disabled' && !data.gated && (
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
          // This page has no hero search input — the rollup always targets the
          // configured competitor set — so "New search" fires the live fetch.
          onNewSearch={() => query.run(months !== 12 ? { months } : {})}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : data?.meta.dataSource === 'disabled' ? (
        <SimilarwebDisabledCard />
      ) : data?.gated ? (
        // Cross-channel source rollup is clickstream-only — on 'dataforseo'
        // the whole page body stands down cleanly (no empty chips or tables).
        <ClickstreamGatedCard
          title="Sources & Destinations needs the optional Similarweb integration"
          description="The cross-channel source and destination rollup is built from Similarweb clickstream data. No key is configured, so this page stands down — this is a missing optional integration, not an error. An admin can add a key under Settings → SEO API Integration; the page activates automatically once the key is verified."
        />
      ) : (
        <>
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="destinations">Destinations</TabsTrigger>
            </TabsList>
          </Tabs>

          <ChartCard
            title={view === 'sources' ? 'Traffic Sources' : 'Traffic Destinations'}
            description={
              view === 'sources'
                ? 'Where the group’s visitors come from, across every channel'
                : 'Where the group’s visitors go next after their visit'
            }
            loading={loading}
            skeletonHeight={520}
            actions={
              <Button variant="outline" size="sm" disabled={filteredRows.length === 0} onClick={exportCsv}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            }
          >
            <div className="space-y-4">
              {/* Channel-count chips double as the channel filter */}
              <ChannelChips counts={chipCounts} active={channelFilter} onSelect={setChannelFilter} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-56">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                    {(data?.categories ?? []).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Split-bar legend — one color per domain in the set */}
                {domains.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3">
                    {domains.map((domain, i) => (
                      <span key={domain} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                        />
                        {domain}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <SourcesTable
                rows={filteredRows}
                view={view}
                domains={domains}
                multiChannelNames={multiChannelNames}
              />
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
