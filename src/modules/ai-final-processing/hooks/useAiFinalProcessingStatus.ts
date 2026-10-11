import { useCallback, useEffect, useState } from 'react';
import { getStatus } from '../services/aiFinalProcessingService';
import type { AiFinalProcessingStatusResponse } from '../types';

/**
 * Loads the AI Final Processing status (settings, queue depth, scheduler,
 * telemetry, recent executions). `refresh` re-polls — the settings tab calls
 * it after saves and Run Now, and on an interval while an execution runs.
 */
export function useAiFinalProcessingStatus(pollWhileRunningMs = 15_000) {
  const [data, setData] = useState<AiFinalProcessingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const status = await getStatus();
      setData(status);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const running = data?.recentExecutions?.some((e) => e.status === 'running') ?? false;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => void refresh(), pollWhileRunningMs);
    return () => clearInterval(t);
  }, [running, pollWhileRunningMs, refresh]);

  return { data, loading, error, refresh, running };
}
