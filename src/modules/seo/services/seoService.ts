/**
 * MOCK SEO service (aggregator) — mirrors the production module's combined
 * surface: the eleven `seo*` callable Cloud Functions plus Firestore
 * subscriptions on seo-site-health (and subcollections),
 * seo-position-tracking, seo-page-audits, seo-audit-runs, seo-audit-config
 * and seo-ai-overviews. Callables are implemented in ./seoCallables against
 * the in-memory store in ./_mockData; subscriptions emit from that store.
 */

import type {
  SiteHealthDoc, TechnicalIssueDoc, SchemaDoc, IndexingDoc,
  BacklinkDoc, RedirectDoc, PositionTrackingDoc, PageAuditDoc,
  AuditRunDoc, AuditConfigDoc, AIOverviewDoc,
} from '../types';
import { emitters } from './_mockData';

// ─── Cloud Function Callables ───────────────────────────────────────────────
// Re-exported from ./seoCallables (mock implementations; production callable
// names are documented there).

export {
  callRunSiteHealthCrawl,
  callTrackPositions,
  callAuditPage,
  callRunSiteAudit,
  callTrackAIOverviews,
  callSubmitForIndexing,
  callCreateRedirect,
  callUpdateRedirect,
  callDeleteRedirect,
  callTestRedirect,
  callUpdateAuditSchedule,
} from './seoCallables';

// ─── Firestore Subscriptions ────────────────────────────────────────────────

type Unsubscribe = () => void;

/** production: onSnapshot(doc(db, 'seo-site-health', siteId)) */
export function subscribeSiteHealth(siteId: string, callback: (data: SiteHealthDoc | null) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.siteHealth.subscribe(siteId, callback);
}

/** production: onSnapshot(collection(db, 'seo-site-health', siteId, 'issues')) */
export function subscribeIssues(siteId: string, callback: (docs: TechnicalIssueDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.issues.subscribe(siteId, callback);
}

/** production: onSnapshot(collection(db, 'seo-site-health', siteId, 'schemas')) */
export function subscribeSchemas(siteId: string, callback: (docs: SchemaDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.schemas.subscribe(siteId, callback);
}

/** production: onSnapshot(collection(db, 'seo-site-health', siteId, 'indexing')) */
export function subscribeIndexing(siteId: string, callback: (docs: IndexingDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.indexing.subscribe(siteId, callback);
}

/** production: onSnapshot(query(collection(db, 'seo-site-health', siteId, 'backlinks'), orderBy('date', 'desc'))) */
export function subscribeBacklinks(siteId: string, callback: (docs: BacklinkDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.backlinks.subscribe(siteId, callback);
}

/** production: onSnapshot(collection(db, 'seo-site-health', siteId, 'redirects')) */
export function subscribeRedirects(siteId: string, callback: (docs: RedirectDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.redirects.subscribe(siteId, callback);
}

/** production: onSnapshot(query(collection(db, 'seo-position-tracking'), where('siteId', '==', siteId), orderBy('volume', 'desc'))) */
export function subscribePositionTracking(siteId: string, callback: (docs: PositionTrackingDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.positionTracking.subscribe(siteId, callback);
}

/** production: onSnapshot(query(collection(db, 'seo-page-audits'), where('siteId', '==', siteId), orderBy('seoScore', 'asc'))) */
export function subscribePageAudits(siteId: string, callback: (docs: PageAuditDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.pageAudits.subscribe(siteId, callback);
}

/** production: onSnapshot(query(collection(db, 'seo-audit-runs'), where('siteId', '==', siteId), orderBy('createdAt', 'desc'))) */
export function subscribeAuditRuns(siteId: string, callback: (docs: AuditRunDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.auditRuns.subscribe(siteId, callback);
}

/** production: onSnapshot(doc(db, 'seo-audit-config', siteId)) */
export function subscribeAuditConfig(siteId: string, callback: (data: AuditConfigDoc | null) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.auditConfig.subscribe(siteId, callback);
}

/** production: onSnapshot(query(collection(db, 'seo-ai-overviews'), where('siteId', '==', siteId), orderBy('volume', 'desc'))) */
export function subscribeAIOverviews(siteId: string, callback: (docs: AIOverviewDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  void onError;
  return emitters.aiOverviews.subscribe(siteId, callback);
}
