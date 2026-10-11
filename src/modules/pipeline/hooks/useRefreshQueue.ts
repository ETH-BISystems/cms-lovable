import { useState, useEffect } from 'react';
import { subscribeToRefreshQueue } from '../services/firestoreSubscriptions';
import type { RefreshQueueItem } from '../types';

export function useRefreshQueue() {
  const [refreshItems, setRefreshItems] = useState<RefreshQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToRefreshQueue(
      (data) => {
        setRefreshItems(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const active = refreshItems.filter((i) => i.status !== 'Re-Published');
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const completedThisMonth = refreshItems.filter(
    (i) => i.status === 'Re-Published' && i.completedAt && i.completedAt >= monthStart
  );
  const improvements = refreshItems
    .filter((i) => i.status === 'Re-Published' && typeof i.positionImprovement === 'number')
    .map((i) => i.positionImprovement as number);

  const stats = {
    inQueue: active.length,
    avgDaysInQueue:
      active.length > 0
        ? Math.round(active.reduce((sum, i) => sum + i.daysInQueue, 0) / active.length)
        : 0,
    refreshedThisMonth: completedThisMonth.length,
    avgPositionImprovement:
      improvements.length > 0
        ? Math.round((improvements.reduce((a, b) => a + b, 0) / improvements.length) * 10) / 10
        : 0,
  };

  return { refreshItems, loading, error, stats };
}
