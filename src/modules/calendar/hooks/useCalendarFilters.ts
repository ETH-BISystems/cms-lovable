import { useState, useCallback } from 'react';
import type { CalendarEvent, CalendarFilters } from '../types';
import { UNCATEGORISED_CLUSTER } from '../types';

const DEFAULT_FILTERS: CalendarFilters = {
  type: 'all',
  cluster: 'All Clusters',
};

/**
 * Pure function that filters calendar events by type and cluster.
 * The 'Uncategorised' cluster matches events without a topic cluster, so no
 * event can ever disappear from every cluster filter.
 */
export function applyFilters(
  events: CalendarEvent[],
  filters: CalendarFilters
): CalendarEvent[] {
  return events.filter((event) => {
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.cluster === UNCATEGORISED_CLUSTER) {
      if (event.topicCluster) return false;
    } else if (
      filters.cluster !== 'All Clusters' &&
      event.topicCluster !== filters.cluster
    ) {
      return false;
    }
    return true;
  });
}

export function useCalendarFilters() {
  const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_FILTERS);

  const updateFilters = useCallback((update: Partial<CalendarFilters>) => {
    setFilters((prev) => ({ ...prev, ...update }));
  }, []);

  const filteredEvents = useCallback(
    (events: CalendarEvent[]) => applyFilters(events, filters),
    [filters]
  );

  return { filters, setFilters: updateFilters, applyFilters: filteredEvents };
}
