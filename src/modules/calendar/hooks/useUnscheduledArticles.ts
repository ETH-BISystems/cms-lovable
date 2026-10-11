import { useMemo } from 'react';
import type { CalendarEvent } from '../types';

export interface UnscheduledArticle {
  id: string;
  title: string;
  assignee: { name: string; avatar: string };
  priority: 'High' | 'Medium' | 'Low';
  approvedDate: Date | null;
}

/**
 * Derives unscheduled approved articles.
 * An article is "unscheduled" if it has status 'Approved' and no corresponding
 * calendar event with a scheduled date.
 *
 * Since we don't have direct pipeline context access from the calendar module,
 * this hook accepts pipeline articles and calendar events as parameters.
 */
export function useUnscheduledArticles(
  pipelineArticles: Array<{
    id: string;
    title: string;
    status: string;
    assignee: { name: string; avatar: string };
    priority: string;
    updatedAt: Date;
  }>,
  calendarEvents: CalendarEvent[]
) {
  const unscheduledArticles = useMemo(() => {
    const scheduledArticleIds = new Set(
      calendarEvents
        .filter((e) => e.pipelineArticleId && e.date)
        .map((e) => e.pipelineArticleId)
    );

    return pipelineArticles
      .filter((a) => a.status === 'Approved' && !scheduledArticleIds.has(a.id))
      .map((a) => ({
        id: a.id,
        title: a.title,
        assignee: a.assignee,
        priority: a.priority as 'High' | 'Medium' | 'Low',
        approvedDate: a.updatedAt ?? null,
      }));
  }, [pipelineArticles, calendarEvents]);

  return { unscheduledArticles };
}
