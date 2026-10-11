import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Crosshair, Download, Minus, Target, TrendingUp, Trophy } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { subscribeToTrackedKeywords, type TrackedKeyword } from '../services/keywordHistoryService';
import { MiniSparkline } from './shared/MiniSparkline';
import { KDBar } from './shared/KDBar';
import { AnalyticsIntentBadge } from './analytics/AnalyticsIntentBadge';
import { ChartCard } from './analytics/ChartCard';
import { MetricCard } from './analytics/MetricCard';
import { PageHero } from './analytics/PageHero';
import { EmptyPrompt } from './analytics/StatusStates';
import { exportRowsToCsv } from './analytics/exportCsv';
import { InlineBar, PositionChip } from './analytics/dataViz';
import { formatCompact, formatNumber } from './analytics/format';
import { CHART_AXIS_STROKE, CHART_AXIS_TICK, CHART_GRID_STROKE, CHART_TOOLTIP_STYLE, SERIES_COLORS } from './analytics/chartTheme';

interface TrackedRow extends TrackedKeyword {
  weeks: string[];
  positions: number[];
  change: number | null;
  best: number;
}

function enrich(row: TrackedKeyword): TrackedRow {
  const weeks = Object.keys(row.history).sort();
  const positions = weeks.map(w => row.history[w]).filter(p => p > 0);
  const current = positions[positions.length - 1] ?? row.position;
  const previous = positions.length >= 2 ? positions[positions.length - 2] : null;
  return {
    ...row,
    weeks,
    positions,
    change: previous !== null ? previous - current : null,
    best: positions.length > 0 ? Math.min(...positions) : row.position,
  };
}

function ChangeCell({ change }: { change: number | null }) {
  if (change === null || change === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return (
    <span className={cn('flex items-center gap-0.5 text-sm font-semibold tabular-nums', change > 0 ? 'text-green-600' : 'text-red-600')}>
      {change > 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(change)}
    </span>
  );
}

/**
 * Rank Tracker — weekly Google position history for every tracked keyword,
 * accumulated automatically by the Monday SEO Intelligence snapshots.
 */
export function RankTrackerPage() {
  const [rows, setRows] = useState<TrackedKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToTrackedKeywords(
    data => { setRows(data); setLoading(false); },
    () => setLoading(false),
  ), []);

  const enriched = useMemo(() => rows.map(enrich), [rows]);
  const withHistory = useMemo(() => enriched.filter(r => r.positions.length >= 2), [enriched]);

  const improved = withHistory.filter(r => (r.change ?? 0) > 0).length;
  const declined = withHistory.filter(r => (r.change ?? 0) < 0).length;
  const ranked = enriched.filter(r => r.position > 0);
  const avgPosition = ranked.length > 0
    ? Math.round((ranked.reduce((sum, r) => sum + r.position, 0) / ranked.length) * 10) / 10
    : null;

  // Multi-line position history for the highest-volume keywords with history.
  const chartKeywords = useMemo(
    () => [...withHistory].sort((a, b) => b.volume - a.volume).slice(0, 6),
    [withHistory],
  );
  const chartData = useMemo(() => {
    const allWeeks = [...new Set(chartKeywords.flatMap(r => r.weeks))].sort();
    return allWeeks.map(week => {
      const point: Record<string, string | number | null> = { week };
      for (const row of chartKeywords) point[row.keyword] = row.history[week] ?? null;
      return point;
    });
  }, [chartKeywords]);

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="SEO Research · Tracking"
        title="Rank Tracker"
        icon={Crosshair}
        description="Weekly Google position history for every keyword the domain ranks for — tracked automatically by the Monday intelligence snapshots. History deepens every week."
        overlap={enriched.length > 0}
      />

      {loading ? (
        <ChartCard title="Loading tracked keywords…" loading skeletonHeight={320}><div /></ChartCard>
      ) : enriched.length === 0 ? (
        <EmptyPrompt message="No tracked keywords yet. Run a snapshot on the SEO Intelligence dashboard — every weekly snapshot records positions here automatically." />
      ) : (
        <>
          <div className={cn('grid grid-cols-2 gap-4 lg:grid-cols-4', enriched.length > 0 && 'relative z-[1] !-mt-14 px-1')}>
            <MetricCard label="Tracked Keywords" value={formatNumber(enriched.length)} icon={Target} loading={false} />
            <MetricCard
              label="Avg. Position"
              value={avgPosition !== null ? String(avgPosition) : '—'}
              sub={`across ${formatNumber(ranked.length)} ranked keywords`}
              icon={Trophy}
              loading={false}
            />
            <MetricCard label="Improved This Week" value={formatNumber(improved)} icon={ArrowUp} loading={false} />
            <MetricCard label="Declined This Week" value={formatNumber(declined)} icon={ArrowDown} loading={false} />
          </div>

          {chartData.length >= 2 && (
            <ChartCard
              title="Position History"
              description="Weekly Google positions for the highest-volume tracked keywords — lower is better"
              skeletonHeight={320}
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="week" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis reversed domain={[1, 'dataMax + 2']} allowDecimals={false} tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE}
                      label={{ value: 'Position', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend />
                    {chartKeywords.map((row, i) => (
                      <Line
                        key={row.keyword}
                        type="monotone"
                        dataKey={row.keyword}
                        stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          <ChartCard
            title="Tracked Keywords"
            description={`${formatNumber(enriched.length)} keywords with weekly position history`}
            skeletonHeight={480}
            actions={
              <Button
                variant="outline" size="sm"
                onClick={() => exportRowsToCsv('rank-tracker.csv', enriched.map(r => ({
                  keyword: r.keyword, intent: r.intent ?? '', position: r.position,
                  change: r.change ?? '', best: r.best, volume: r.volume, kd: r.kd,
                  url: r.url, history: r.weeks.map(w => `${w}:${r.history[w]}`).join('; '),
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
                  <TableHead>Keyword</TableHead>
                  <TableHead className="w-28">Intent</TableHead>
                  <TableHead className="w-24">Position</TableHead>
                  <TableHead className="w-20">Change</TableHead>
                  <TableHead className="w-20">Best</TableHead>
                  <TableHead className="w-28">Trend</TableHead>
                  <TableHead className="w-28 text-right">Volume</TableHead>
                  <TableHead className="w-28">KD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.slice(0, 100).map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[260px]">
                      <span className="block truncate font-medium">{row.keyword}</span>
                      {row.url && (
                        <a href={row.url} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-muted-foreground hover:text-accent hover:underline">
                          {row.url.replace(/^https?:\/\/[^/]+/, '') || '/'}
                        </a>
                      )}
                    </TableCell>
                    <TableCell><AnalyticsIntentBadge intent={row.intent} /></TableCell>
                    <TableCell><PositionChip position={row.position} /></TableCell>
                    <TableCell><ChangeCell change={row.change} /></TableCell>
                    <TableCell><PositionChip position={row.best} /></TableCell>
                    <TableCell>
                      {row.positions.length >= 2
                        ? <MiniSparkline data={row.positions.map(p => -p)} width={90} height={26} />
                        : <span className="text-[11px] text-muted-foreground">1 week</span>}
                    </TableCell>
                    <TableCell><InlineBar value={row.volume} max={Math.max(1, ...enriched.map(r => r.volume))} label={formatCompact(row.volume)} /></TableCell>
                    <TableCell><KDBar kd={row.kd} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Positions update every Monday with the scheduled intelligence snapshot. Trend lines gain a point per week.
          </p>
        </>
      )}
    </div>
  );
}
