import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, PieChart, Plus, Rocket, TrendingUp, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { trafficMarketService } from '../../services/trafficMarketService';
import type { MarketOverviewResult, TrafficMarketInput } from '../../types/trafficMarket';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import { HERO_BUTTON_CLASS, HERO_INPUT_CLASS, PageHero } from '../analytics/PageHero';
import { MetricCard } from '../analytics/MetricCard';
import { ErrorState } from '../analytics/StatusStates';
import { SERIES_COLORS } from '../analytics/chartTheme';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TrafficFilterBar } from './shared/TrafficFilterBar';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { formatCompact, formatDeltaPct } from './shared/trafficFormat';
import { ConsolidationCard } from './market-overview/ConsolidationCard';
import { GrowthQuadrantCard } from './market-overview/GrowthQuadrantCard';
import { KeyPlayersCard } from './market-overview/KeyPlayersCard';
import { MarketPlayersTable } from './market-overview/MarketPlayersTable';
import { MarketTrendCard } from './market-overview/MarketTrendCard';

/** Empty input → the backend fills in the configured competitor set. */
const INITIAL_INPUT: TrafficMarketInput = {};

/** Normalize a typed domain: trim, lowercase, strip protocol and paths. */
function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

/** Highest visits-growth domain — quadrant metrics first, players' delta as fallback. */
function findFastestGrower(data: MarketOverviewResult): { domain: string; growthPct: number } | null {
  const fromQuadrant = data.quadrant.points
    .filter((p) => Number.isFinite(p.metrics.visitsGrowthPct))
    .map((p) => ({ domain: p.domain, growthPct: p.metrics.visitsGrowthPct }));
  const pool =
    fromQuadrant.length > 0
      ? fromQuadrant
      : data.players
          .filter((p) => p.visitsDeltaPct !== null)
          .map((p) => ({ domain: p.domain, growthPct: p.visitsDeltaPct as number }));
  if (pool.length === 0) return null;
  return pool.reduce((best, next) => (next.growthPct > best.growthPct ? next : best));
}

/**
 * Market Overview (Master Spec Session 30, MO-01…MO-03, Decision D5) —
 * market-level rollup of the tracked competitor set using Similarweb-native
 * metrics only. Route: /traffic-market/market-overview.
 */
export function MarketOverviewPage() {
  // History-first: consult saved searches before firing any API call. The
  // initial input stays undefined while checking (and forever, once saved
  // history exists), so the query only auto-runs on a true first visit; with
  // saved history the query never auto-runs and the HistoryGate below offers
  // the last searches.
  const historyFirst = useHistoryFirst('market-overview');
  const query = useAnalyticsQuery(
    trafficMarketService.marketOverview,
    historyFirst.checking || historyFirst.hasHistory ? undefined : INITIAL_INPUT,
  );
  const { run } = query;

  // Domain-set chips — seeded from the first data object (live or snapshot).
  const [chips, setChips] = useState<string[] | null>(null);
  const [draft, setDraft] = useState('');

  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  const buildInput = useCallback(
    (monthWindow: number): TrafficMarketInput => {
      const input: TrafficMarketInput = chips && chips.length > 0 ? { domains: chips } : {};
      if (monthWindow !== 12) input.months = monthWindow;
      return input;
    },
    [chips],
  );

  // Snapshot view: the whole page body renders from the saved payload (the
  // page is a single marketOverview section), with live queries left alone.
  const history = useHistorySnapshot<MarketOverviewResult>({
    // "Refresh live data" — the chips were seeded from the snapshot's players,
    // so this refetches the exact set the snapshot shows.
    onRefreshLive: () => run(buildInput(months)),
  });
  const snapshotData =
    history.snapshot && Array.isArray((history.snapshot.payload as MarketOverviewResult | null)?.players)
      ? (history.snapshot.payload as MarketOverviewResult)
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
    if (data && chips === null) {
      setChips(data.players.map((p) => p.domain));
    }
  }, [data, chips]);

  const addDomain = useCallback(() => {
    const domain = normalizeDomain(draft);
    if (!domain) return;
    setChips((prev) => {
      const current = prev ?? [];
      return current.includes(domain) ? current : [...current, domain];
    });
    setDraft('');
  }, [draft]);

  const removeDomain = useCallback((domain: string) => {
    setChips((prev) => (prev ?? []).filter((d) => d !== domain));
  }, []);

  const { clearSnapshot } = history;
  const onApply = useCallback(() => {
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

  // Canonical domain → color map, shared by chips, tables, trend, and dots.
  // Quadrant points lead the order so QuadrantChart's index-based coloring
  // (SERIES_COLORS by point index) stays consistent with the rest of the page.
  const domainOrder = useMemo(() => {
    if (!data) return [] as string[];
    const order: string[] = [];
    const push = (domain: string) => {
      if (!order.includes(domain)) order.push(domain);
    };
    data.quadrant.points.forEach((p) => push(p.domain));
    data.players.forEach((p) => push(p.domain));
    data.keyPlayers.forEach((p) => push(p.domain));
    data.marketTrafficTrend.forEach((s) => push(s.domain));
    return order;
  }, [data]);

  const colorOf = useCallback(
    (domain: string) => {
      const index = domainOrder.indexOf(domain);
      return SERIES_COLORS[(index >= 0 ? index : 0) % SERIES_COLORS.length];
    },
    [domainOrder],
  );

  const orderedTrend = useMemo(() => {
    if (!data) return [];
    return [...data.marketTrafficTrend].sort(
      (a, b) => domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain),
    );
  }, [data, domainOrder]);

  const leader = useMemo(() => {
    if (!data || data.players.length === 0) return null;
    return data.players.reduce((best, next) => (next.marketSharePct > best.marketSharePct ? next : best));
  }, [data]);

  const grower = useMemo(() => (data ? findFastestGrower(data) : null), [data]);

  /** Herfindahl–Hirschman Index — Σ(marketSharePct²) over the tracked players. */
  const hhi = useMemo(() => {
    if (!data || data.players.length === 0) return null;
    return data.players.reduce((sum, player) => sum + player.marketSharePct * player.marketSharePct, 0);
  }, [data]);

  return (
    <div className="space-y-6 p-6">
      <PageHero
        eyebrow="Traffic & Market"
        title="Market Overview"
        icon={PieChart}
        description="Market-level rollup of the tracked competitor set — total traffic, key players, growth dynamics, and per-channel breakdowns."
        actions={<HistoryPanel page="market-overview" onLoad={history.loadSnapshot} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {(chips ?? []).map((domain) => (
            <span
              key={domain}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pl-3 pr-1.5 text-xs font-medium text-white ring-1 ring-white/15"
            >
              {domainOrder.includes(domain) && (
                <span className="h-2 w-2 rounded-full" style={{ background: colorOf(domain) }} aria-hidden />
              )}
              {domain}
              <button
                type="button"
                onClick={() => removeDomain(domain)}
                className="rounded-full p-0.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${domain}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips === null && (
            <span className="text-xs text-cyan-50/60">Loading the tracked competitor set…</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            placeholder="Add a domain, e.g. thepointsguy.com"
            data-hero-search-input=""
            className={cn('h-9 w-64', HERO_INPUT_CLASS)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addDomain}
            disabled={!normalizeDomain(draft)}
            className="h-9 border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
          <Button
            size="sm"
            onClick={onApply}
            disabled={query.loading || chips === null}
            className={cn('h-9', HERO_BUTTON_CLASS)}
          >
            Apply
          </Button>
        </div>
      </PageHero>

      {history.banner}
      <SampleDataBanner meta={data?.meta} />
      <ProviderCaption meta={data?.meta} />

      {/* Cross-page filter row — hidden while viewing a snapshot (its period
          is fixed) and in 'disabled' mode where refetching serves nothing. */}
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
          {/* MO-01 · Market Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              label="Domains"
              value={data ? String(data.domainsCount) : '—'}
              sub="Tracked competitor set"
              icon={Globe2}
              loading={loading}
            />
            <MetricCard
              label="Market Traffic"
              value={formatCompact(data?.marketTraffic ?? null)}
              sub={data ? `${formatDeltaPct(data.marketTrafficDeltaPct)} vs previous month` : undefined}
              icon={TrendingUp}
              loading={loading}
            />
            <MetricCard
              label="Market Leader"
              value={leader?.domain ?? '—'}
              sub={leader ? `${leader.marketSharePct.toFixed(1)}% market share` : undefined}
              icon={Trophy}
              loading={loading}
            />
            <MetricCard
              label="Fastest Grower"
              value={grower?.domain ?? '—'}
              sub={grower ? `${formatDeltaPct(grower.growthPct)} visits growth` : undefined}
              icon={Rocket}
              loading={loading}
            />
            {/* Consolidation meter — HHI derived from players' market shares. */}
            <ConsolidationCard hhi={hhi} loading={loading} />
          </div>

          <KeyPlayersCard players={data?.keyPlayers ?? []} colorOf={colorOf} loading={loading} />

          <MarketTrendCard
            months={data?.meta.months ?? []}
            series={orderedTrend}
            colorOf={colorOf}
            loading={loading}
          />

          {/* MO-02 · Growth Quadrant */}
          <GrowthQuadrantCard quadrant={data?.quadrant ?? null} loading={loading} />

          {/* MO-03 · Market Players */}
          <MarketPlayersTable players={data?.players ?? []} colorOf={colorOf} loading={loading} />
        </>
      )}
    </div>
  );
}
