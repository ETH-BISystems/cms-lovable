import { useCallback, useMemo, useState } from 'react';
import { Loader2, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { callFunction, registerMockFunction } from '@/services/functionsService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { ContentGapResult, GapKeyword } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { useSortedPagination } from '../hooks/useSortedPagination';
import { KDBar } from './shared/KDBar';
import { DataTablePagination } from './shared/DataTablePagination';
import { ChartCard } from './analytics/ChartCard';
import { CoverageCaption } from './analytics/CoverageCaption';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { exportRowsToCsv } from './analytics/exportCsv';
import { Download } from 'lucide-react';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { SortableHead } from './analytics/SortableHead';
import { PositionChip } from './analytics/dataViz';
import { DEFAULT_DOMAIN } from './analytics/constants';
import { formatCurrency, formatNumber } from './analytics/format';

function opportunityColor(score: number): string {
  if (score >= 60) return 'bg-green-100 text-green-700';
  if (score >= 35) return 'bg-yellow-100 text-yellow-700';
  return 'bg-muted text-muted-foreground';
}

// The pipeline's article-creation callable (production: httpsCallable(functions, 'createArticle')).
registerMockFunction('createArticle', async () => ({ success: true, articleId: 'article_mock' }));

/**
 * Content Gap Analysis — keywords competitors rank for that our domain does
 * not, scored by opportunity, exportable to the article pipeline.
 */
export function ContentGapPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.contentGap);
  const { run } = query;
  const [ourDomain, setOurDomain] = useState(DEFAULT_DOMAIN);
  const [competitorInputs, setCompetitorInputs] = useState(['', '', '']);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // History-first: this page never auto-fetches; with saved history the
  // HistoryGate below offers the last searches instead of the empty prompt —
  // no API call is made until the user picks one or runs a new analysis.
  const historyFirst = useHistoryFirst('content-gap');

  // Snapshot view — render a saved search result instead of the live query.
  const history = useHistorySnapshot<ContentGapResult>({
    // "Refresh live data" re-runs the snapshot's own domain + competitor set.
    onRefreshLive: snapshot => {
      const p = snapshot.payload;
      if (!p.domain) return;
      run({ domain: p.domain, competitors: Array.isArray(p.competitors) ? p.competitors : [] });
    },
  });
  const { clearSnapshot } = history;
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as ContentGapResult | null)?.gaps)
      ? (history.snapshot.payload as ContentGapResult)
      : null;

  const onFindGaps = useCallback(() => {
    const competitors = competitorInputs.map(c => c.trim()).filter(Boolean);
    setSelected(new Set());
    clearSnapshot();
    run({ domain: ourDomain.trim() || DEFAULT_DOMAIN, competitors });
  }, [run, ourDomain, competitorInputs, clearSnapshot]);

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

  const gaps = useMemo(() => data?.gaps ?? [], [data]);
  const table = useSortedPagination(gaps, 'volume');

  const toggleKeyword = (keyword: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(keyword);
      else next.delete(keyword);
      return next;
    });
  };

  const allPageSelected = table.pageRows.length > 0 && table.pageRows.every(g => selected.has(g.keyword));
  const togglePage = (checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const gap of table.pageRows) {
        if (checked) next.add(gap.keyword);
        else next.delete(gap.keyword);
      }
      return next;
    });
  };

  const exportToPipeline = async () => {
    const keywords = gaps.filter(g => selected.has(g.keyword));
    if (keywords.length === 0) return;
    setExporting(true);
    // production: httpsCallable(functions, 'createArticle')
    let created = 0;
    try {
      for (const gap of keywords) {
        await callFunction('createArticle', {
          title: gap.keyword.replace(/\b\w/g, c => c.toUpperCase()),
          targetKeyword: gap.keyword,
          assignee: { name: 'Unassigned', avatar: 'UN' },
          priority: gap.opportunity >= 60 ? 'High' : 'Medium',
          entryPoint: 'Content Gap',
          source: { type: 'Keyword Research', label: 'Content Gap Analysis' },
          editorialNotes: `Content gap opportunity (score ${gap.opportunity}/100). Volume ${gap.volume.toLocaleString()}, KD ${gap.kd}. Competitors ranking: ${(data?.competitors ?? []).filter((_, i) => gap.positions[i] !== null).join(', ')}.`,
        });
        created += 1;
      }
      toast.success(`Created ${created} article${created === 1 ? '' : 's'} in the pipeline.`);
      setSelected(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(created > 0 ? `Created ${created} articles, then failed: ${msg}` : `Export failed: ${msg}`);
    } finally {
      setExporting(false);
    }
  };

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
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Content Gap Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keywords competitors rank for that we don't — sorted by opportunity.
          </p>
        </div>
        <HistoryPanel
          page="content-gap"
          onLoad={history.loadSnapshot}
          triggerClassName="text-muted-foreground hover:text-foreground"
        />
      </div>

      {history.banner}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Our domain</label>
          <Input
            value={ourDomain}
            onChange={(e) => setOurDomain(e.target.value)}
            placeholder={DEFAULT_DOMAIN}
            data-hero-search-input=""
            className="w-64"
          />
        </div>
        {competitorInputs.map((value, i) => (
          <div key={i} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Competitor {i + 1}</label>
            <Input
              value={value}
              onChange={(e) => {
                const next = [...competitorInputs];
                next[i] = e.target.value;
                setCompetitorInputs(next);
              }}
              placeholder={i === 0 ? 'thepointsguy.com (blank = auto)' : 'optional'}
              className="w-56"
            />
          </div>
        ))}
        <Button onClick={onFindGaps} disabled={query.loading}>
          {query.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Find Gaps
        </Button>
      </div>

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => history.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : !data && !loading ? (
        <EmptyPrompt message="Enter up to 3 competitor domains (or leave blank to auto-discover) and click Find Gaps." />
      ) : (
        <ChartCard
          title="Keyword Gaps"
          description={data
            ? `Keywords ${data.competitors.join(', ')} rank for that ${data.domain} doesn't${data.autoDiscovered ? ' (competitors auto-discovered)' : ''}`
            : 'Finding gaps…'}
          loading={loading}
          skeletonHeight={480}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={(data?.gaps ?? []).length === 0}
                onClick={() => data && exportRowsToCsv(`${data.domain}-content-gaps.csv`, data.gaps.map(g => ({
                  keyword: g.keyword, volume: g.volume, kd: g.kd, cpc: g.cpc, opportunity: g.opportunity,
                  ...Object.fromEntries(data.competitors.map((c, i) => [c, g.positions[i] ?? ''])),
                })))}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                size="sm"
                onClick={exportToPipeline}
                disabled={selected.size === 0 || exporting}
              >
                {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                Export to Pipeline{selected.size > 0 ? ` (${selected.size})` : ''}
              </Button>
            </div>
          }
        >
          <CoverageCaption data={data} noun="keywords" className="mb-2" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={(c) => togglePage(c === true)} />
                </TableHead>
                {head('Keyword', 'keyword')}
                {head('Volume', 'volume', 'w-28')}
                {head('KD', 'kd', 'w-28')}
                {head('CPC', 'cpc', 'w-24')}
                {head('Opportunity', 'opportunity', 'w-32')}
                {(data?.competitors ?? []).map((competitor, i) => (
                  <TableHead key={competitor} className="w-28 truncate" title={competitor}>
                    {competitor.length > 18 ? `Comp ${i + 1}` : competitor}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.pageRows.map((gap: GapKeyword) => (
                <TableRow key={gap.keyword}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(gap.keyword)}
                      onCheckedChange={(c) => toggleKeyword(gap.keyword, c === true)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{gap.keyword}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(gap.volume)}</TableCell>
                  <TableCell><KDBar kd={gap.kd} /></TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(gap.cpc)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn('tabular-nums', opportunityColor(gap.opportunity))}>
                      {gap.opportunity}
                    </Badge>
                  </TableCell>
                  {gap.positions.map((position, i) => (
                    <TableCell key={i}><PositionChip position={position} /></TableCell>
                  ))}
                </TableRow>
              ))}
              {table.pageRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6 + (data?.competitors.length ?? 0)}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No gap keywords found — nice, you cover everything your competitors rank for.
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
        </ChartCard>
      )}
    </div>
  );
}
