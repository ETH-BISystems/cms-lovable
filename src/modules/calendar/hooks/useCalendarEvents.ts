import { useState, useEffect, useCallback } from 'react';
import { subscribeCalendarEvents } from '../services/firestoreSubscriptions';
import type { CalendarEvent } from '../types';

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const subscribe = useCallback(() => {
    setLoading(true);
    return subscribeCalendarEvents(
      (data) => {
        setEvents(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [subscribe]);

  return { events, loading, error, refetch: subscribe };
}
