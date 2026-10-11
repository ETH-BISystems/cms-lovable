import { useCallback, useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { ArrowUpRight, Bot } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { trafficMarketService } from '../../services/trafficMarketService';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import type { AiEngine, AiTrafficResult, TrafficMarketInput } from '../../types/trafficMarket';
import { AI_ENGINE_LABELS } from '../../types/trafficMarket';
import { ChartCard } from '../analytics/ChartCard';
import { HERO_BUTTON_CLASS, HERO_INPUT_CLASS, PageHero } from '../analytics/PageHero';
import { ErrorState } from '../analytics/StatusStates';
import { formatCompact, formatNumber } from '../analytics/format';
import {
  CHART_AXIS_STROKE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  SERIES_COLORS,
} from '../analytics/chartTheme';
import { ClickstreamGatedCard } from './shared/ClickstreamGatedCard';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { MultiDomainTrendChart } from './shared/MultiDomainTrendChart';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TopGrowingPages } from './shared/TopGrowingPages';
import { TrafficFilterBar } from './shared/TrafficFilterBar';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { AiSourcesTable } from './ai-traffic/AiSourcesTable';
import { VisibilityTrafficPanel } from './ai-traffic/VisibilityTrafficPanel';

const ALL_ENGINES: AiEngine[] = ['chatgpt', 'gemini', 'claude', 'perplexity', 'grok', 'deepseek', 'copilot'];

/** Stable initial input — omitted domain set means the backend default. */
const INITIAL_INPUT: TrafficMarketInput = {};

/**
 * AI Traffic (Session 33, AIT-01…03 + D6) — referral traffic from AI engines,
 * the demand-side counterpart of AI Visibility. One `trafficMarket_aiTraffic`
 * call feeds the distribution chart, per-engine trends, top growing pages, the
 * all-sources table and the Visibility → Traffic join panel; the engine chips
 * filter everything client-side.
 */
export function AiTrafficPage() {
  // History-first: consult saved searches before firing any API call. The
  // initial input stays undefined while checking (and forever, once saved
  // history exists), so the query only auto-runs on a true first visit; with
  // saved history the query never auto-runs and the HistoryGate below offers
  // the last searches.
  const historyFirst = useHistoryFirst('ai-traffic');
  const query = useAnalyticsQuery(
    trafficMarketService.aiTraffic,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;

  const [selectedEngines, setSelectedEngines] = useState<AiEngine[]>(ALL_ENGINES);
  const [domainsText, setDomainsText] = useState('');
  const [trendEngineRaw, setTrendEngineRaw] = useState<AiEngine>('chatgpt');
  const [pagesEngineRaw, setPagesEngineRaw] = useState<AiEngine>('chatgpt');
  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  // Snapshot view: one aiTraffic section feeds the whole page, so a loaded
  // snapshot replaces the data object wholesale; Apply returns to live.
  const history = useHistorySnapshot<AiTrafficResult>({
    // "Refresh live data" refetches the domain set the snapshot was saved with.
    onRefreshLive: snapshot => {
      const input: TrafficMarketInput =
        snapshot.entry.domains.length > 0 ? { domains: snapshot.entry.domains } : {};
      if (months !== 12) input.months = months;
      run(input);
    },
  });
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as AiTrafficResult | null)?.engines)
      ? (history.snapshot.payload as AiTrafficResult)
      : null;
  const data = snapshotData ?? query.data;

  // History-first gate: shown instead of content until the user re-opens a
  // saved search or starts a new one — no API call is made while it shows.
  const showHistoryGate =
    !historyFirst.checking &&
    historyFirst.hasHistory &&
    !history.snapshot &&
    !query.data &&
    !query.loading &&
    !query.error;

  const toggleEngine = (engine: AiEngine) => {
    setSelectedEngines(prev => {
      if (prev.includes(engine)) {
        // Keep at least one engine selected.
        return prev.length > 1 ? prev.filter(e => e !== engine) : prev;
      }
      return ALL_ENGINES.filter(e => prev.includes(e) || e === engine);
    });
  };

  const { clearSnapshot } = history;
  const buildInput = useCallback(
    (monthWindow: number): TrafficMarketInput => {
      const domains = domainsText.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
      const input: TrafficMarketInput = domains.length > 0 ? { domains } : {};
      if (monthWindow !== 12) input.months = monthWindow;
      return input;
    },
    [domainsText],
  );
  const applyDomains = useCallback(() => {
    // Applying a domain set always returns the page to live data.
    clearSnapshot();
    run(buildInput(months));
  }, [run, buildInput, months, clearSnapshot]);
  const onMonthsChange = useCallback(
    (monthWindow: number) => {
      setMonths(monthWindow);
      clearSnapshot();
      run(buildInput(monthWindow));
    },
    [run, buildInput, clearSnapshot],
  );

  /** Engines present in the response (fallback: full list), filtered by the chips. */
  const activeEngines = useMemo(() => {
    const base = data && data.engines.length > 0 ? data.engines : ALL_ENGINES;
    return base.filter(e => selectedEngines.includes(e));
  }, [data, selectedEngines]);

  /** Ordered domain set — one color per domain, consistent across every chart. */
  const domains = useMemo(() => {
    if (!data) return [];
    const ordered: string[] = [];
    data.engines.forEach(engine => {
      Object.keys(data.distribution[engine] ?? {}).forEach(domain => {
        if (!ordered.includes(domain)) ordered.push(domain);
      });
    });
    return ordered;
  }, [data]);

  const distributionRows = useMemo(() => {
    if (!data) return [];
    return activeEngines.map(engine => {
      const row: Record<string, string | number> = { engine: AI_ENGINE_LABELS[engine] };
      domains.forEach((domain, i) => {
        row[`d${i}`] = data.distribution[engine]?.[domain] ?? 0;
      });
      return row;
    });
  }, [data, activeEngines, domains]);

  const sourceRows = useMemo(
    () => (data?.sources ?? []).filter(row => selectedEngines.includes(row.engine)),
    [data, selectedEngines],
  );
  const visibilityRows = useMemo(
    () => (data?.visibilityJoin ?? []).filter(row => selectedEngines.includes(row.engine)),
    [data, selectedEngines],
  );

  // Keep tab selections valid when their engine is toggled off.
  const fallbackEngine = activeEngines[0] ?? 'chatgpt';
  const trendEngine = activeEngines.includes(trendEngineRaw) ? trendEngineRaw : fallbackEngine;
  const pagesEngine = activeEngines.includes(pagesEngineRaw) ? pagesEngineRaw : fallbackEngine;

  const showSkeleton = (historyFirst.checking || query.loading) && !data;
  const refetching = !snapshotData && query.loading && data !== null;
  /** AI referral traffic is clickstream-only — gated on plain 'dataforseo'. */
  const trafficGated = data?.trafficGated === true;

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Traffic & Market"
        title="AI Traffic"
        icon={Bot}
        description="Referral traffic from AI engines — ChatGPT, Gemini, Claude, Perplexity, Grok, DeepSeek and Copilot. The demand-side counterpart of AI Visibility: not who mentions you, but who actually arrives."
        actions={<HistoryPanel page="ai-traffic" onLoad={history.loadSnapshot} />}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ALL_ENGINES.map(engine => {
              const active = selectedEngines.includes(engine);
              return (
                <button
                  key={engine}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleEngine(engine)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors',
                    active
                      ? 'bg-white text-[#053741] ring-white'
                      : 'bg-white/10 text-cyan-50/70 ring-white/15 hover:bg-white/15',
                  )}
                >
                  {AI_ENGINE_LABELS[engine]}
                </button>
              );
            })}
          </div>
          <div className="flex max-w-xl gap-2">
            <Input
              className={HERO_INPUT_CLASS}
              value={domainsText}
              onChange={e => setDomainsText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') applyDomains();
              }}
              placeholder="Domains, comma separated — leave blank for the default competitor set"
              data-hero-search-input=""
            />
            <Button className={HERO_BUTTON_CLASS} onClick={applyDomains} disabled={query.loading}>
              Apply
            </Button>
          </div>
        </div>
      </PageHero>

      {history.banner}
      <SampleDataBanner meta={data?.meta} />
      {/* CMS-38: when the traffic sections are gated, the gated card below is
          the single Similarweb notice — no duplicate caption on top. */}
      {!trafficGated && <ProviderCaption meta={data?.meta} />}

      {/* Cross-page filter row — hidden during snapshot view (fixed period)
          and when the traffic sections stand down (disabled / gated). */}
      {!history.snapshot && data && data.meta.dataSource !== 'disabled' && !trafficGated && (
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
        <>
          <SimilarwebDisabledCard />
          {/* The supply-side counterpart needs no Similarweb key. */}
          <div className="flex justify-center">
            <Button variant="ghost" asChild>
              <Link to="/keywords/ai-visibility">
                Open AI Visibility
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      ) : trafficGated ? (
        // 'dataforseo' without clickstream: AI referral *traffic* (distribution,
        // trends, growing pages, sources) is gated behind Similarweb, but the
        // Visibility → Traffic join stays — its visibility side is served by
        // the AI Visibility engine, which needs no Similarweb key.
        <div className="space-y-6">
          <ClickstreamGatedCard
            title="AI referral traffic needs the optional Similarweb integration"
            description="Visit counts from ChatGPT, Gemini, Claude and the other engines come from Similarweb clickstream data. No key is configured, so the traffic charts stand down — this is a missing optional integration, not an error. An admin can add a key under Settings → SEO API Integration."
            note="The Visibility → Traffic panel below stays live: engine visibility comes from the AI Visibility engine and needs no Similarweb key."
          />
          <VisibilityTrafficPanel rows={visibilityRows} loading={showSkeleton} />
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity duration-300', refetching && 'opacity-60')}>
          {/* AIT-01 — distribution across engines */}
          <ChartCard
            title="AI Traffic Distribution"
            description="Latest-month AI referral visits per engine, one bar per domain"
            loading={showSkeleton}
            skeletonHeight={320}
          >
            {distributionRows.length === 0 || domains.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No AI referral traffic data.</p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                    <XAxis dataKey="engine" tick={CHART_AXIS_TICK} stroke={CHART_AXIS_STROKE} />
                    <YAxis
                      width={44}
                      tick={CHART_AXIS_TICK}
                      stroke={CHART_AXIS_STROKE}
                      tickFormatter={(v: number) => formatCompact(v)}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value: number) => formatNumber(value)}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend />
                    {domains.map((domain, i) => (
                      <Bar
                        key={domain}
                        dataKey={`d${i}`}
                        name={domain}
                        fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          {/* AIT-01 — per-engine trend */}
          <Tabs value={trendEngine} onValueChange={v => setTrendEngineRaw(v as AiEngine)}>
            <ChartCard
              title="Traffic Trend"
              description={`Monthly ${AI_ENGINE_LABELS[trendEngine]} referral visits per domain`}
              loading={showSkeleton}
              skeletonHeight={288}
              actions={
                <TabsList className="h-auto flex-wrap justify-end">
                  {activeEngines.map(engine => (
                    <TabsTrigger key={engine} value={engine} className="text-xs">
                      {AI_ENGINE_LABELS[engine]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              }
            >
              <MultiDomainTrendChart
                months={data?.meta.months ?? []}
                series={data?.trends[trendEngine] ?? []}
                colorOf={(domain, i) => {
                  const idx = domains.indexOf(domain);
                  return SERIES_COLORS[(idx >= 0 ? idx : i) % SERIES_COLORS.length];
                }}
                height={288}
                emptyMessage="No trend data for this engine."
              />
            </ChartCard>
          </Tabs>

          {/* AIT-02 — top growing pages per engine */}
          <Tabs value={pagesEngine} onValueChange={v => setPagesEngineRaw(v as AiEngine)}>
            <TopGrowingPages
              title="Top Growing Pages"
              cards={data?.topGrowingPages[pagesEngine] ?? []}
              loading={showSkeleton}
              emptyMessage="Nothing found — try changing filters."
              actions={
                <TabsList className="h-auto flex-wrap justify-end">
                  {activeEngines.map(engine => (
                    <TabsTrigger key={engine} value={engine} className="text-xs">
                      {AI_ENGINE_LABELS[engine]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              }
            />
          </Tabs>

          {/* AIT-03 — all sources */}
          <AiSourcesTable rows={sourceRows} domains={domains} loading={showSkeleton} />

          {/* D6 — AI Visibility → AI Traffic */}
          <VisibilityTrafficPanel rows={visibilityRows} loading={showSkeleton} />
        </div>
      )}
    </div>
  );
}
