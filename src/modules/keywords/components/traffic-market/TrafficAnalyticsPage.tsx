import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AreaChart, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HERO_BUTTON_CLASS, HERO_INPUT_CLASS, PageHero } from '../analytics/PageHero';
import { useAnalyticsQuery } from '../../hooks/useAnalyticsQuery';
import { trafficMarketService } from '../../services/trafficMarketService';
import type { TrafficMarketInput, TrafficSummaryResult } from '../../types/trafficMarket';
import { HistoryGate } from './shared/HistoryGate';
import { HistoryPanel } from './shared/HistoryPanel';
import { ProviderCaption } from './shared/ProviderCaption';
import { SampleDataBanner } from './shared/SampleDataBanner';
import { SimilarwebDisabledCard } from './shared/SimilarwebDisabledCard';
import { TrafficFilterBar } from './shared/TrafficFilterBar';
import { useHistoryFirst } from './shared/useHistoryFirst';
import { useHistorySnapshot } from './shared/useHistorySnapshot';
import { SummarySection } from './traffic-analytics/SummarySection';
import { ChannelsSection } from './traffic-analytics/ChannelsSection';
import { JourneyStructureSection } from './traffic-analytics/JourneyStructureSection';
import { BrandPresenceCard, GeoSection } from './traffic-analytics/GeoSection';

/** "https://www.Example.com/path" → "example.com". */
function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

/**
 * Traffic Analytics — flagship page of the Traffic & Market suite
 * (Master Spec Session 29, TA-01…TA-04). Semrush Traffic Analytics parity on
 * clickstream intelligence: competitive summary + trends, channel
 * distribution, traffic journeys, site structure, and geography — served by
 * the Similarweb adapter behind the trafficMarket_* callables.
 *
 * The first load leaves `domains` undefined so the backend returns its
 * configured competitor set; the hero chips are then seeded from the summary
 * response and Apply re-runs every section against the edited set.
 */
export function TrafficAnalyticsPage() {
  // Domain-set editor state: chips being edited vs the applied (fetched) set.
  const [chips, setChips] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [appliedDomains, setAppliedDomains] = useState<string[] | undefined>(undefined);
  const seededRef = useRef(false);

  // Trailing-month window (TrafficFilterBar) — 12 is the backend default.
  const [months, setMonths] = useState(12);

  /** Shared input for the domain-set sections; a new reference triggers refetch. */
  const input = useMemo<TrafficMarketInput>(() => {
    const next: TrafficMarketInput = appliedDomains ? { domains: appliedDomains } : {};
    if (months !== 12) next.months = months;
    return next;
  }, [appliedDomains, months]);

  // History-first: consult saved searches before firing any API call.
  // Offer only summary snapshots — the section this page renders on open;
  // channels/journey/geo captures stay manually loadable from the History panel.
  const historyFirst = useHistoryFirst('traffic-analytics', undefined, 'summary');

  // While saved history exists, the HistoryGate below blocks every live query
  // until the user re-opens a saved search or explicitly goes live.
  const [gateDismissed, setGateDismissed] = useState(false);
  const goLive = () => setGateDismissed(true);

  // TA-01 query lives at page level: its meta feeds the sample-data banner
  // and its rows seed the hero chips + the domain selectors below.
  const summary = useAnalyticsQuery(trafficMarketService.summary);
  const { run: runSummary } = summary;

  // History snapshots on this page carry the primary summary payload; while a
  // snapshot is active the live queries stand down and the page body renders
  // the snapshot's Competitive Summary + Traffic Trend. "Refresh live data"
  // dismisses the gate, and clearing the snapshot un-gates the effect below.
  const history = useHistorySnapshot<TrafficSummaryResult>({
    onRefreshLive: goLive,
  });
  const { snapshot } = history;

  /** History-first gate: shown instead of content until the user chooses. */
  const showHistoryGate = !historyFirst.checking && historyFirst.hasHistory && !gateDismissed && !snapshot;

  /**
   * Live mode is decided: not checking history, no snapshot showing, and the
   * history gate not blocking. Gates the summary fetch AND the mount of the
   * secondary sections (they fire their own queries on mount).
   */
  const liveReady = !historyFirst.checking && !showHistoryGate && !snapshot;

  useEffect(() => {
    if (!liveReady) return; // Suppress fetches while checking / viewing a snapshot.
    runSummary(input);
  }, [input, runSummary, liveReady]);

  /** Snapshot payload, when it is a summary result this page can render. */
  const snapshotSummary =
    snapshot && Array.isArray((snapshot.payload as TrafficSummaryResult | null)?.rows)
      ? (snapshot.payload as TrafficSummaryResult)
      : null;

  // Seed the chips once — from the live competitor set or the auto snapshot.
  const chipSource = summary.data ?? snapshotSummary;
  useEffect(() => {
    if (!seededRef.current && chipSource) {
      seededRef.current = true;
      setChips(chipSource.rows.map(row => row.domain));
    }
  }, [chipSource]);

  /** No Similarweb key + sample mode off — key-dependent sections stand down. */
  const integrationDisabled = summary.data?.meta.dataSource === 'disabled';

  /** The set every section is currently scoped to (colors, selectors). */
  const activeDomains = useMemo(
    () => appliedDomains ?? summary.data?.rows.map(row => row.domain) ?? [],
    [appliedDomains, summary.data],
  );

  const addDomain = (event: FormEvent) => {
    event.preventDefault();
    const domain = normalizeDomain(draft);
    if (!domain || chips.includes(domain)) return;
    setChips(prev => [...prev, domain]);
    setDraft('');
  };

  const removeDomain = (domain: string) => {
    setChips(prev => prev.filter(d => d !== domain));
  };

  const apply = () => {
    if (chips.length === 0) return;
    // Leaving snapshot view: applying a set always returns to live data.
    history.clearSnapshot();
    goLive();
    // Always a fresh array so re-applying the same set acts as a refresh.
    setAppliedDomains([...chips]);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHero
        eyebrow="Traffic & Market"
        title="Traffic Analytics"
        icon={AreaChart}
        description="Competitive search intelligence via DataForSEO, with optional Similarweb clickstream enrichment — visits, engagement, traffic journeys, site structure, and geography for any set of domains."
        actions={<HistoryPanel page="traffic-analytics" onLoad={history.loadSnapshot} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(domain => (
            <span
              key={domain}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15"
            >
              {domain}
              <button
                type="button"
                onClick={() => removeDomain(domain)}
                aria-label={`Remove ${domain}`}
                className="text-white/50 transition-colors hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {chips.length === 0 && !summary.error && !integrationDisabled && !showHistoryGate && (
            <span className="text-xs text-cyan-50/50">Loading competitor set…</span>
          )}
          <form onSubmit={addDomain} className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder="Add domain, e.g. thepointsguy.com"
              data-hero-search-input=""
              className={`h-8 w-60 text-xs ${HERO_INPUT_CLASS}`}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8 border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              disabled={normalizeDomain(draft).length === 0}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </form>
          <Button
            size="sm"
            className={`h-8 ${HERO_BUTTON_CLASS}`}
            onClick={apply}
            disabled={chips.length === 0 || summary.loading}
          >
            Apply
          </Button>
        </div>
      </PageHero>

      {history.banner}

      {showHistoryGate ? (
        // History-first gate: no API call is made while it shows. "New search"
        // dismisses it, which un-gates the live effects (default competitor set).
        <HistoryGate
          entries={historyFirst.entries}
          onLoad={loaded => history.loadSnapshot(loaded, 'auto')}
          onNewSearch={goLive}
        />
      ) : snapshot ? (
        // Snapshot view — the page body becomes the snapshot's summary
        // section; the other sections only ever show live data.
        <>
          {snapshotSummary ? (
            <SummarySection
              data={snapshotSummary}
              loading={false}
              error={null}
              onRetry={history.clearSnapshot}
              orderedDomains={snapshotSummary.rows.map(row => row.domain)}
            />
          ) : (
            <p className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground ring-1 ring-black/[0.05]">
              This snapshot was captured from the “{snapshot.entry.section}” section and can’t be rendered
              here — return to live data to keep exploring.
            </p>
          )}
          <p className="px-1 text-xs text-muted-foreground">
            Channel, journey and geography sections reflect live data only — use “Back to live” to explore them.
          </p>
        </>
      ) : (
        <>
          <SampleDataBanner meta={summary.data?.meta} />
          <ProviderCaption meta={summary.data?.meta} />

          {/* Cross-page filter row — a months change refetches the summary and
              channel sections through the shared input reference. */}
          {!integrationDisabled && summary.data && (
            <TrafficFilterBar
              months={months}
              onMonthsChange={setMonths}
              region={summary.data.meta.region}
              disabled={summary.loading}
            />
          )}

          {integrationDisabled ? (
            // Key-dependent sections stay unmounted (their queries never fire);
            // Brand Presence deep-links to AI Visibility, which needs no key.
            <>
              <SimilarwebDisabledCard />
              <BrandPresenceCard />
            </>
          ) : (
            <>
              {/* TA-01 — Summary + Traffic Trend */}
              <SummarySection
                data={summary.data}
                loading={!liveReady || summary.loading}
                error={summary.error}
                onRetry={summary.retry}
                orderedDomains={activeDomains}
              />

              {/* The secondary sections fire their own queries on mount, so
                  they stay unmounted until the history-first check lands on
                  live data (they also never mount behind a snapshot view). */}
              {liveReady && (
                <>
                  {/* TA-02 — Channel distribution + channel trend */}
                  <ChannelsSection input={input} orderedDomains={activeDomains} />

                  {/* TA-03 — Traffic Journey (Sankey) + site structure */}
                  <JourneyStructureSection domains={activeDomains} />

                  {/* TA-04 — Geo distribution + Brand Presence in AI */}
                  <GeoSection domains={activeDomains} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
