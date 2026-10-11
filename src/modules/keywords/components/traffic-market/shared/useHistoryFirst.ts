import { useEffect, useRef, useState } from 'react';
import { trafficMarketService } from '../../../services/trafficMarketService';
import type { DistributionChannel, HistoryEntryMeta, SeoHistoryPage } from '../../../types/trafficMarket';

/** How many recent searches the inline HistoryGate offers on page open. */
export const HISTORY_GATE_LIMIT = 6;

export interface HistoryFirstState {
  /** True while the saved-history check is in flight — gate the initial API call on it. */
  checking: boolean;
  /** The page's most recent saved searches (metadata only, no payloads). */
  entries: HistoryEntryMeta[];
  /** True when at least one saved search exists — render HistoryGate, fire no API call. */
  hasHistory: boolean;
}

/**
 * History-first page open: before any live API call, list the page's most
 * recent saved searches (`historyList` only — payloads stay in Storage until
 * the user picks one).
 *
 * Pages compose this with their query:
 * - while `checking`, render the normal loading skeletons and fire nothing;
 * - if `hasHistory`, never auto-run the query — render `HistoryGate` with
 *   `entries` and let the user load a snapshot or start a new search;
 * - if no history exists at all, run the first-visit fetch exactly as before.
 *
 * The check runs exactly once per mount and any failure falls back silently
 * to the live-API path (console.warn only).
 *
 * @param channel Distribution page only — narrows the list to the channel the
 *   page opened on, using the same client-side filter as its History panel.
 * @param section Multi-section pages only (Traffic Analytics) — offer only
 *   snapshots of the section the page can render on open (e.g. 'summary');
 *   other sections remain manually loadable from the History panel.
 * @param enabled Pass false to skip the check entirely (e.g. the Keyword Magic
 *   tool embedded inside another flow) — resolves immediately with no history.
 */
export function useHistoryFirst(
  page: SeoHistoryPage,
  channel?: DistributionChannel,
  section?: string,
  enabled = true,
): HistoryFirstState {
  const [state, setState] = useState<HistoryFirstState>(() => (
    enabled
      ? { checking: true, entries: [], hasHistory: false }
      : { checking: false, entries: [], hasHistory: false }
  ));
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        // Entries carry their channel + section; filtered picks over-fetch a
        // page and keep the first matches client-side.
        const filtered = Boolean(channel || section);
        const list = await trafficMarketService.historyList({
          page,
          limit: filtered ? 30 : HISTORY_GATE_LIMIT,
        });
        const entries = list.entries
          .filter(e => {
            if (channel && !(e.channel === null || e.channel === channel)) return false;
            if (section && e.section !== section) return false;
            return true;
          })
          .slice(0, HISTORY_GATE_LIMIT);
        setState({ checking: false, entries, hasHistory: entries.length > 0 });
      } catch (err) {
        console.warn('[useHistoryFirst] saved-history check failed — falling back to live data', err);
        setState({ checking: false, entries: [], hasHistory: false });
      }
    })();
  }, [page, channel, section, enabled]);

  return state;
}
