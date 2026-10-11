import { useCallback, useEffect, useRef, useState } from 'react';

interface AnalyticsQueryState<TResult> {
  data: TResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic runner for one seoAnalyticsService call.
 * Tracks loading/error state, ignores stale responses, and exposes retry
 * (re-runs the last input). Pass `initialInput` to auto-run on mount.
 *
 * `initialInput` may start `undefined` and become defined later (the
 * history-first pages gate it on their saved-snapshot check) — the auto-run
 * fires once, on the first render where it is defined. Any explicit `run`
 * consumes the pending auto-run so a user-initiated search can never be
 * followed (and clobbered) by a late default fetch.
 */
export function useAnalyticsQuery<TInput, TResult>(
  fetcher: (input: TInput) => Promise<TResult>,
  initialInput?: TInput,
) {
  const [state, setState] = useState<AnalyticsQueryState<TResult>>({
    data: null,
    loading: initialInput !== undefined,
    error: null,
  });
  const lastInputRef = useRef<TInput | undefined>(initialInput);
  const requestIdRef = useRef(0);
  const initialRanRef = useRef(false);

  const run = useCallback((input: TInput) => {
    initialRanRef.current = true;
    lastInputRef.current = input;
    const requestId = ++requestIdRef.current;
    setState(prev => ({ ...prev, loading: true, error: null }));

    fetcher(input)
      .then(data => {
        if (requestId === requestIdRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (requestId === requestIdRef.current) {
          const message = err instanceof Error ? err.message : 'Request failed';
          setState(prev => ({ ...prev, loading: false, error: message }));
        }
      });
  }, [fetcher]);

  const retry = useCallback(() => {
    if (lastInputRef.current !== undefined) run(lastInputRef.current);
  }, [run]);

  // Auto-run once, on the first render where an initial input is available.
  useEffect(() => {
    if (initialInput !== undefined && !initialRanRef.current) {
      initialRanRef.current = true;
      run(initialInput);
    }
  }, [initialInput, run]);

  // A defined-but-not-yet-fired initial input counts as loading, so pages
  // don't flash their empty state during the render before the effect runs.
  const pendingAutoRun = initialInput !== undefined && !initialRanRef.current;

  return { ...state, loading: state.loading || pendingAutoRun, run, retry };
}
