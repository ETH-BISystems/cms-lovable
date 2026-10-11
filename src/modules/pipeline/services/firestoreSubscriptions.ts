// MOCK — replaces the production Firestore onSnapshot subscriptions
// (articles, refresh-queue, article-tasks, article-versions collections) with
// the module-level in-memory store in ./articleStore. Exported names and
// signatures are identical to production; every callback fires immediately
// with the current snapshot and again after any store mutation.

import type { PipelineArticle, RefreshQueueItem, ArticleTask, ArticleVersion } from '../types';
import {
  subscribeToStore,
  getArticlesSnapshot,
  getRefreshQueueSnapshot,
  getTasksSnapshot,
  getVersionsSnapshot,
} from './articleStore';

export type Unsubscribe = () => void;

// Re-exported for other mock services (e.g. ai-final-processing's queue-count
// rewiring) that need a one-shot read or their own live feed of the store.
export { getArticlesSnapshot };

export function subscribeToArticles(
  callback: (articles: PipelineArticle[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  void onError;
  const deliver = () => callback(getArticlesSnapshot());
  // Defer the first emission a tick so hooks render their loading state first,
  // matching onSnapshot's async first snapshot.
  const t = setTimeout(deliver, 50);
  const unsub = subscribeToStore(deliver);
  return () => {
    clearTimeout(t);
    unsub();
  };
}

export function subscribeToRefreshQueue(
  callback: (items: RefreshQueueItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  void onError;
  const deliver = () => callback(getRefreshQueueSnapshot());
  const t = setTimeout(deliver, 50);
  const unsub = subscribeToStore(deliver);
  return () => {
    clearTimeout(t);
    unsub();
  };
}

export function subscribeToArticleTasks(
  articleId: string,
  callback: (tasks: ArticleTask[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  void onError;
  const deliver = () => callback(getTasksSnapshot(articleId));
  const t = setTimeout(deliver, 50);
  const unsub = subscribeToStore(deliver);
  return () => {
    clearTimeout(t);
    unsub();
  };
}

export function subscribeToArticleVersions(
  articleId: string,
  callback: (versions: ArticleVersion[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  void onError;
  const deliver = () => callback(getVersionsSnapshot(articleId));
  const t = setTimeout(deliver, 50);
  const unsub = subscribeToStore(deliver);
  return () => {
    clearTimeout(t);
    unsub();
  };
}
