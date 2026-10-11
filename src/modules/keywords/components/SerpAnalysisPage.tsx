import { useCallback } from 'react';
import { Check, X } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { seoAnalyticsService } from '../services/seoAnalyticsService';
import type { SerpAnalysisResult } from '../types/analytics';
import { useAnalyticsQuery } from '../hooks/useAnalyticsQuery';
import { AnalyticsSearchHeader } from './analytics/AnalyticsSearchHeader';
import { HistoryGate } from './traffic-market/shared/HistoryGate';
import { HistoryPanel } from './traffic-market/shared/HistoryPanel';
import { useHistoryFirst } from './traffic-market/shared/useHistoryFirst';
import { useHistorySnapshot } from './traffic-market/shared/useHistorySnapshot';
import { ChartCard } from './analytics/ChartCard';
import { EmptyPrompt, ErrorState } from './analytics/StatusStates';
import { featureLabel, formatCompact } from './analytics/format';
import { PositionChip } from './analytics/dataViz';
import { exportRowsToCsv } from './analytics/exportCsv';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  SERIES_COLORS,
} from './analytics/chartTheme';

/** SERP features we always report on, whether present or not. */
const HEADLINE_FEATURES = [
  'featured_snippet',
  'people_also_ask',
  'knowledge_graph',
  'images',
  'video',
  'local_pack',
  'shopping',
  'ai_overview',
];

/**
 * SERP Analysis — live Google results for a keyword, SERP features present,
 * historical position tracking for top domains, and SERP competitors.
 */
export function SerpAnalysisPage() {
  const query = useAnalyticsQuery(seoAnalyticsService.serpAnalysis);
  const { run } = query;

  // History-first: this page never auto-fetches; with saved history the query
  // never auto-runs and the HistoryGate offers the last searches — no API call.
  const historyFirst = useHistoryFirst('serp-analysis');

  // Snapshot view — render a saved search result instead of the live query.
  const snapshots = useHistorySnapshot<SerpAnalysisResult>({
    // "Refresh live data" re-analyzes the snapshot's own keyword.
    onRefreshLive: snapshot => {
      if (snapshot.payload.keyword) run({ keyword: snapshot.payload.keyword });
    },
  });
  const { clearSnapshot } = snapshots;
  const snapshotData =
    snapshots.snapshot && Array.isArray((snapshots.snapshot.payload as SerpAnalysisResult | null)?.results)
      ? (snapshots.snapshot.payload as SerpAnalysisResult)
      : null;
  const onSubmit = useCallback((keyword: string) => { clearSnapshot(); run({ keyword }); }, [run, clearSnapshot]);

  const data = snapshotData ?? query.data;
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

  return (
    <div className="p-6 space-y-6">
      <AnalyticsSearchHeader
        title="SERP Analysis"
        description="Live Google results, SERP features, and ranking history for any keyword."
        inputPlaceholder="Enter a keyword, e.g. best travel credit cards"
        buttonLabel="Analyze"
        loading={query.loading}
        onSubmit={onSubmit}
        actions={<HistoryPanel page="serp-analysis" onLoad={snapshots.loadSnapshot} />}
      />

      {snapshots.banner}

      {showHistoryGate ? (
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={snapshot => snapshots.loadSnapshot(snapshot, 'auto')}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : !data && !loading ? (
        <EmptyPrompt message="Enter a keyword above to fetch its live SERP, features, and competitor visibility." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="AI Overview"
              description="Is Google's AI answer shown, and who does it cite?"
              loading={loading}
              skeletonHeight={140}
            >
              {data?.aiOverview.present ? (
                <div className="space-y-2.5">
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                    <Check className="mr-1 h-3 w-3" />
                    AI Overview present
                  </Badge>
                  <div className="flex flex-wrap gap-1.5">
                    {data.aiOverview.referencedDomains.map(domain => (
                      <Badge key={domain} variant="outline" className="text-[11px]">{domain}</Badge>
                    ))}
                  </div>
                  {data.aiOverview.referencedDomains.length === 0 && (
                    <p className="text-xs text-muted-foreground">Citations load asynchronously for this query.</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <X className="h-4 w-4" />
                  No AI Overview for this keyword — classic SERP only.
                </div>
              )}
            </ChartCard>

            <ChartCard title="People Also Ask" description="Questions Google surfaces — content section ideas" loading={loading} skeletonHeight={140}>
              <ul className="space-y-1.5 text-sm">
                {(data?.peopleAlsoAsk ?? []).map(question => (
                  <li key={question} className="rounded-lg bg-muted/50 px-3 py-1.5">{question}</li>
                ))}
                {(data?.peopleAlsoAsk ?? []).length === 0 && (
                  <li className="py-4 text-center text-muted-foreground">No PAA box on this SERP.</li>
                )}
              </ul>
            </ChartCard>

            <ChartCard title="Autocomplete" description="What Google suggests as people type this" loading={loading} skeletonHeight={140}>
              <div className="flex flex-wrap gap-1.5">
                {(data?.autocomplete ?? []).map(suggestion => (
                  <Badge key={suggestion} variant="secondary" className="bg-accent/10 text-accent hover:bg-accent/15">
                    {suggestion}
                  </Badge>
                ))}
                {(data?.autocomplete ?? []).length === 0 && (
                  <p className="w-full py-4 text-center text-sm text-muted-foreground">No suggestions returned.</p>
                )}
              </div>
            </ChartCard>
          </div>

          <ChartCard
            title={`Current SERP Results${data ? ` for "${data.keyword}"` : ''}`}
            description="Top 20 organic results from a live Google query"
            loading={loading}
            skeletonHeight={480}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Features</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.results ?? []).map((result) => (
                  <TableRow key={`${result.position}-${result.url}`}>
                    <TableCell><PositionChip position={result.position} /></TableCell>
                    <TableCell className="max-w-[380px]">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:text-accent hover:underline"
                        title={result.title}
                      >
                        {result.title || result.url}
                      </a>
                      <span className="block truncate text-xs text-muted-foreground">{result.url}</span>
                    </TableCell>
                    <TableCell className="text-sm">{result.domain}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {result.features.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-[10px]">
                            {featureLabel(feature)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(data?.results ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No organic results returned for this keyword.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ChartCard>

          <ChartCard
            title="SERP Features Present"
            description="Detected on the live results page"
            loading={loading}
            skeletonHeight={80}
          >
            <div className="flex flex-wrap gap-2">
              {HEADLINE_FEATURES.map((feature) => {
                const present = (data?.features ?? []).includes(feature);
                return (
                  <Badge
                    key={feature}
                    variant={present ? 'default' : 'outline'}
                    className={cn('gap-1', !present && 'text-muted-foreground')}
                  >
                    {present ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {featureLabel(feature)}
                  </Badge>
                );
              })}
              {(data?.features ?? [])
                .filter((f) => !HEADLINE_FEATURES.includes(f) && f !== 'organic' && f !== 'paid')
                .map((feature) => (
                  <Badge key={feature} variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    {featureLabel(feature)}
                  </Badge>
                ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Historical Position Tracking"
            description="How the current top domains have moved over time for this keyword"
            loading={loading}
            skeletonHeight={320}
          >
            {(data?.history ?? []).length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="date" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis
                      reversed
                      domain={[1, 'auto']}
                      tick={CHART_AXIS_TICK}
                      stroke={CHART_AXIS_STROKE}
                      label={{ value: 'Position', angle: -90, position: 'insideLeft', fontSize: 11 }}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    {(data?.historyDomains ?? []).map((domain, i) => (
                      <Line
                        key={domain}
                        type="monotone"
                        dataKey={domain}
                        stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No historical SERP data available for this keyword.
              </p>
            )}
          </ChartCard>

          <ChartCard
            title="SERP Competitors"
            actions={
              <Button variant="outline" size="sm" disabled={(data?.competitors ?? []).length === 0}
                onClick={() => data && exportRowsToCsv(`${data.keyword.replace(/\s+/g, '-')}-serp-competitors.csv`, data.competitors.map(c => ({
                  domain: c.domain, position: c.position, visibility: c.visibility, estTraffic: c.estTraffic,
                })))}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            }
            description="Domains with the strongest presence for this keyword"
            loading={loading}
            skeletonHeight={320}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead className="w-32">Avg Position</TableHead>
                  <TableHead className="w-32">Visibility</TableHead>
                  <TableHead className="w-32">Est. Traffic</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.competitors ?? []).map((competitor) => (
                  <TableRow key={competitor.domain}>
                    <TableCell className="font-medium">{competitor.domain}</TableCell>
                    <TableCell><PositionChip position={competitor.position} /></TableCell>
                    <TableCell className="tabular-nums">{competitor.visibility || '—'}</TableCell>
                    <TableCell className="tabular-nums">{formatCompact(competitor.estTraffic)}</TableCell>
                  </TableRow>
                ))}
                {(data?.competitors ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No SERP competitor data for this keyword.
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
