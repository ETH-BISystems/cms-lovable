import type { CreateArticleInput } from '@/modules/pipeline';
import type { RSSArticle, TrendingTopic } from '../types';

/**
 * Guard for the per-item "Research" action: only items still in the feed
 * (status 'new') may start the research flow. Items already researching /
 * in the pipeline / dismissed can't be double-added.
 */
export function canResearchArticle(article: Pick<RSSArticle, 'status'>): boolean {
  return article.status === 'new';
}

/**
 * Maps an RSS Monitor item to Start New Article modal prefill data
 * (spec CMS-14): title, source URL as competitor material, entryPoint 'RSS',
 * first topic → topic cluster, AI rationale → editorial notes.
 */
export function buildResearchPrefill(
  article: Pick<RSSArticle, 'title' | 'url' | 'topics' | 'aiRationale'>,
): Partial<CreateArticleInput> {
  const prefill: Partial<CreateArticleInput> = {
    title: article.title,
    entryPoint: 'RSS',
    sourceUrls: [{ url: article.url, type: 'Competitor Article' }],
  };

  const topicCluster = article.topics?.[0];
  if (topicCluster) prefill.topicCluster = topicCluster;

  const rationale = article.aiRationale?.trim();
  if (rationale) prefill.editorialNotes = `From RSS Monitor: ${rationale}`;

  return prefill;
}

/** "AB" style initials for the bulk-research assignee avatar. */
export function assigneeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'UN';
  return parts.map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * CMS-112 "Research This Topic": one pipeline article for the whole story
 * cluster — every still-researchable cluster article becomes a competitor
 * source and is marked researching against the new article (rssItemIds).
 */
export function buildTopicResearchInput(
  topic: TrendingTopic,
  clusterArticles: RSSArticle[],
  displayName: string,
): CreateArticleInput {
  return {
    title: topic.topic,
    targetKeyword: topic.topic,
    assignee: { name: displayName, avatar: assigneeInitials(displayName) },
    priority: 'Medium',
    entryPoint: 'RSS',
    source: { type: 'RSS Feed', label: `${clusterArticles.length} sources` },
    sourceUrls: clusterArticles.map((a) => ({ url: a.url, type: 'Competitor Article' })),
    editorialNotes:
      `Trending topic from RSS Monitor — covered by ${clusterArticles.length} source(s):\n` +
      clusterArticles.map((a) => `- ${a.source}: ${a.title}`).join('\n'),
    rssItemIds: clusterArticles.map((a) => a.id),
  };
}

