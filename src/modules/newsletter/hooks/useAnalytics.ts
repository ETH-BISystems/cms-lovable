import { useMemo } from 'react';
import { useEditions } from './useEditions';
import type { AnalyticsMetrics, TopBlock } from '../types/index';

/**
 * Derive analytics from sent editions.
 * Computes average open/click rates, growth, and top performing blocks.
 *
 * Requirements: 7.1, 7.2, 7.6
 */
export function useAnalytics() {
  const { editions, loading, error } = useEditions({ status: 'Sent', search: '', editionType: 'All' });

  const sentEditions = useMemo(
    () => editions.filter((e) => e.status === 'Sent'),
    [editions],
  );

  const metrics = useMemo<AnalyticsMetrics>(() => {
    const editionsWithAnalytics = sentEditions.filter(
      (e) => e.openRate !== undefined && e.clickRate !== undefined,
    );

    if (editionsWithAnalytics.length === 0) {
      return {
        avgOpenRate: 0,
        avgClickRate: 0,
        totalSubscribers: 0,
        subscriberGrowthRate: 0,
        openRateTrend: 'stable',
        clickRateTrend: 'stable',
      };
    }

    const avgOpenRate =
      Math.round(
        (editionsWithAnalytics.reduce((sum, e) => sum + (e.openRate ?? 0), 0) /
          editionsWithAnalytics.length) *
          100,
      ) / 100;

    const avgClickRate =
      Math.round(
        (editionsWithAnalytics.reduce((sum, e) => sum + (e.clickRate ?? 0), 0) /
          editionsWithAnalytics.length) *
          100,
      ) / 100;

    // Total subscribers from the most recent sent edition
    const sortedByDate = [...editionsWithAnalytics].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    const totalSubscribers = sortedByDate[0]?.subscriberCount ?? 0;

    // Growth rate: compare subscriber count of most recent vs oldest
    const oldestCount =
      sortedByDate.length > 1
        ? sortedByDate[sortedByDate.length - 1].subscriberCount
        : totalSubscribers;
    const subscriberGrowthRate =
      oldestCount > 0
        ? Math.round(((totalSubscribers - oldestCount) / oldestCount) * 1000) / 10
        : 0;

    // Trends: compare recent half vs older half
    const mid = Math.floor(editionsWithAnalytics.length / 2);
    const recentOpenAvg =
      editionsWithAnalytics.length > 1
        ? editionsWithAnalytics
            .slice(0, mid || 1)
            .reduce((s, e) => s + (e.openRate ?? 0), 0) / (mid || 1)
        : avgOpenRate;
    const olderOpenAvg =
      mid > 0
        ? editionsWithAnalytics
            .slice(mid)
            .reduce((s, e) => s + (e.openRate ?? 0), 0) /
          (editionsWithAnalytics.length - mid)
        : avgOpenRate;

    const recentClickAvg =
      editionsWithAnalytics.length > 1
        ? editionsWithAnalytics
            .slice(0, mid || 1)
            .reduce((s, e) => s + (e.clickRate ?? 0), 0) / (mid || 1)
        : avgClickRate;
    const olderClickAvg =
      mid > 0
        ? editionsWithAnalytics
            .slice(mid)
            .reduce((s, e) => s + (e.clickRate ?? 0), 0) /
          (editionsWithAnalytics.length - mid)
        : avgClickRate;

    const openRateTrend: 'up' | 'down' | 'stable' =
      recentOpenAvg > olderOpenAvg + 0.5
        ? 'up'
        : recentOpenAvg < olderOpenAvg - 0.5
          ? 'down'
          : 'stable';

    const clickRateTrend: 'up' | 'down' | 'stable' =
      recentClickAvg > olderClickAvg + 0.5
        ? 'up'
        : recentClickAvg < olderClickAvg - 0.5
          ? 'down'
          : 'stable';

    return {
      avgOpenRate,
      avgClickRate,
      totalSubscribers,
      subscriberGrowthRate,
      openRateTrend,
      clickRateTrend,
    };
  }, [sentEditions]);

  // Top performing blocks across all sent editions
  const topBlocks = useMemo<TopBlock[]>(() => {
    const blockPerformance: TopBlock[] = [];

    for (const edition of sentEditions) {
      if (!edition.clickRate) continue;

      for (const block of edition.blocks) {
        blockPerformance.push({
          title: block.title,
          type: block.type,
          clickRate: edition.clickRate,
          clicks: Math.round((edition.clickRate / 100) * (edition.subscriberCount || 0)),
          editionNumber: edition.number,
        });
      }
    }

    return blockPerformance
      .sort((a, b) => b.clickRate - a.clickRate)
      .slice(0, 10);
  }, [sentEditions]);

  return { metrics, topBlocks, loading, error };
}
