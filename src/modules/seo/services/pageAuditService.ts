/**
 * MOCK page audit service — replaces Firestore reads on the
 * `seo-page-audits` and `seo-audit-runs` collections (plus the runs'
 * pages/issues subcollections) with the in-memory store in ./_mockData.
 */

import { delay } from '@/services/_delay';
import type {
  PageAuditDoc,
  AuditRunDoc,
  AuditRunPageDoc,
  AuditRunIssueDoc,
} from '../types';
import { emitters, store } from './_mockData';

/**
 * Subscribe to page audit data for a given site.
 * Production: onSnapshot(query(collection(db, 'seo-page-audits'),
 *   where('siteId', '==', siteId))).
 */
export function subscribePageAudits(
  siteId: string,
  callback: (data: PageAuditDoc[]) => void
): () => void {
  return emitters.pageAudits.subscribe(siteId, callback);
}

/**
 * Subscribe to audit runs for a given site, ordered by createdAt descending.
 * Production: onSnapshot(query(collection(db, 'seo-audit-runs'),
 *   where('siteId', '==', siteId), orderBy('createdAt', 'desc'))).
 */
export function subscribeAuditRuns(
  siteId: string,
  callback: (data: AuditRunDoc[]) => void
): () => void {
  return emitters.auditRuns.subscribe(siteId, callback);
}

/**
 * Fetch all pages for a specific audit run.
 * Production: getDocs(collection(db, 'seo-audit-runs', runId, 'pages')).
 */
export async function getAuditRunPages(
  runId: string
): Promise<AuditRunPageDoc[]> {
  await delay(250);
  return store.getAuditRunPages(runId);
}

/**
 * Fetch all issues for a specific audit run.
 * Production: getDocs(collection(db, 'seo-audit-runs', runId, 'issues')).
 */
export async function getAuditRunIssues(
  runId: string
): Promise<AuditRunIssueDoc[]> {
  await delay(250);
  return store.getAuditRunIssues(runId);
}
