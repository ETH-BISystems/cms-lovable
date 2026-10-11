import { useState, useEffect } from 'react';
import { subscribeToArticleVersions } from '../services/firestoreSubscriptions';
import type { ArticleVersion } from '../types';

export function useArticleVersions(articleId: string | null) {
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!articleId) {
      setVersions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToArticleVersions(
      articleId,
      (data) => {
        setVersions(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [articleId]);

  return { versions, loading, error };
}
