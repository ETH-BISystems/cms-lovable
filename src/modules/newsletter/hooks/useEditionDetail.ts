import { useState, useEffect } from 'react';
import { subscribeToEditionDetail } from '../services/firestoreSubscriptions';
import type { NewsletterEdition } from '../types/index';

/**
 * Subscribe to a single edition document by ID.
 * Returns real-time edition data, loading state, and error state.
 *
 * Requirements: 8.3, 8.6
 */
export function useEditionDetail(editionId: string | null) {
  const [edition, setEdition] = useState<NewsletterEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!editionId) {
      setEdition(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToEditionDetail(
      editionId,
      (data) => {
        setEdition(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [editionId]);

  return { edition, loading, error };
}
