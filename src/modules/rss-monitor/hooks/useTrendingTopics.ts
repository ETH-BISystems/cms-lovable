import { useState, useEffect } from 'react';
import type { TrendingTopic } from '../types';
import { subscribeToTrendingTopics } from '../services/rssService';

export function useTrendingTopics() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // production: onSnapshot(query(collection(db, 'trending-topics'),
    //   where('expiresAt', '>', now), orderBy('expiresAt', 'asc')))
    // Single inequality only — the writer (updateTrendingTopics) already
    // filters to topics seen in 2+ sources, so no count filter is needed here.
    const unsubscribe = subscribeToTrendingTopics(
      (data) => {
        setTopics(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  return { topics, loading, error };
}
