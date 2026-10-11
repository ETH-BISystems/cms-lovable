import { useState, useEffect } from 'react';
import { cardService } from '../services/cardService';
import type { ScraperStatus } from '../types';

interface UseScraperStatusResult extends ScraperStatus {
  loading: boolean;
  error: Error | null;
}

const DEFAULT_STATUS: ScraperStatus = {
  lastScrapedAt: null,
  nextScheduledAt: null,
  health: 'healthy',
  recentErrors: [],
  isRunning: false,
};

/**
 * Real-time subscription to the `scraper_status/current` document
 * (production: onSnapshot on that doc). Falls back to a healthy default
 * when the document does not exist yet.
 */
export function useScraperStatus(): UseScraperStatusResult {
  const [status, setStatus] = useState<ScraperStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsub = cardService.subscribeToScraperStatus(
      (doc) => {
        setStatus({ ...DEFAULT_STATUS, ...doc });
        setLoading(false);
      },
      (err) => {
        setError(err);
        setStatus(DEFAULT_STATUS);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { ...status, loading, error };
}
