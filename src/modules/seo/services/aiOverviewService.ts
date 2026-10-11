/**
 * MOCK AI overview service — replaces the Firestore subscription on the
 * `seo-ai-overviews` collection with the in-memory store in ./_mockData.
 */

import type { AIOverviewDoc } from '../types';
import { emitters } from './_mockData';

/**
 * Subscribe to AI overview data for a given site.
 * Production: onSnapshot(query(collection(db, 'seo-ai-overviews'),
 *   where('siteId', '==', siteId))).
 */
export function subscribeAIOverviews(
  siteId: string,
  callback: (data: AIOverviewDoc[]) => void
): () => void {
  return emitters.aiOverviews.subscribe(siteId, callback);
}
