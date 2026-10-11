import { useState, useEffect, useMemo } from 'react';
import {
  subscribeToCompetitorNewsletters,
  subscribeToCompetitorDebriefs,
} from '../services/firestoreSubscriptions';
import type {
  CompetitorNewsletter,
  CompetitorDebrief,
  SavedTopic,
  TrendingTopic,
  CompetitorScorecard,
  CompetitorFilters,
} from '../types/index';

/**
 * Subscribe to competitor newsletters and debriefs.
 * Computes trending topics and scorecards from the data.
 *
 * Requirements: 5.1, 5.4, 5.5, 5.7, 5.8
 */
export function useCompetitorIntel(filters?: CompetitorFilters) {
  const [newsletters, setNewsletters] = useState<CompetitorNewsletter[]>([]);
  const [debriefs, setDebriefs] = useState<CompetitorDebrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track loading state for both subscriptions
  const [newslettersLoaded, setNewslettersLoaded] = useState(false);
  const [debriefsLoaded, setDebriefsLoaded] = useState(false);

  useEffect(() => {
    setNewslettersLoaded(false);
    setDebriefsLoaded(false);
    setError(null);

    const unsubNewsletters = subscribeToCompetitorNewsletters(
      filters,
      (data) => {
        setNewsletters(data);
        setNewslettersLoaded(true);
      },
      (err) => {
        setError(err);
        setNewslettersLoaded(true);
      },
    );

    const unsubDebriefs = subscribeToCompetitorDebriefs(
      (data) => {
        setDebriefs(data);
        setDebriefsLoaded(true);
      },
      (err) => {
        setError(err);
        setDebriefsLoaded(true);
      },
    );

    return () => {
      unsubNewsletters();
      unsubDebriefs();
    };
  }, [filters?.competitor, filters?.dateRange, filters?.topic]);

  useEffect(() => {
    if (newslettersLoaded && debriefsLoaded) {
      setLoading(false);
    }
  }, [newslettersLoaded, debriefsLoaded]);

  // Compute trending topics from newsletter data
  const trending = useMemo<TrendingTopic[]>(() => {
    const topicMap = new Map<string, { count: number; competitors: Set<string> }>();

    for (const nl of newsletters) {
      for (const topic of nl.topics) {
        const existing = topicMap.get(topic);
        if (existing) {
          existing.count += 1;
          existing.competitors.add(nl.competitor);
        } else {
          topicMap.set(topic, { count: 1, competitors: new Set([nl.competitor]) });
        }
      }
    }

    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        mentionCount: data.count,
        competitors: Array.from(data.competitors),
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount);
  }, [newsletters]);

  // Compute competitor scorecards
  const scorecards = useMemo<CompetitorScorecard[]>(() => {
    const competitorMap = new Map<
      string,
      {
        scores: number[];
        affiliateCounts: number[];
        adCounts: number[];
        topics: Map<string, number>;
        dates: Date[];
      }
    >();

    for (const nl of newsletters) {
      const existing = competitorMap.get(nl.competitor) ?? {
        scores: [],
        affiliateCounts: [],
        adCounts: [],
        topics: new Map<string, number>(),
        dates: [],
      };

      existing.scores.push(nl.aiScores.overall);
      existing.affiliateCounts.push(
        nl.links.filter((l) => l.type === 'affiliate').length,
      );
      existing.adCounts.push(nl.ads.length);
      existing.dates.push(nl.receivedAt);

      for (const topic of nl.topics) {
        existing.topics.set(topic, (existing.topics.get(topic) ?? 0) + 1);
      }

      competitorMap.set(nl.competitor, existing);
    }

    return Array.from(competitorMap.entries()).map(([competitor, data]) => {
      const avgScore =
        data.scores.length > 0
          ? Math.round(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10,
            ) / 10
          : 0;

      const avgAffiliates =
        data.affiliateCounts.length > 0
          ? Math.round(
              (data.affiliateCounts.reduce((a, b) => a + b, 0) /
                data.affiliateCounts.length) *
                10,
            ) / 10
          : 0;

      const adsPerEdition =
        data.adCounts.length > 0
          ? Math.round(
              (data.adCounts.reduce((a, b) => a + b, 0) / data.adCounts.length) * 10,
            ) / 10
          : 0;

      // Determine frequency from dates
      const sortedDates = [...data.dates].sort((a, b) => a.getTime() - b.getTime());
      let frequency = 'Unknown';
      if (sortedDates.length >= 2) {
        const avgGapMs =
          (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) /
          (sortedDates.length - 1);
        const avgGapDays = avgGapMs / (1000 * 60 * 60 * 24);
        if (avgGapDays <= 1.5) frequency = 'Daily';
        else if (avgGapDays <= 3.5) frequency = 'Every 2-3 days';
        else if (avgGapDays <= 8) frequency = 'Weekly';
        else frequency = 'Bi-weekly+';
      }

      // Top topic
      let topTopic = '';
      let topCount = 0;
      for (const [topic, count] of data.topics) {
        if (count > topCount) {
          topTopic = topic;
          topCount = count;
        }
      }

      // Trend: compare recent half vs older half scores
      const mid = Math.floor(data.scores.length / 2);
      const recentAvg =
        data.scores.length > 1
          ? data.scores.slice(mid).reduce((a, b) => a + b, 0) /
            (data.scores.length - mid)
          : avgScore;
      const olderAvg =
        mid > 0
          ? data.scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid
          : avgScore;
      const trend: 'up' | 'down' | 'stable' =
        recentAvg > olderAvg + 0.5
          ? 'up'
          : recentAvg < olderAvg - 0.5
            ? 'down'
            : 'stable';

      return {
        competitor,
        avgScore,
        frequency,
        avgAffiliates,
        adsPerEdition,
        topTopic,
        trend,
      };
    });
  }, [newsletters]);

  // Saved topics extracted from debriefs
  const savedTopics = useMemo<SavedTopic[]>(() => {
    // Saved topics would come from a separate collection or debrief data
    // For now, return empty — topics are managed via Cloud Functions
    return [];
  }, []);

  return {
    newsletters,
    debriefs,
    savedTopics,
    trending,
    scorecards,
    loading,
    error,
  };
}
