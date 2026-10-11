import { Flame, Newspaper, BarChart3 } from 'lucide-react';
import type { RSSArticle } from '../types';

/* ── Pure helper functions (exported for property-based testing) ── */

/** Count articles created in the last 24 hours whose status is not `dismissed`. */
export function countArticlesLast24h(
  articles: RSSArticle[],
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  return articles.filter(
    (a) => a.status !== 'dismissed' && a.createdAt.toDate().getTime() >= cutoff,
  ).length;
}

/** Per-source breakdown of articles created in the last 24 hours (status ≠ dismissed). */
export function getSourceBreakdown(
  articles: RSSArticle[],
  now: Date = new Date(),
): Record<string, number> {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const counts: Record<string, number> = {};
  for (const a of articles) {
    if (a.status !== 'dismissed' && a.createdAt.toDate().getTime() >= cutoff) {
      counts[a.source] = (counts[a.source] ?? 0) + 1;
    }
  }
  return counts;
}

/* ── Component ── */

export interface StatsBarProps {
  articles: RSSArticle[];
  trendingTopicCount: number;
}

export function StatsBar({ articles, trendingTopicCount }: StatsBarProps) {
  const now = new Date();
  const last24hCount = countArticlesLast24h(articles, now);
  const breakdown = getSourceBreakdown(articles, now);
  const sources = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-3 text-sm">
      {/* New articles count */}
      <div className="flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{last24hCount}</span>
        <span className="text-muted-foreground">new in 24h</span>
      </div>

      {/* Per-source breakdown */}
      {sources.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              {sources.map(([source, count]) => (
                <span key={source} className="text-xs">
                  <span className="font-medium">{source}</span>{' '}
                  <span className="text-muted-foreground">({count})</span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Trending topics indicator */}
      {trendingTopicCount > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-orange-600">
            <Flame className="h-4 w-4" />
            <span className="font-medium">{trendingTopicCount}</span>
            <span className="text-xs">trending</span>
          </div>
        </>
      )}
    </div>
  );
}
