import { useState } from 'react';
import { ArrowRight, History, Loader2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trafficMarketService } from '../../../services/trafficMarketService';
import { TRAFFIC_CHANNEL_LABELS } from '../../../types/trafficMarket';
import type { HistoryEntryMeta, HistoryGetResult } from '../../../types/trafficMarket';
import { formatRelativeTime, formatResultCounts, ProviderBadge } from './historyMeta';

/**
 * Default "New search" action: scroll the hero search input into view and
 * focus it. Every DataForSEO page's hero input carries
 * `data-hero-search-input` (AnalyticsSearchHeader sets it; custom heroes set
 * it on their own Input).
 */
function focusHeroSearchInput() {
  const input = document.querySelector<HTMLInputElement>('[data-hero-search-input]');
  if (!input) return;
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus({ preventScroll: true });
}

function GateEntryCard({
  entry,
  isLatest,
  loading,
  disabled,
  onOpen,
}: {
  entry: HistoryEntryMeta;
  isLatest: boolean;
  loading: boolean;
  disabled: boolean;
  onOpen: () => void;
}) {
  const absolute = new Date(entry.createdAt).toLocaleString();
  const [primaryDomain, ...extraDomains] = entry.domains.length > 0 ? entry.domains : ['—'];

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      className={cn(
        'group flex flex-col gap-2 rounded-xl bg-card p-4 text-left ring-1 ring-black/[0.06] transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md hover:ring-accent/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        disabled && !loading && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground" title={absolute}>
          {formatRelativeTime(entry.createdAt)}
        </span>
        <span className="flex items-center gap-1.5">
          {isLatest && (
            <Badge className="bg-accent/15 font-normal text-accent hover:bg-accent/15">Latest</Badge>
          )}
          <ProviderBadge provider={entry.provider} />
        </span>
      </div>

      <span className="truncate text-base font-semibold" title={entry.domains.join(', ')}>
        {primaryDomain}
        {extraDomains.length > 0 && (
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">+{extraDomains.length} more</span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{formatResultCounts(entry.resultCounts) || entry.section}</span>
        {entry.channel && (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            {TRAFFIC_CHANNEL_LABELS[entry.channel]}
          </Badge>
        )}
      </span>

      <span className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-accent">
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Opening saved results…
          </>
        ) : (
          <>
            Open saved results
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </span>
    </button>
  );
}

export interface HistoryGateProps {
  /** Recent searches from `useHistoryFirst` — newest first. */
  entries: HistoryEntryMeta[];
  /** Called with the full snapshot after the user picks a recent search. */
  onLoad: (snapshot: HistoryGetResult) => void;
  /**
   * "New search" CTA. Defaults to scrolling to + focusing the hero search
   * input; effect-driven pages pass their own (dismiss the gate → fetch live).
   */
  onNewSearch?: () => void;
}

/**
 * History-first landing panel: rendered in the content area on page open when
 * saved searches exist, INSTEAD of firing a live DataForSEO/Similarweb call.
 * The user either re-opens one of their last searches (free — the payload is
 * read from Storage) or explicitly starts a new search (live API call).
 */
export function HistoryGate({ entries, onLoad, onNewSearch }: HistoryGateProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openEntry = (id: string) => {
    if (loadingId) return;
    setLoadingId(id);
    setError(null);
    trafficMarketService
      .historyGet({ id })
      .then(onLoad)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load the saved search');
      })
      .finally(() => setLoadingId(null));
  };

  return (
    <section
      aria-label="Recent searches"
      className="animate-fade-up overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/[0.06]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] bg-gradient-to-r from-teal-500/[0.07] via-transparent to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold leading-tight">Pick up where you left off</h2>
            <p className="text-sm text-muted-foreground">
              Your last searches on this page — saved results open instantly, no API call needed.
            </p>
          </div>
        </div>
        <Button onClick={onNewSearch ?? focusHeroSearchInput} className="h-9">
          <Search className="mr-1.5 h-4 w-4" />
          New search
        </Button>
      </div>

      {error && <p className="px-5 pt-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry, index) => (
          <GateEntryCard
            key={entry.id}
            entry={entry}
            isLatest={index === 0}
            loading={loadingId === entry.id}
            disabled={loadingId !== null}
            onOpen={() => openEntry(entry.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.05] bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-accent" />
        Re-opening a saved search is free. The full archive (with filters and delete) is under the
        <span className="font-medium text-foreground">History</span> button in the header.
      </div>
    </section>
  );
}
