import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, Trash2, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { trafficMarketService } from '../../../services/trafficMarketService';
import { TRAFFIC_CHANNEL_LABELS } from '../../../types/trafficMarket';
import type {
  DistributionChannel,
  HistoryEntryMeta,
  HistoryGetResult,
  TrafficMarketPage,
} from '../../../types/trafficMarket';
import { formatRelativeTime, formatResultCounts, ProviderBadge } from './historyMeta';

const PAGE_LIMIT = 20;
/** Max domain chips shown per entry before collapsing into "+N". */
const MAX_DOMAIN_CHIPS = 3;

function HistoryEntryRow({
  entry,
  loadingLoad,
  onLoad,
  onDelete,
}: {
  entry: HistoryEntryMeta;
  loadingLoad: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const shownDomains = entry.domains.slice(0, MAX_DOMAIN_CHIPS);
  const extraDomains = entry.domains.length - shownDomains.length;
  const absolute = new Date(entry.createdAt).toLocaleString();

  return (
    <div className="space-y-2 rounded-xl p-3 ring-1 ring-black/[0.06]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium" title={absolute}>
          {formatRelativeTime(entry.createdAt)}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{absolute}</span>
        </span>
        <ProviderBadge provider={entry.provider} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {shownDomains.map(domain => (
          <span
            key={domain}
            className="inline-flex max-w-[160px] truncate rounded-full bg-muted px-2 py-0.5 text-xs"
            title={domain}
          >
            {domain}
          </span>
        ))}
        {extraDomains > 0 && (
          <span
            className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            title={entry.domains.slice(MAX_DOMAIN_CHIPS).join(', ')}
          >
            +{extraDomains}
          </span>
        )}
        {entry.channel && (
          <Badge variant="secondary" className="font-normal text-muted-foreground">
            {TRAFFIC_CHANNEL_LABELS[entry.channel]}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {formatResultCounts(entry.resultCounts) || entry.section}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs" disabled={loadingLoad} onClick={onLoad}>
            {loadingLoad && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Load
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Delete snapshot"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this snapshot?</AlertDialogTitle>
                <AlertDialogDescription>
                  The saved result from {absolute} ({entry.domains.join(', ')}) will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

export interface HistoryPanelProps {
  /** Which Traffic & Market surface's snapshots to list. */
  page: TrafficMarketPage;
  /**
   * Distribution page only — the current channel tab. Entries carry their
   * channel, so the list is narrowed client-side to the active channel.
   */
  channel?: DistributionChannel;
  /** Called with the full snapshot after the user picks "Load". */
  onLoad: (snapshot: HistoryGetResult) => void;
  /**
   * Trigger button classes — the default suits the dark hero band; pages with
   * a light header pass their own (e.g. muted-foreground ghost styling).
   */
  triggerClassName?: string;
}

/**
 * "History" hero button + right-side sheet listing the page's saved search
 * snapshots (every search saves one automatically). Supports domain-substring
 * and date-range filters, cursor-paged "Load more", per-entry delete with
 * confirmation, and loading a snapshot back into the page via `onLoad`.
 */
export function HistoryPanel({ page, channel, onLoad, triggerClassName }: HistoryPanelProps) {
  const [open, setOpen] = useState(false);

  // Filters — domain substring is debounced before hitting the callable.
  const [domainFilter, setDomainFilter] = useState('');
  const [debouncedDomain, setDebouncedDomain] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [entries, setEntries] = useState<HistoryEntryMeta[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedDomain(domainFilter.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [domainFilter]);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const result = await trafficMarketService.historyList({
        page,
        domain: debouncedDomain || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: PAGE_LIMIT,
        cursor,
      });
      return result;
    },
    [page, debouncedDomain, from, to],
  );

  // (Re)load the first page whenever the sheet opens or a filter changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage()
      .then(result => {
        if (cancelled) return;
        setEntries(result.entries);
        setNextCursor(result.nextCursor);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load history');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchPage]);

  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchPage(nextCursor)
      .then(result => {
        setEntries(prev => [...prev, ...result.entries]);
        setNextCursor(result.nextCursor);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load more history');
      })
      .finally(() => setLoadingMore(false));
  };

  const handleLoad = (id: string) => {
    setLoadingId(id);
    trafficMarketService
      .historyGet({ id })
      .then(snapshot => {
        onLoad(snapshot);
        setOpen(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load the snapshot');
      })
      .finally(() => setLoadingId(null));
  };

  const handleDelete = (id: string) => {
    trafficMarketService
      .historyDelete({ id })
      .then(() => {
        setEntries(prev => prev.filter(entry => entry.id !== id));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to delete the snapshot');
      });
  };

  const hasFilters = domainFilter !== '' || from !== '' || to !== '';
  const clearFilters = () => {
    setDomainFilter('');
    setFrom('');
    setTo('');
  };

  /** Distribution page: narrow the list to the active channel client-side. */
  const visibleEntries = useMemo(
    () => (channel ? entries.filter(entry => entry.channel === null || entry.channel === channel) : entries),
    [entries, channel],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={triggerClassName ?? 'text-cyan-50/80 hover:bg-white/10 hover:text-white'}
        >
          <Clock className="mr-1.5 h-3.5 w-3.5" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Search history</SheetTitle>
          <SheetDescription>
            Snapshots of past searches on this page — load one to review it, exactly as it was returned.
          </SheetDescription>
        </SheetHeader>

        {/* Filter row */}
        <div className="space-y-2">
          <Input
            value={domainFilter}
            onChange={event => setDomainFilter(event.target.value)}
            placeholder="Filter by domain…"
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={event => setFrom(event.target.value)}
              aria-label="From date"
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={to}
              onChange={event => setTo(event.target.value)}
              aria-label="To date"
              className="h-8 text-xs"
            />
            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={clearFilters}
                aria-label="Clear filters"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex-1 space-y-2.5">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : visibleEntries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {hasFilters
                ? 'No snapshots match your filters.'
                : 'No saved snapshots yet — searches are saved automatically.'}
            </p>
          ) : (
            visibleEntries.map(entry => (
              <HistoryEntryRow
                key={entry.id}
                entry={entry}
                loadingLoad={loadingId === entry.id}
                onLoad={() => handleLoad(entry.id)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))
          )}

          {!loading && nextCursor && (
            <Button variant="outline" size="sm" className="w-full" onClick={loadMore} disabled={loadingMore}>
              {loadingMore && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Load more
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
