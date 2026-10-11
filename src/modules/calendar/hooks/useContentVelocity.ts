import { useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  format,
  differenceInDays,
} from 'date-fns';
import type { CalendarEvent, VelocityMetrics, DailyVelocity } from '../types';

/**
 * Computes content velocity metrics for the current week.
 * Counts published articles per day and determines if the team is on pace.
 */
export function useContentVelocity(
  events: CalendarEvent[],
  weeklyTarget: number = 5
): VelocityMetrics {
  return useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const publishedEvents = events.filter(
      (e) =>
        e.status === 'Published' &&
        e.date >= weekStart &&
        e.date <= weekEnd
    );

    const dailyCounts: DailyVelocity[] = daysInWeek.map((day) => ({
      day: format(day, 'EEE'),
      date: day,
      count: publishedEvents.filter((e) => isSameDay(e.date, day)).length,
    }));

    const weeklyTotal = dailyCounts.reduce((sum, d) => sum + d.count, 0);
    const dailyTarget = weeklyTarget / 7;
    const daysElapsed = Math.max(1, differenceInDays(now, weekStart) + 1);
    const expectedByNow = (weeklyTarget * daysElapsed) / 7;
    const onPace = weeklyTotal >= expectedByNow;
    const deficit = Math.max(0, Math.ceil(expectedByNow) - weeklyTotal);

    return {
      dailyCounts,
      weeklyTotal,
      weeklyTarget,
      dailyTarget,
      onPace,
      deficit,
    };
  }, [events, weeklyTarget]);
}
