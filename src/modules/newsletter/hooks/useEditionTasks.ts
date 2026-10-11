import { useState, useEffect, useMemo } from 'react';
import { subscribeToEditionTasks } from '../services/firestoreSubscriptions';
import type { EditionTask } from '../types/index';

/**
 * Subscribe to the tasks subcollection for an edition.
 * Computes task progress (completed / total).
 *
 * Requirements: 4.1, 4.3
 */
export function useEditionTasks(editionId: string | null) {
  const [tasks, setTasks] = useState<EditionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!editionId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToEditionTasks(
      editionId,
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [editionId]);

  const progress = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Complete').length;
    return { completed, total };
  }, [tasks]);

  return { tasks, loading, error, progress };
}
