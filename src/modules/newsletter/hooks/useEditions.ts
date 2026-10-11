import { useState, useEffect } from 'react';
import { subscribeToEditions } from '../services/firestoreSubscriptions';
import type { NewsletterEdition, EditionFilters } from '../types/index';

/**
 * Subscribe to the newsletter-editions collection with optional filters.
 * Returns real-time edition data, loading state, and error state.
 *
 * Requirements: 8.1, 8.2, 8.4, 13.1
 */
export function useEditions(filters?: EditionFilters) {
  const [editions, setEditions] = useState<NewsletterEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToEditions(
      filters,
      (data) => {
        setEditions(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filters?.status, filters?.search, filters?.editionType]);

  return { editions, loading, error };
}
