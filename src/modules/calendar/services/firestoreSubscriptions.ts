/**
 * MOCK calendar subscriptions — mirrors the production
 * services/firestoreSubscriptions.ts API with in-memory seed data.
 *
 * Production:
 *   - subscribeCalendarEvents → onSnapshot(query(collection(db, 'calendar-events'), orderBy('date', 'asc')))
 *   - subscribeKpiTargets     → onSnapshot(doc(db, 'settings', 'kpiTargets'))
 * Both are served here from mockCalendarStore / constants and re-emitted
 * after every mutation, matching the real onSnapshot behaviour.
 */

import { delay } from '@/services/_delay';
import type { CalendarEvent, CalendarKpiTargets } from '../types';
import { addEventListener, getEvents } from './mockCalendarStore';

type Unsubscribe = () => void;

export const DEFAULT_KPI_TARGETS: CalendarKpiTargets = {
  weeklyTarget: 5,
  monthlyTarget: 20,
};

/**
 * Subscribe to calendar events (production: Firestore `calendar-events`
 * collection, orderBy('date', 'asc')). Emits the seed set once after a
 * simulated round-trip, then again after every mock mutation.
 */
export function subscribeCalendarEvents(
  callback: (events: CalendarEvent[]) => void,
  _onError?: (error: Error) => void
): Unsubscribe {
  let active = true;
  const removeListener = addEventListener((events) => {
    if (active) callback(events);
  });

  // Simulated initial fetch latency (production: first onSnapshot emission).
  delay(300).then(() => {
    if (active) callback(getEvents());
  });

  return () => {
    active = false;
    removeListener();
  };
}

/**
 * Subscribe to the KPI targets the Settings module writes at
 * `settings/kpiTargets` (publishing.weeklyArticleTarget / monthlyArticleTarget).
 * The mock always serves the defaults — the Settings module has no writable
 * KPI UI in this mock.
 */
export function subscribeKpiTargets(
  callback: (targets: CalendarKpiTargets) => void,
  _onError?: (error: Error) => void
): Unsubscribe {
  let active = true;
  delay(150).then(() => {
    if (active) callback(DEFAULT_KPI_TARGETS);
  });
  return () => {
    active = false;
  };
}
