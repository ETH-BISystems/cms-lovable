import { useState, useEffect, useMemo } from 'react';
import { subscribeToSubscribers } from '../services/firestoreSubscriptions';
import type { SubscriberProfile, SubscriberStats } from '../types/index';

/**
 * Subscribe to subscriber-profiles collection.
 * Computes aggregate stats: total, growth, funnel, sources, tags.
 *
 * Requirements: 6.1, 6.2, 6.7, 13.2
 */
export function useSubscribers() {
  const [subscribers, setSubscribers] = useState<SubscriberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToSubscribers(
      (data) => {
        setSubscribers(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const stats = useMemo<SubscriberStats>(() => {
    const totalSubscribers = subscribers.filter((s) => s.status === 'active').length;

    // Net growth: subscribers joined in last 30 days minus unsubscribed in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJoins = subscribers.filter(
      (s) => s.joinedAt >= thirtyDaysAgo && s.status === 'active',
    ).length;

    const recentChurns = subscribers.filter(
      (s) =>
        s.status === 'unsubscribed' &&
        s.lastSyncedAt >= thirtyDaysAgo,
    ).length;

    const netGrowth = recentJoins - recentChurns;

    const growthTrend: 'up' | 'down' | 'stable' =
      netGrowth > 0 ? 'up' : netGrowth < 0 ? 'down' : 'stable';

    // Source breakdown from tags (convention: tags starting with "source:" indicate acquisition source)
    const sourceMap = new Map<string, number>();
    for (const sub of subscribers) {
      if (sub.status !== 'active') continue;
      const sourceTag = sub.tags.find((t) => t.startsWith('source:'));
      const source = sourceTag ? sourceTag.replace('source:', '') : 'Organic';
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
    }

    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([source, count]) => ({
        source,
        count,
        percentage:
          totalSubscribers > 0
            ? Math.round((count / totalSubscribers) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalSubscribers,
      netGrowth,
      growthTrend,
      sourceBreakdown,
    };
  }, [subscribers]);

  // Lifecycle funnel counts
  const funnelCounts = useMemo(() => {
    const stages = ['new', 'active', 'engaged', 'at-risk', 'churned'] as const;
    const counts: Record<string, number> = {};
    for (const stage of stages) {
      counts[stage] = subscribers.filter((s) => s.lifecycleStage === stage).length;
    }
    return counts;
  }, [subscribers]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const tagMap = new Map<string, number>();
    for (const sub of subscribers) {
      for (const tag of sub.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [subscribers]);

  return {
    subscribers,
    stats,
    funnelCounts,
    tagCounts,
    loading,
    error,
  };
}
