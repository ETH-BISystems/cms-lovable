import { useState, useEffect } from 'react';
import { subscribeKpiTargets, DEFAULT_KPI_TARGETS } from '../services/firestoreSubscriptions';
import type { CalendarKpiTargets } from '../types';

/**
 * Live KPI publishing targets from the Settings module (settings/kpiTargets).
 * Falls back to defaults when the doc is missing or unreadable for the
 * caller's role.
 */
export function useKpiTargets(): CalendarKpiTargets {
  const [targets, setTargets] = useState<CalendarKpiTargets>(DEFAULT_KPI_TARGETS);

  useEffect(() => {
    return subscribeKpiTargets(setTargets);
  }, []);

  return targets;
}
