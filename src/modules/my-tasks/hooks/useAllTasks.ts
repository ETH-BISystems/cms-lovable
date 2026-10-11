import { useState, useEffect } from 'react';
import type { MyTask, TaskPriority, TaskSource } from '../types';
import { ALL_SOURCES } from '../types';
import type { TaskStatus } from '@/modules/pipeline';
// production: onSnapshot(query(collection(db, 'article-tasks'))) +
//             onSnapshot(query(collection(db, 'articles')))
import { subscribeToTaskDocs, subscribeToArticleDocs } from '../services/myTasksService';

/**
 * Subscribes to ALL tasks in the article-tasks collection and joins
 * with articles collection for article titles. This powers the My Tasks page.
 */
export function useAllTasks() {
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  // Mock service has no error channel; kept in the return shape for parity.
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    let tasksData: Record<string, Record<string, unknown>> = {};
    let articlesData: Record<string, Record<string, unknown>> = {};
    let tasksLoaded = false;
    let articlesLoaded = false;

    function buildTasks() {
      if (!tasksLoaded || !articlesLoaded) return;

      const result: MyTask[] = Object.entries(tasksData).map(([id, raw]) => {
        const articleId = typeof raw.articleId === 'string' ? raw.articleId : '';
        const article = articlesData[articleId];
        const articleTitle = article
          ? (typeof article.title === 'string' ? article.title : 'Untitled')
          : 'Unknown Article';

        // Use the source persisted on the task doc (set by the New Task modal);
        // tasks created automatically by the pipeline default to Blog Engine.
        const source: TaskSource = ALL_SOURCES.includes(raw.source as TaskSource)
          ? (raw.source as TaskSource)
          : 'Blog Engine';

        // Extract priority — default to Medium if not set
        const rawPriority = typeof raw.priority === 'string' ? raw.priority : '';
        const priority: TaskPriority =
          rawPriority === 'High' || rawPriority === 'Medium' || rawPriority === 'Low'
            ? rawPriority
            : 'Medium';

        // Parse dueDate
        let dueDate: Date | null = null;
        if (raw.dueDate) {
          if (typeof (raw.dueDate as { toDate?: unknown }).toDate === 'function') {
            dueDate = (raw.dueDate as { toDate: () => Date }).toDate();
          } else if (raw.dueDate instanceof Date) {
            dueDate = raw.dueDate;
          }
        }

        return {
          id,
          articleId,
          articleTitle,
          name: typeof raw.name === 'string' ? raw.name : 'Task',
          icon: typeof raw.icon === 'string' ? raw.icon : '📝',
          taskType: typeof raw.taskType === 'string' ? raw.taskType : (typeof raw.icon === 'string' ? raw.icon : ''),
          status: (raw.status as TaskStatus) ?? 'Pending',
          priority,
          assignee: typeof raw.assignee === 'string' ? raw.assignee : 'Unassigned',
          avatar: typeof raw.avatar === 'string' ? raw.avatar : '–',
          dueDate,
          comments: typeof raw.comments === 'number' ? raw.comments : 0,
          source,
          blockReason: typeof raw.blockReason === 'string' ? raw.blockReason : undefined,
          blocksAdvancement: typeof raw.blocksAdvancement === 'boolean' ? raw.blocksAdvancement : undefined,
          description: typeof raw.description === 'string' ? raw.description : undefined,
          autoAssigned: typeof raw.autoAssigned === 'boolean' ? raw.autoAssigned : undefined,
        };
      });

      setTasks(result);
      setLoading(false);
    }

    const unsubTasks = subscribeToTaskDocs((docs) => {
      tasksData = docs;
      tasksLoaded = true;
      buildTasks();
    });

    const unsubArticles = subscribeToArticleDocs((docs) => {
      articlesData = docs;
      articlesLoaded = true;
      buildTasks();
    });

    return () => {
      unsubTasks();
      unsubArticles();
    };
  }, []);

  return { tasks, loading, error };
}
