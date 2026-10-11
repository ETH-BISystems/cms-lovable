import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToArticles, type Unsubscribe } from '../services/firestoreSubscriptions';
import type { PipelineArticle } from '../types';

export function useArticles() {
  const [articles, setArticles] = useState<PipelineArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubRef = useRef<Unsubscribe | null>(null);

  const subscribe = useCallback(() => {
    // Tear down any existing listener first — refetch() must not leak a
    // second onSnapshot subscription.
    unsubRef.current?.();
    setLoading(true);
    unsubRef.current = subscribeToArticles(
      (data) => {
        setArticles(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubRef.current;
  }, []);

  useEffect(() => {
    subscribe();
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [subscribe]);

  const pipelineArticles = articles.filter(
    (a) => a.status !== 'Refreshing' && a.status !== 'Needs Refresh'
  );

  return { articles, pipelineArticles, loading, error, refetch: subscribe };
}
