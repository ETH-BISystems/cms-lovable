import { useState, useEffect } from 'react';
import { getKeywordById } from '../services/keywordsService';
import type { KeywordOpportunity } from '../types';

export function useKeywordDetail(id: string | null) {
  const [keyword, setKeyword] = useState<KeywordOpportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setKeyword(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getKeywordById(id)
      .then((data) => {
        if (!cancelled) {
          setKeyword(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { keyword, loading, error };
}
