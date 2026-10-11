import { useState, useEffect, useMemo } from 'react';
import { Timestamp } from '@/services/timestamp';
import type { RSSArticle, ArticleStatus } from '../types';
import type { ArticleFilters } from './useArticleFilters';
import { subscribeToArticles } from '../services/rssService';

export type ArticleTab = 'feed' | 'researching' | 'dismissed';

/** Map tab name to the Firestore status values it displays */
export function statusesForTab(tab: ArticleTab): ArticleStatus[] {
  switch (tab) {
    case 'feed':
      return ['new'];
    case 'researching':
      return ['researching', 'in-pipeline'];
    case 'dismissed':
      return ['dismissed'];
  }
}

/** Case-insensitive keyword match against title, excerpt, source, and topics. */
export function articleMatchesSearch(article: RSSArticle, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    article.title.toLowerCase().includes(q) ||
    article.excerpt.toLowerCase().includes(q) ||
    article.source.toLowerCase().includes(q) ||
    article.topics.some((t) => t.toLowerCase().includes(q))
  );
}

export function useArticles(tab: ArticleTab, filters: ArticleFilters) {
  const [articles, setArticles] = useState<RSSArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const statuses = statusesForTab(tab);

  // production: Firestore query (server-side filtering) over 'rss-articles' —
  // where('status', 'in', statuses), orderBy('createdAt', 'desc'), plus
  // optional where('feedId', '==', ...) and where('publishedAt', '>=', ...).
  useEffect(() => {
    let publishedAfter: Timestamp | null = null;

    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let start: Date;
      switch (filters.dateRange) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(0);
      }
      publishedAfter = Timestamp.fromDate(start);
    }

    const unsubscribe = subscribeToArticles(
      { statuses, feedId: filters.source, publishedAfter },
      (data) => {
        const normalized = data.map((raw) => ({
          ...raw,
          // Older documents may predate these fields — components map over them
          topics: Array.isArray(raw.topics) ? raw.topics : [],
          contentType: raw.contentType ?? 'News',
        }));
        setArticles(normalized);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.source, filters.dateRange]);

  // Client-side refinement for filters that would require excessive composite indexes
  const filtered = useMemo(() => {
    let result = articles;

    // Keyword search: title, excerpt, source, or topics
    if (filters.search) {
      result = result.filter((a) => articleMatchesSearch(a, filters.search!));
    }

    // Topics: article must contain ALL selected topics
    if (filters.topics && filters.topics.length > 0) {
      result = result.filter((a) =>
        filters.topics!.every((t) => a.topics.includes(t)),
      );
    }

    // AI score range
    if (filters.aiScore) {
      result = result.filter((a) => {
        switch (filters.aiScore) {
          case 'high':
            return a.aiScore >= 70;
          case 'medium':
            return a.aiScore >= 40 && a.aiScore < 70;
          case 'low':
            return a.aiScore < 40;
          default:
            return true;
        }
      });
    }

    // Content type
    if (filters.contentType) {
      result = result.filter((a) => a.contentType === filters.contentType);
    }

    // Dismissed by (Dismissed tab)
    if (filters.dismissedBy) {
      result = result.filter((a) => a.dismissedBy === filters.dismissedBy);
    }

    // Researched by (Researching tab)
    if (filters.researchedBy) {
      result = result.filter((a) => a.researchedBy === filters.researchedBy);
    }

    // Status sub-filter (Researching tab: researching vs in-pipeline)
    if (filters.status) {
      result = result.filter((a) => a.status === filters.status);
    }

    return result;
  }, [articles, filters.search, filters.topics, filters.aiScore, filters.contentType, filters.dismissedBy, filters.researchedBy, filters.status]);

  return { articles: filtered, loading, error };
}
