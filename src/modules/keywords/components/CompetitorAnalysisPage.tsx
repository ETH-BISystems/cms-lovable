import { useCallback, useState } from 'react';
import { GitCompare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { CompetitorRow, CompetitorsInput, CompetitorsResult, SharedKeywordRow } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../hooks/useSortedPagination';
import { KDBar } from './shared/KDBar';
import { DataTablePagination } from './shared/DataTablePagination';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { ChartCard } from './analytics/ChartCard';
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

const INITIAL_INPUT: CompetitorsInput = { domain: DEFAULT_DOMAIN };

function CompetitorsTable({
  competitors,
  onCompare,
}: {
  competitors: CompetitorRow[];
  onCompare: (domain: string) => void;
}) {
  const table = useSortedPagination(competitors, 'commonKeywords');
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
            {head('Domain', 'domain')}
            {head('Common Keywords', 'commonKeywords', 'w-40')}
            {head('Organic Traffic', 'organicTraffic', 'w-36')}
            {head('Paid Traffic', 'paidTraffic', 'w-32')}
            {head('Organic Keywords', 'organicKeywords', 'w-40')}
            {head('Avg Position', 'avgPosition', 'w-32')}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map((row) => (
            <TableRow key={row.domain}>
              <TableCell className="font-medium">{row.domain}</TableCell>
              <TableCell className="tabular-nums">{formatNumber(row.commonKeywords)}</TableCell>
              <TableCell className="tabular-nums">{formatCompact(row.organicTraffic)}</TableCell>
              <TableCell className="tabular-nums">{formatCompact(row.paidTraffic)}</TableCell>
              <TableCell className="tabular-nums">{formatNumber(row.organicKeywords)}</TableCell>
              <TableCell className="tabular-nums">{row.avgPosition || '—'}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onCompare(row.domain)}>
                  <GitCompare className="mr-1 h-3.5 w-3.5" />
                  Compare
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                No competitors found.
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

function SharedKeywordsTable({ keywords }: { keywords: SharedKeywordRow[] }) {
  const table = useSortedPagination(keywords, 'volume');
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
            {head('Our Position', 'ourPosition', 'w-32')}
            {head('Their Position', 'theirPosition', 'w-32')}
            {head('Volume', 'volume', 'w-28')}
            {head('KD', 'kd', 'w-28')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.pageRows.map((kw) => (
            <TableRow key={kw.keyword}>
              <TableCell className="font-medium">{kw.keyword}</TableCell>
              <TableCell><PositionChip position={kw.ourPosition} /></TableCell>
              <TableCell><PositionChip position={kw.theirPosition} /></TableCell>
              <TableCell className="tabular-nums">{formatNumber(kw.volume)}</TableCell>
              <TableCell><KDBar kd={kw.kd} /></TableCell>
            </TableRow>
          ))}
          {table.pageRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                No shared keywords found between these domains.
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
 * Competitor Analysis — top organic competitors of our domain and a
 * keyword-level intersection with a chosen competitor.
 */
export function CompetitorAnalysisPage() {
  // History-first: check saved searches before any API call; the query only
  // auto-runs when the check resolves with no history at all (true first
  // visit). With saved history the query never auto-runs and the HistoryGate
  // below offers the last searches.
  const historyFirst = useHistoryFirst('competitor-analysis');
  const query = useAnalyticsQuery(
    seoAnalyticsService.competitors,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;
  const [currentDomain, setCurrentDomain] = useState(DEFAULT_DOMAIN);
  const [compareInput, setCompareInput] = useState('');

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<CompetitorsResult>({
    // Refresh what the snapshot shows — its own domain, not blindly the default.
    onRefreshLive: snapshot => run({ domain: snapshot.payload.domain || DEFAULT_DOMAIN }),
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as CompetitorsResult | null)?.competitors)
      ? (history.snapshot.payload as CompetitorsResult)
      : null;

  const onSubmit = useCallback((domain: string) => {
    setCurrentDomain(domain);
    setCompareInput('');
    clearSnapshot();
    run({ domain });
  }, [run, clearSnapshot]);

  const onCompare = useCallback((competitor: string) => {
    setCompareInput(competitor);
    clearSnapshot();
    run({ domain: currentDomain, compareWith: competitor });
  }, [run, currentDomain, clearSnapshot]);

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
        title="Competitor Analysis"
        description={`Find domains competing with ${currentDomain} in organic search.`}
        inputPlaceholder="Our domain, e.g. elitetravelhackers.com"
        initialValue={DEFAULT_DOMAIN}
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="competitor-analysis" onLoad={history.loadSnapshot} />}
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
            title="Top Competitors"
            actions={
              <Button variant="outline" size="sm" disabled={(data?.competitors ?? []).length === 0}
                onClick={() => data && exportRowsToCsv(`${data.domain}-competitors.csv`, data.competitors.map(c => ({
                  domain: c.domain, commonKeywords: c.commonKeywords, organicTraffic: c.organicTraffic,
                  paidTraffic: c.paidTraffic, organicKeywords: c.organicKeywords, avgPosition: c.avgPosition,
                })))}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            }
            description="Domains ranking for the same keywords, by keyword overlap"
            loading={loading}
            skeletonHeight={400}
          >
            <CompetitorsTable competitors={data?.competitors ?? []} onCompare={onCompare} />
          </ChartCard>

          <ChartCard
            title="Domain Intersection"
            description={data?.comparedWith
              ? `Keywords shared by ${data.domain} and ${data.comparedWith}`
              : 'Pick a competitor above or enter a domain to see shared keywords'}
            loading={loading}
            skeletonHeight={320}
            actions={
              <div className="flex items-center gap-2">
                <Input
                  value={compareInput}
                  onChange={(e) => setCompareInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && compareInput.trim() && onCompare(compareInput.trim())}
                  placeholder="competitor.com"
                  className="h-8 w-52"
                />
                <Button
                  size="sm"
                  onClick={() => compareInput.trim() && onCompare(compareInput.trim())}
                  disabled={query.loading || !compareInput.trim()}
                >
                  {query.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Compare'}
                </Button>
              </div>
            }
          >
            {data?.comparedWith ? (
              <SharedKeywordsTable keywords={data.sharedKeywords} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No comparison selected yet.
              </p>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
