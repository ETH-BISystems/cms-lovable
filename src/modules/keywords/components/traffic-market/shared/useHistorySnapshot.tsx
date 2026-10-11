import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoryEntryMeta, HistoryGetResult } from '../../../types/trafficMarket';

/**
 * How the snapshot got onto the screen:
 * - 'manual' — the user picked it from the History panel (live data may exist
 *   behind it, so the banner offers "Back to live");
 * - 'auto'   — the user opened it from the history-first gate before any API
 *   call was made (nothing live exists yet, so the banner offers "Refresh
 *   live data").
 */
export type SnapshotMode = 'manual' | 'auto';

function SnapshotBanner({
  entry,
  mode,
  onBack,
  onRefreshLive,
}: {
  entry: HistoryEntryMeta;
  mode: SnapshotMode;
  onBack: () => void;
  onRefreshLive: () => void;
}) {
  const when = new Date(entry.createdAt).toLocaleString();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-2.5 ring-1 ring-amber-200">
      <span className="flex items-center gap-2.5 text-[13px] leading-snug text-amber-800">
        <History className="h-4 w-4 shrink-0" />
        {mode === 'auto' ? (
          <span>
            Saved snapshot from <span className="font-semibold">{when}</span> ({entry.domains.join(', ')}) — no API
            call made.
          </span>
        ) : (
          <span>
            Viewing snapshot from <span className="font-semibold">{when}</span> ({entry.domains.join(', ')})
          </span>
        )}
      </span>
      {mode === 'auto' ? (
        <Button size="sm" onClick={onRefreshLive} className="h-7 bg-amber-600 text-xs text-white hover:bg-amber-700">
          Refresh live data
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="h-7 border-amber-300 bg-white/60 text-xs text-amber-900 hover:bg-white"
        >
          Back to live
        </Button>
      )}
    </div>
  );
}

export interface HistorySnapshot<TPayload> {
  entry: HistoryEntryMeta;
  payload: TPayload;
  mode: SnapshotMode;
}

export interface UseHistorySnapshotOptions<TPayload> {
  /**
   * Auto mode's "Refresh live data" — fire the page's live query. Called with
   * the snapshot that was showing, right after it is cleared, so pages can
   * derive the query input from its payload. Pages whose query re-runs by
   * itself once the snapshot clears (effect-driven queries) can omit this.
   */
  onRefreshLive?: (snapshot: HistorySnapshot<TPayload>) => void;
}

/**
 * Page-side state for viewing a saved history snapshot instead of live data.
 * Compose with the page's query: while `snapshot` is non-null, render
 * `snapshot.payload` as the page's data object, suppress refetches, and show
 * `banner` (amber strip) where the sample banner sits. Wire `loadSnapshot` to
 * HistoryPanel's onLoad ('manual' mode) and to HistoryGate's onLoad with
 * 'auto' mode for history-first page opens.
 */
export function useHistorySnapshot<TPayload>(options?: UseHistorySnapshotOptions<TPayload>) {
  const [snapshot, setSnapshot] = useState<HistorySnapshot<TPayload> | null>(null);

  // Latest onRefreshLive without re-memoizing the banner every render.
  const onRefreshLiveRef = useRef(options?.onRefreshLive);
  onRefreshLiveRef.current = options?.onRefreshLive;

  const loadSnapshot = useCallback((result: HistoryGetResult, mode: SnapshotMode = 'manual') => {
    setSnapshot({ entry: result.entry, payload: result.payload as TPayload, mode });
  }, []);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
  }, []);

  const banner: ReactNode = useMemo(
    () =>
      snapshot ? (
        <SnapshotBanner
          entry={snapshot.entry}
          mode={snapshot.mode}
          onBack={clearSnapshot}
          onRefreshLive={() => {
            clearSnapshot();
            onRefreshLiveRef.current?.(snapshot);
          }}
        />
      ) : null,
    [snapshot, clearSnapshot],
  );

  return { snapshot, loadSnapshot, clearSnapshot, banner };
}
