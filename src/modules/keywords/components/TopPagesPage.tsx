import { useCallback, useMemo, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { callFunction, registerMockFunction } from '@/services/functionsService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { TopPageRow, TopPagesInput, TopPagesResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../hooks/useSortedPagination';
import { DataTablePagination } from './shared/DataTablePagination';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
import { CoverageCaption } from './analytics/CoverageCaption';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { exportRowsToCsv } from './analytics/exportCsv';
import { Download } from 'lucide-react';
import { ErrorState } from './analytics/StatusStates';
import { SortableHead } from './analytics/SortableHead';
import { PositionChip } from './analytics/dataViz';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCompact, formatNumber } from './analytics/format';
import { CHART_TOOLTIP_STYLE, SERIES_COLORS } from './analytics/chartTheme';

const INITIAL_INPUT: TopPagesInput = { domain: DEFAULT_DOMAIN };

// Mock stand-in for the production callable:
//   production: httpsCallable(functions, 'addToRefreshQueue')
// Registered here (the only consumer in this module) so the refresh-queue
// action succeeds in the mock; the pipeline module may re-register this name
// with its own store-backed handler once ported.
registerMockFunction('addToRefreshQueue', async () => ({ success: true }));

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
}

function PagesTable({ pages }: { pages: TopPageRow[] }) {
  const table = useSortedPagination(pages, 'traffic');
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
            {head('URL', 'url')}
            {head('Keywords', 'keywords', 'w-28')}
            {head('Traffic', 'traffic', 'w-28')}
            {head('Traffic %', 'trafficShare', 'w-28')}
            {head('Top Keyword', 'topKeyword')}
            {head('Position', 'topKeywordPosition', 'w-24')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map((page) => (
            <TableRow key={page.url}>
              <TableCell className="max-w-[320px]">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-medium hover:text-accent hover:underline"
                  title={page.url}
                >
                  {pathOf(page.url)}
                </a>
              </TableCell>
              <TableCell className="tabular-nums">{formatNumber(page.keywords)}</TableCell>
              <TableCell className="tabular-nums">{formatNumber(page.traffic)}</TableCell>
              <TableCell className="tabular-nums">{page.trafficShare}%</TableCell>
              <TableCell className="max-w-[220px] truncate">{page.topKeyword ?? '—'}</TableCell>
              <TableCell><PositionChip position={page.topKeywordPosition} /></TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No pages with organic traffic found.
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
 * Top Pages — the domain's best-performing pages by estimated traffic,
 * traffic concentration, and declining pages that need a refresh.
 */
export function TopPagesPage() {
  // History-first: check saved searches before any API call; the query only
  // auto-runs when the check resolves with no history at all (true first
  // visit). With saved history the query never auto-runs and the HistoryGate
  // below offers the last searches.
  const historyFirst = useHistoryFirst('top-pages-organic');
  const query = useAnalyticsQuery(
    seoAnalyticsService.topPages,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;
  const [queueing, setQueueing] = useState<string | null>(null);

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<TopPagesResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as TopPagesResult | null)?.pages)
      ? (history.snapshot.payload as TopPagesResult)
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

  const pieData = useMemo(() => {
    if (!data || data.pages.length === 0) return [];
    const top = data.pages.slice(0, 10).map((page) => ({
      name: pathOf(page.url),
      value: page.traffic,
    }));
    const rest = data.pages.slice(10).reduce((sum, page) => sum + page.traffic, 0);
    return rest > 0 ? [...top, { name: 'All other pages', value: rest }] : top;
  }, [data]);

  const addToQueue = async (url: string, topKeyword: string | null, lost: number, down: number) => {
    setQueueing(url);
    try {
      // production: httpsCallable(functions, 'addToRefreshQueue')
      await callFunction('addToRefreshQueue', {
        title: pathOf(url),
        refreshReason: `Declining organic performance: ${lost} keywords lost, ${down} moved down (Top Pages report).`,
        priority: lost + down >= 10 ? 'High' : 'Medium',
        keyword: topKeyword ?? undefined,
        sourceUrls: [url],
      });
      toast.success('Added to the refresh queue.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to refresh queue');
    } finally {
      setQueueing(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title={`Top Pages${data ? `: ${data.domain}` : ''}`}
        description="Best-performing pages by estimated organic traffic."
        inputPlaceholder="Enter a domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="top-pages-organic" onLoad={history.loadSnapshot} />}
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
            title="Pages by Estimated Traffic"
            actions={
              <Button variant="outline" size="sm" disabled={(data?.pages ?? []).length === 0}
                onClick={() => data && exportRowsToCsv(`${data.domain}-top-pages.csv`, data.pages.map(pg => ({
                  url: pg.url, keywords: pg.keywords, traffic: pg.traffic, trafficShare: pg.trafficShare,
                  topKeyword: pg.topKeyword ?? '', topKeywordPosition: pg.topKeywordPosition ?? '',
                })))}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            }
            description={data ? `${formatCompact(data.totalTraffic)} estimated monthly visits across ${data.pages.length} pages` : undefined}
            loading={loading}
            skeletonHeight={480}
          >
            <CoverageCaption data={data} noun="pages" className="mb-2" />
            <PagesTable pages={data?.pages ?? []} />
          </ChartCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Traffic Distribution"
              description="Top 10 pages vs the rest of the site"
              loading={loading}
              skeletonHeight={320}
            >
              {pieData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={entry.name} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => formatNumber(value)} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No traffic data to chart.</p>
              )}
            </ChartCard>

            <ChartCard
              title="Subdomains"
              description="Organic traffic by subdomain"
              loading={loading}
              skeletonHeight={320}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subdomain</TableHead>
                    <TableHead className="w-28">Keywords</TableHead>
                    <TableHead className="w-28">Traffic</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.subdomains ?? []).map((sub) => (
                    <TableRow key={sub.subdomain}>
                      <TableCell className="font-medium">{sub.subdomain}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(sub.keywords)}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(sub.traffic)}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.subdomains ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                        No subdomain data available.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ChartCard>
          </div>

          <ChartCard
            title="Declining Pages"
            description="Pages losing keywords — candidates for a content refresh"
            loading={loading}
            skeletonHeight={320}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-32">Keywords Lost</TableHead>
                  <TableHead className="w-32">Keywords Down</TableHead>
                  <TableHead className="w-28">Traffic</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.declining ?? []).map((page) => (
                  <TableRow key={page.url}>
                    <TableCell className="max-w-[320px]">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:text-accent hover:underline"
                        title={page.url}
                      >
                        {pathOf(page.url)}
                      </a>
                    </TableCell>
                    <TableCell className="tabular-nums text-red-600">{page.keywordsLost}</TableCell>
                    <TableCell className="tabular-nums text-orange-600">{page.keywordsDown}</TableCell>
                    <TableCell className="tabular-nums">{formatNumber(page.traffic)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={queueing === page.url}
                        onClick={() => addToQueue(page.url, page.topKeyword, page.keywordsLost, page.keywordsDown)}
                      >
                        {queueing === page.url
                          ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          : <Flag className="mr-1 h-3.5 w-3.5" />}
                        Add to Queue
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.declining ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No declining pages detected — rankings are stable.
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
