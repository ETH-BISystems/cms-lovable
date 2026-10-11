import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { CalendarEvent } from '../types';

export interface AwaitingExperienceItem {
  id: string;
  title: string;
  assignee: { name: string; avatar: string };
  daysWaiting: number;
  pipelineArticleId: string | null;
}

/**
 * Filters calendar events where awaitingExperience === true
 * and computes days waiting for each item.
 */
export function useAwaitingExperience(events: CalendarEvent[]) {
  const awaitingExperienceArticles = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.awaitingExperience)
      .map((e) => ({
        id: e.id,
        title: e.title,
        assignee: e.assignee,
        daysWaiting: differenceInDays(now, e.createdAt),
        pipelineArticleId: e.pipelineArticleId,
      }));
  }, [events]);

  return { awaitingExperienceArticles };
}
