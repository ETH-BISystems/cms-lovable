/**
 * MOCK site health service — replaces Firestore subscriptions on
 * `seo-site-health/{siteId}` and its subcollections (schemas, indexing,
 * issues, backlinks, redirects) with the in-memory store in ./_mockData.
 */

import type {
  SiteHealthDoc,
  SchemaDoc,
  IndexingDoc,
  TechnicalIssueDoc,
  BacklinkDoc,
  RedirectDoc,
} from '../types';
import { emitters } from './_mockData';

/**
 * Subscribe to the site health document for a given site.
 * Production: onSnapshot(doc(db, 'seo-site-health', siteId)).
 */
export function subscribeSiteHealth(
  siteId: string,
  callback: (data: SiteHealthDoc | null) => void
): () => void {
  return emitters.siteHealth.subscribe(siteId, callback);
}

/**
 * Subscribe to the schemas subcollection for a given site.
 * Production: onSnapshot(collection(db, 'seo-site-health', siteId, 'schemas')).
 */
export function subscribeSchemas(
  siteId: string,
  callback: (data: SchemaDoc[]) => void
): () => void {
  return emitters.schemas.subscribe(siteId, callback);
}

/**
 * Subscribe to the indexing subcollection for a given site.
 * Production: onSnapshot(collection(db, 'seo-site-health', siteId, 'indexing')).
 */
export function subscribeIndexing(
  siteId: string,
  callback: (data: IndexingDoc[]) => void
): () => void {
  return emitters.indexing.subscribe(siteId, callback);
}

/**
 * Subscribe to the issues subcollection for a given site.
 * Production: onSnapshot(collection(db, 'seo-site-health', siteId, 'issues')).
 */
export function subscribeIssues(
  siteId: string,
  callback: (data: TechnicalIssueDoc[]) => void
): () => void {
  return emitters.issues.subscribe(siteId, callback);
}

/**
 * Subscribe to the backlinks subcollection for a given site.
 * Production: onSnapshot(collection(db, 'seo-site-health', siteId, 'backlinks')).
 */
export function subscribeBacklinks(
  siteId: string,
  callback: (data: BacklinkDoc[]) => void
): () => void {
  return emitters.backlinks.subscribe(siteId, callback);
}

/**
 * Subscribe to the redirects subcollection for a given site.
 * Production: onSnapshot(collection(db, 'seo-site-health', siteId, 'redirects')).
 */
export function subscribeRedirects(
  siteId: string,
  callback: (data: RedirectDoc[]) => void
): () => void {
  return emitters.redirects.subscribe(siteId, callback);
}
