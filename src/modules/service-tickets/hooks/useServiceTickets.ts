import { useEffect, useState } from 'react';
import { subscribeToServiceTickets } from '../services/serviceTicketService';
import type { ServiceTicket } from '../types';

export function useServiceTickets() {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToServiceTickets(
      (next) => {
        setTickets(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { tickets, loading, error };
}
