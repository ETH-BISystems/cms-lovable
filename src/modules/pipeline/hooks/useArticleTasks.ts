import { useState, useEffect } from 'react';
import { subscribeToArticleTasks } from '../services/firestoreSubscriptions';
import type { ArticleTask } from '../types';

export function useArticleTasks(articleId: string | null) {
  const [tasks, setTasks] = useState<ArticleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!articleId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToArticleTasks(
      articleId,
      (data) => {
        setTasks(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [articleId]);

  const taskProgress = {
    completed: tasks.filter((t) => t.status === 'Complete').length,
    total: tasks.length,
    hasBlocked: tasks.some((t) => t.status === 'Blocked'),
  };

  return { tasks, loading, error, taskProgress };
}
