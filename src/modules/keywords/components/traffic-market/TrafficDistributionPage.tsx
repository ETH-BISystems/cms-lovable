import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from '@/lib/router-compat';
import { Info, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { trafficMarketService } from '../../services/trafficMarketService';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import type {
  ChannelViewInput,
  ChannelViewResult,
  DeviceKey,
  DistributionChannel,
  DomainSeries,
} from '../../types/trafficMarket';
import { TRAFFIC_CHANNEL_LABELS } from '../../types/trafficMarket';
import { ChartCard } from '../analytics/ChartCard';
import { PageHero } from '../analytics/PageHero';
import { ErrorState } from '../analytics/StatusStates';
import { formatNumber } from '../analytics/format';
import { DEFAULT_DOMAIN } from '../analytics/constants';
import { SankeyFlow } from './charts/SankeyFlow';
import { ClickstreamGatedCard } from './shared/ClickstreamGatedCard';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TopGrowingPages } from './shared/TopGrowingPages';
import { TrafficFilterBar, regionLabel } from './shared/TrafficFilterBar';
import { TrendTrio } from './shared/TrendTrio';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { WordCloudChart } from './shared/WordCloudChart';

/** Tab order for the seven Traffic Distribution channels (Sessions 34–40). */
const CHANNELS: DistributionChannel[] = [
  'referral',
  'organic_search',
  'paid_search',
  'organic_social',
  'paid_social',
  'email',
  'display_ads',
];

/**
 * Expected panels per channel. Rendering is driven by the RESPONSE nulls;
 * this map only shapes the pre-data skeleton layout.
 */
const CHANNEL_CAPABILITIES: Record<DistributionChannel, { topSources: boolean; topKeywords: boolean }> = {
  referral: { topSources: true, topKeywords: false },
  organic_search: { topSources: true, topKeywords: true },
  paid_search: { topSources: true, topKeywords: true },
  organic_social: { topSources: true, topKeywords: false },
  paid_social: { topSources: true, topKeywords: false },
  email: { topSources: false, topKeywords: false },
  display_ads: { topSources: false, topKeywords: false },
};

const EMPTY_TRENDS: Record<DeviceKey, DomainSeries[]> = { all: [], desktop: [], mobile: [] };

type OrganicMode = 'organic' | 'ai_mode';

function isDistributionChannel(value: string | null): value is DistributionChannel {
  return value !== null && (CHANNELS as string[]).includes(value);
}

/** OS-01 (D7) — Organic Rankings / AI-Mode Presence segmented toggle. */
function OrganicModeToggle({ mode, onChange }: { mode: OrganicMode; onChange: (mode: OrganicMode) => void }) {
  const options: Array<{ value: OrganicMode; label: string }> = [
    { value: 'organic', label: 'Organic Rankings' },
    { value: 'ai_mode', label: 'AI-Mode Presence' },
  ];
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-muted p-1" role="group" aria-label="Organic series mode">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            mode === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Traffic Distribution (Sessions 34–40) — the shared channel template serving
 * all seven distribution channels via URL-synced tabs (`?channel=`). Each
 * channel gets the trend trio + top growing pages; Top Sources (Sankey) and
 * Top Keywords (word cloud) render only where the response provides them.
 * Organic Search adds the D7 Organic Rankings / AI-Mode Presence toggle.
 * Prior data stays visible (dimmed) while a tab switch refetches.
 */
export function TrafficDistributionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const channel: DistributionChannel = isDistributionChannel(channelParam) ? channelParam : 'referral';

  const [organicMode, setOrganicMode] = useState<OrganicMode>('organic');
  const effectiveMode = channel === 'organic_search' ? organicMode : undefined;

  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  const query = useAnalyticsQuery(trafficMarketService.channelView);
  const { run } = query;

  // History-first: consult saved searches (for the channel the page opened
  // on) before firing any API call.
  const historyFirst = useHistoryFirst('distribution', channel);

  // While saved history exists, the HistoryGate below blocks the live query
  // until the user re-opens a saved search or explicitly goes live (New
  // search, a channel switch, or the Organic/AI-Mode toggle).
  const [gateDismissed, setGateDismissed] = useState(false);

  // Snapshot view: a loaded snapshot replaces the channel-view data object;
  // switching channels (or Organic/AI-Mode) always returns to live data.
  // "Refresh live data" dismisses the gate; clearing the snapshot then
  // un-gates the effect below, which refetches.
  const history = useHistorySnapshot<ChannelViewResult>({
    onRefreshLive: () => setGateDismissed(true),
  });
  const { snapshot, clearSnapshot } = history;
  const snapshotData =
    snapshot && (snapshot.payload as ChannelViewResult | null)?.trends !== undefined
      ? (snapshot.payload as ChannelViewResult)
      : null;
  const data = snapshotData ?? query.data;

  /** History-first gate: shown instead of content until the user chooses. */
  const showHistoryGate = !historyFirst.checking && historyFirst.hasHistory && !gateDismissed && !snapshot;

  useEffect(() => {
    // Suppress fetches while the history check runs, while the history gate
    // is showing, and while any snapshot is showing.
    if (historyFirst.checking || showHistoryGate || snapshot) return;
    const input: ChannelViewInput = { channel };
    if (effectiveMode) input.organicMode = effectiveMode;
    if (months !== 12) input.months = months;
    run(input);
  }, [run, channel, effectiveMode, snapshot, months, historyFirst.checking, showHistoryGate]);

  const onChannelChange = useCallback(
    (value: string) => {
      clearSnapshot();
      setGateDismissed(true);
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('channel', value);
        return next;
      });
    },
    [setSearchParams, clearSnapshot],
  );

  const onOrganicModeChange = useCallback(
    (mode: OrganicMode) => {
      clearSnapshot();
      setGateDismissed(true);
      setOrganicMode(mode);
    },
    [clearSnapshot],
  );

  const caps = CHANNEL_CAPABILITIES[channel];
  const initialLoading = !data;
  const refetching = !snapshotData && query.loading && data !== null;
  const aiModeActive = effectiveMode === 'ai_mode';
  /** No Similarweb key + sample mode off — only the DataForSEO cloud stays live. */
  const integrationDisabled = data?.meta.dataSource === 'disabled';
  /** The five clickstream channels are gated on plain 'dataforseo'. */
  const channelGated = data?.channelGated === true;

  // Drive panel visibility from the response nulls; fall back to the
  // capability map for the pre-data skeletons. On a live-DFS search channel
  // without Similarweb, `topSources === null` on a channel that HAS a Top
  // Sources panel renders as an inline clickstream gate instead of hiding —
  // keeping the xl two-column Top Sources | Top Keywords layout engaged.
  const topSourcesGated = data !== null && !channelGated && caps.topSources && data.topSources === null;
  const showTopSources = data ? data.topSources !== null || topSourcesGated : caps.topSources;
  const showTopKeywords = data ? data.topKeywords !== null : caps.topKeywords;

  return (
    <div className="p-6 space-y-6">
      <PageHero
        eyebrow="Traffic & Market"
        title="Traffic Distribution"
        icon={Route}
        description={
          <>
            One channel template across all eight distribution channels — AI Traffic has its own dedicated page:{' '}
            <Link
              to="/traffic-market/ai-traffic"
              className="font-medium text-cyan-200 underline-offset-2 hover:underline"
            >
              open AI Traffic
            </Link>
            .
          </>
        }
        actions={<HistoryPanel page="distribution" channel={channel} onLoad={history.loadSnapshot} />}
      />

      {history.banner}
      <SampleDataBanner meta={data?.meta} />
      <ProviderCaption meta={data?.meta} />

      {/* Cross-page filter row — hidden during snapshot view (fixed period)
          and when the channel's panels stand down (disabled / gated). */}
      {!snapshot && data && !integrationDisabled && !channelGated && (
        <TrafficFilterBar
          months={months}
          onMonthsChange={setMonths}
          region={data.meta.region}
          disabled={query.loading}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={channel} onValueChange={onChannelChange}>
          <TabsList className="h-auto flex-wrap justify-start">
            {CHANNELS.map(ch => (
              <TabsTrigger key={ch} value={ch} className="text-xs sm:text-sm">
                {TRAFFIC_CHANNEL_LABELS[ch]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {/* D7 toggle stays whenever the channel itself isn't gated. */}
        {channel === 'organic_search' && !integrationDisabled && !channelGated && (
          <OrganicModeToggle mode={organicMode} onChange={onOrganicModeChange} />
        )}
      </div>

      {aiModeActive && !integrationDisabled && (
        <div className="flex items-start gap-2.5 rounded-xl bg-sky-50 px-4 py-2.5 text-[13px] leading-snug text-sky-800 ring-1 ring-sky-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Series show Google AI-Mode <em>presence</em> tracked via SERP data — how often the domain set appears in
            AI-Mode results — not a traffic split.
          </p>
        </div>
      )}

      {showHistoryGate ? (
        // History-first gate: no API call is made while it shows. "New search"
        // dismisses it, which un-gates the live effect for the current channel.
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={loaded => history.loadSnapshot(loaded, 'auto')}
          onNewSearch={() => setGateDismissed(true)}
        />
      ) : query.error && !snapshotData ? (
        <ErrorState message={query.error} onRetry={query.retry} />
      ) : channelGated ? (
        // Clickstream channel on plain 'dataforseo' — the tabs above stay
        // navigable (organic/paid remain fully live); the panels stand down.
        <div className={cn('transition-opacity duration-300', refetching && 'opacity-60')}>
          <ClickstreamGatedCard note={`${TRAFFIC_CHANNEL_LABELS[channel]} traffic is a clickstream channel — organic and paid search stay live via DataForSEO.`} />
        </div>
      ) : integrationDisabled ? (
        // Tabs above stay live (switching refetches, dimming applies); only the
        // Similarweb-backed panels stand down. The Organic Search keyword cloud
        // is DataForSEO-sourced, so it keeps rendering beneath the card.
        <div className={cn('space-y-6 transition-opacity duration-300', refetching && 'opacity-60')}>
          <SimilarwebDisabledCard />
          {data && data.topKeywords !== null && (
            <ChartCard
              title="Top Keywords"
              description="Live DataForSEO data — available without Similarweb."
              loading={initialLoading}
              skeletonHeight={300}
            >
              <WordCloudChart terms={data.topKeywords} />
            </ChartCard>
          )}
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity duration-300', refetching && 'opacity-60')}>
          <TrendTrio
            months={data?.meta.months ?? []}
            trends={data?.trends ?? EMPTY_TRENDS}
            loading={initialLoading}
            title={aiModeActive ? 'AI-Mode Presence Trend' : 'Traffic Trend'}
            description={aiModeActive ? 'AI-Mode presence (SERP-tracked)' : undefined}
            // DataForSEO has no device split — render the single all-device trend.
            showDeviceSplit={data ? data.deviceSplitAvailable : true}
          />

          <TopGrowingPages
            cards={data?.topGrowingPages ?? []}
            loading={initialLoading}
            domain={DEFAULT_DOMAIN}
            emptyMessage="Nothing found — try changing filters."
          />

          {/* Top Sources | Top Keywords sit side by side on xl when a channel
              serves both (organic/paid search); otherwise full width. */}
          {(showTopSources || showTopKeywords) && (
            <div className={cn('grid gap-6', showTopSources && showTopKeywords && 'xl:grid-cols-2')}>
              {showTopSources && (topSourcesGated ? (
                <ChartCard
                  title="Top Sources"
                  description={`Where ${TRAFFIC_CHANNEL_LABELS[channel].toLowerCase()} traffic flows in from — band thickness encodes share`}
                  loading={initialLoading}
                >
                  <ClickstreamGatedCard inline note="Referrer flows come from Similarweb clickstream data." />
                </ChartCard>
              ) : (
                <ChartCard
                  title="Top Sources"
                  description={`Where ${TRAFFIC_CHANNEL_LABELS[channel].toLowerCase()} traffic flows in from — band thickness encodes share`}
                  loading={initialLoading}
                  skeletonHeight={380}
                >
                  <SankeyFlow
                    center={DEFAULT_DOMAIN}
                    sources={(data?.topSources ?? []).map(s => ({
                      name: s.name,
                      share: s.share,
                      deltaPct: s.deltaPct,
                    }))}
                  />
                </ChartCard>
              ))}

              {showTopKeywords && (
                <ChartCard
                  title="Top Keywords"
                  description={`Ranked keywords driving this channel, weighted by search volume${
                    data?.meta.region ? ` (${regionLabel(data.meta.region)} · all devices)` : ''
                  }`}
                  loading={initialLoading}
                  skeletonHeight={300}
                  actions={
                    data?.topKeywordsTotalCount != null ? (
                      <Badge variant="secondary" className="font-normal">
                        {formatNumber(data.topKeywordsTotalCount)} keywords analysed
                      </Badge>
                    ) : undefined
                  }
                >
                  <WordCloudChart terms={data?.topKeywords ?? []} />
                </ChartCard>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
