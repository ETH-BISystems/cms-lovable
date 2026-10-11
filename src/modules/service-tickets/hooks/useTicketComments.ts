import { useEffect, useState } from 'react';
import { subscribeToTicketComments } from '../services/serviceTicketService';
import type { TicketComment } from '../types';

export function useTicketComments(ticketId: string | null) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToTicketComments(
      ticketId,
      (next) => {
        setComments(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [ticketId]);

  return { comments, loading, error };
}
