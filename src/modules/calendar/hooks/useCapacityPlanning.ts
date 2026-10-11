import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import type { CalendarEvent, CapacityMetrics } from '../types';

interface CapacityTargets {
  weeklyTarget: number;
  monthlyTarget: number;
}

/**
 * Computes capacity planning metrics from calendar events and KPI targets.
 * Counts article-type events scheduled within the current week and month.
 */
export function useCapacityPlanning(
  events: CalendarEvent[],
  targets: CapacityTargets = { weeklyTarget: 5, monthlyTarget: 20 }
): CapacityMetrics {
  return useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const articleEvents = events.filter((e) => e.type === 'article');

    const weeklyScheduled = articleEvents.filter((e) =>
      isWithinInterval(e.date, { start: weekStart, end: weekEnd })
    ).length;

    const monthlyScheduled = articleEvents.filter((e) =>
      isWithinInterval(e.date, { start: monthStart, end: monthEnd })
    ).length;

    const weeklyPercentage =
      targets.weeklyTarget > 0
        ? Math.round((weeklyScheduled / targets.weeklyTarget) * 100)
        : 0;

    const monthlyPercentage =
      targets.monthlyTarget > 0
        ? Math.round((monthlyScheduled / targets.monthlyTarget) * 100)
        : 0;

    return {
      weeklyTarget: targets.weeklyTarget,
      monthlyTarget: targets.monthlyTarget,
      weeklyScheduled,
      monthlyScheduled,
      weeklyPercentage,
      monthlyPercentage,
    };
  }, [events, targets]);
}
