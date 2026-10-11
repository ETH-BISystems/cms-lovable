import { useState, useEffect } from 'react';
import type { RSSFeed } from '../types';
import { subscribeToFeeds } from '../services/rssService';

export function useFeeds() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // production: onSnapshot(query(collection(db, 'rss-feeds'), orderBy('createdAt', 'desc')))
    const unsubscribe = subscribeToFeeds(
      (feedData) => {
        setFeeds(feedData);
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

  return { feeds, loading, error };
}
