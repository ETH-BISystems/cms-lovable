/**
 * MOCK position tracking service — replaces Firestore reads on the
 * `seo-position-tracking` collection with the in-memory store in ./_mockData.
 */

import { delay } from '@/services/_delay';
import type { PositionTrackingDoc } from '../types';
import { emitters, store } from './_mockData';

/**
 * Subscribe to position tracking data for a given site.
 * Production: onSnapshot(query(collection(db, 'seo-position-tracking'),
 *   where('siteId', '==', siteId))).
 */
export function subscribePositionTracking(
  siteId: string,
  callback: (data: PositionTrackingDoc[]) => void
): () => void {
  return emitters.positionTracking.subscribe(siteId, callback);
}

/**
 * Fetch a single keyword position tracking document by ID.
 * Production: getDoc(doc(db, 'seo-position-tracking', keywordId)).
 */
export async function getKeywordById(
  keywordId: string
): Promise<PositionTrackingDoc | null> {
  await delay(200);
  return store.getKeywordById(keywordId);
}
