import { useState, useMemo, useCallback } from 'react';
import { differenceInDays, format } from 'date-fns';
import type { CalendarEvent, TopicCollision } from '../types';

/**
 * Pure collision detection function.
 * Detects topic_overlap when two events share the same non-null topicCluster
 * and their dates are within 2 days of each other.
 */
export function detectCollisions(events: CalendarEvent[]): TopicCollision[] {
  const collisions: TopicCollision[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      if (!a.topicCluster || !b.topicCluster) continue;
      if (a.topicCluster !== b.topicCluster) continue;

      const dayDiff = Math.abs(differenceInDays(a.date, b.date));
      if (dayDiff > 2) continue;

      const key = [a.id, b.id].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);

      collisions.push({
        id: key,
        type: 'topic_overlap',
        message: `"${a.title}" and "${b.title}" share the "${a.topicCluster}" cluster and are only ${dayDiff} day${dayDiff !== 1 ? 's' : ''} apart (${format(a.date, 'MMM d')} vs ${format(b.date, 'MMM d')})`,
        articles: [
          { id: a.id, title: a.title, date: a.date },
          { id: b.id, title: b.title, date: b.date },
        ],
      });
    }
  }

  return collisions;
}

export function useTopicCollisions(events: CalendarEvent[]) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const allCollisions = useMemo(() => detectCollisions(events), [events]);

  const collisions = useMemo(
    () => allCollisions.filter((c) => !dismissedIds.has(c.id)),
    [allCollisions, dismissedIds]
  );

  const dismissCollision = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds(new Set(allCollisions.map((c) => c.id)));
  }, [allCollisions]);

  return { collisions, dismissCollision, dismissAll };
}
