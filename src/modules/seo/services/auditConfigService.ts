/**
 * MOCK audit config service — replaces the Firestore subscription on
 * `seo-audit-config/{siteId}` with the in-memory store in ./_mockData.
 */

import type { AuditConfigDoc } from '../types';
import { emitters } from './_mockData';

/**
 * Subscribe to the audit configuration document for a given site.
 * Production: onSnapshot(doc(db, 'seo-audit-config', siteId)).
 */
export function subscribeAuditConfig(
  siteId: string,
  callback: (data: AuditConfigDoc | null) => void
): () => void {
  return emitters.auditConfig.subscribe(siteId, callback);
}
