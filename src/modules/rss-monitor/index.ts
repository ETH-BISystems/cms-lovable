export { RSSPage } from './components/RSSPage';

export type {
  RSSFeed,
  RSSArticle,
  TrendingTopic,
  FeedStatus,
  ArticleStatus,
  ContentType,
  AddFeedInput,
  UpdateFeedInput,
  DismissArticleInput,
  BulkDismissInput,
  TestFeedResult,
  PollFeedResult,
  EnrichKeywordsResult,
} from './types';

/** Route metadata for shell integration */
export const rssMonitorRoute = {
  path: '/rss',
  title: 'RSS Feed Monitor',
} as const;
