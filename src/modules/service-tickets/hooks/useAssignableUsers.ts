import { useEffect, useState } from 'react';
import { subscribeToAssignableUsers } from '../services/serviceTicketService';
import type { AssignableUser } from '../types';

/** Active CMS users for the assignee picker, sorted by display name. */
export function useAssignableUsers() {
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAssignableUsers(
      (next) => {
        setUsers(next);
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

  return { users, loading, error };
}
