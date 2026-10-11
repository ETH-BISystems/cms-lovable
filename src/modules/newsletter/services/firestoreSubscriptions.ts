/**
 * MOCK Firestore subscription layer for the Newsletter module.
 *
 * Mirrors the production onSnapshot subscriptions against the in-memory
 * mockStore: each subscribe* function emits the current seed data once
 * (async, after a short delay) and re-emits whenever a mock mutation
 * touches the underlying collection. Exported names/signatures are
 * identical to production.
 *
 * Production collections:
 *   - newsletter-editions            (subscribeToEditions / subscribeToEditionDetail)
 *   - newsletter-editions/{id}/tasks (subscribeToEditionTasks)
 *   - subscriber-profiles            (subscribeToSubscribers)
 *   - competitor-newsletters         (subscribeToCompetitorNewsletters)
 *   - competitor-newsletters/debriefs/debriefs (subscribeToCompetitorDebriefs)
 *   - newsletters                    (subscribeToNewsletterConfig)
 */

import type {
  NewsletterEdition,
  EditionTask,
  SubscriberProfile,
  CompetitorNewsletter,
  CompetitorDebrief,
  NewsletterConfig,
  EditionFilters,
  CompetitorFilters,
} from '../types/index';
import {
  storeOn,
  getAllEditions,
  getEditionById,
  getTasks,
  getSubscribers,
  getCompetitorNewsletters,
  getDebriefs,
  getConfigs,
  subscriberGrowthSeries,
  type SubscriberGrowthPoint,
} from './mockStore';

// ─── Subscription primitive ──────────────────────────────────────────────────

/** Matches firebase/firestore's Unsubscribe signature. */
export type Unsubscribe = () => void;

const EMIT_DELAY_MS = 220;

/**
 * Emit the current value asynchronously (mimics the first onSnapshot
 * delivery), then forward every subsequent store emission. The returned
 * cleanup both unregisters the store listener and cancels the pending
 * initial emit.
 */
function subscribeWithInitial<T>(
  emitInitial: () => T,
  register: (l: (v: T) => void) => () => void,
  callback: (v: T) => void,
): Unsubscribe {
  let active = true;
  const unregister = register((v) => {
    if (active) callback(v);
  });
  const timer = setTimeout(() => {
    if (active) callback(emitInitial());
  }, EMIT_DELAY_MS);
  return () => {
    active = false;
    clearTimeout(timer);
    unregister();
  };
}

// ─── Filter helpers (mirror the production where() constraints) ──────────────

function applyEditionFilters(all: NewsletterEdition[], filters?: EditionFilters): NewsletterEdition[] {
  let out = all;
  if (filters?.status && filters.status !== 'All') {
    out = out.filter((e) => e.status === filters.status);
  }
  if (filters?.editionType && filters.editionType !== 'All') {
    out = out.filter((e) => e.editionType === filters.editionType);
  }
  return out;
}

function applyCompetitorFilters(
  all: CompetitorNewsletter[],
  filters?: CompetitorFilters,
): CompetitorNewsletter[] {
  let out = all;
  if (filters?.competitor && filters.competitor !== '') {
    out = out.filter((n) => n.competitor === filters.competitor);
  }
  return out;
}

// ─── Subscription Functions ──────────────────────────────────────────────────

/**
 * Subscribe to the newsletter-editions collection with optional status filter.
 * (production: onSnapshot(query(collection(db, 'newsletter-editions'), ...)))
 */
export function subscribeToEditions(
  filters: EditionFilters | undefined,
  callback: (editions: NewsletterEdition[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () => applyEditionFilters(getAllEditions(), filters);
  return subscribeWithInitial(current, (l) => storeOn.editions(() => l(current())), callback);
}

/**
 * Subscribe to a single edition document.
 * (production: onSnapshot(doc(db, 'newsletter-editions', editionId)))
 */
export function subscribeToEditionDetail(
  editionId: string,
  callback: (edition: NewsletterEdition | null) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () => getEditionById(editionId);
  return subscribeWithInitial(
    current,
    (l) => storeOn.editionDetail(editionId, l),
    callback,
  );
}

/**
 * Subscribe to the tasks subcollection for an edition.
 * (production: onSnapshot(collection(db, 'newsletter-editions', editionId, 'tasks')))
 */
export function subscribeToEditionTasks(
  editionId: string,
  callback: (tasks: EditionTask[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () => getTasks(editionId);
  return subscribeWithInitial(
    current,
    (l) => storeOn.tasks(editionId, l),
    callback,
  );
}

/**
 * Subscribe to the subscriber-profiles collection.
 * (production: onSnapshot(query(collection(db, 'subscriber-profiles'), orderBy('joinedAt', 'desc'))))
 */
export function subscribeToSubscribers(
  callback: (subscribers: SubscriberProfile[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () =>
    [...getSubscribers()].sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
  return subscribeWithInitial(current, (l) => storeOn.subscribers(() => l(current())), callback);
}

/**
 * Subscribe to the competitor-newsletters collection with optional filters.
 * (production: onSnapshot(query(collection(db, 'competitor-newsletters'), ...)))
 */
export function subscribeToCompetitorNewsletters(
  filters: CompetitorFilters | undefined,
  callback: (newsletters: CompetitorNewsletter[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () =>
    applyCompetitorFilters(
      [...getCompetitorNewsletters()].sort(
        (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime(),
      ),
      filters,
    );
  return subscribeWithInitial(current, (l) => storeOn.competitors(() => l(current())), callback);
}

/**
 * Subscribe to the competitor-newsletters debriefs subcollection.
 * (production: onSnapshot(collection(db, 'competitor-newsletters', 'debriefs', 'debriefs')))
 */
export function subscribeToCompetitorDebriefs(
  callback: (debriefs: CompetitorDebrief[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () =>
    [...getDebriefs()].sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  return subscribeWithInitial(current, (l) => storeOn.debriefs(() => l(current())), callback);
}

/**
 * Subscribe to the newsletters config collection.
 * (production: onSnapshot(query(collection(db, 'newsletters'))))
 */
export function subscribeToNewsletterConfig(
  callback: (config: NewsletterConfig[]) => void,
  _onError?: (error: Error) => void,
): Unsubscribe {
  const current = () => getConfigs();
  return subscribeWithInitial(current, (l) => storeOn.config(() => l(current())), callback);
}

// ─── MOCK-ONLY additive export ───────────────────────────────────────────────
// 90-day subscriber-count series (growth to ~24,300) for the Subscribers
// growth chart. Not part of the production surface — production derives
// counts from subscriber-profiles; the mock precomputes the series so the
// chart has believable history without thousands of seed profiles.

export type { SubscriberGrowthPoint };

export function getSubscriberGrowthSeries(): SubscriberGrowthPoint[] {
  return subscriberGrowthSeries;
}
