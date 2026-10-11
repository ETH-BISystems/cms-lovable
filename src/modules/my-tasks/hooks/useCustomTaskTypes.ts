import { useState, useEffect } from 'react';
import type { TaskSource } from '../types';
import { ALL_SOURCES, SOURCE_TYPES } from '../types';
// production: onSnapshot(query(collection(db, 'task-types')))
import { subscribeToTaskTypeDocs } from '../services/myTasksService';

/**
 * Subscribes to the `task-types` collection (custom task types created from
 * the New Task modal via the manageTaskTypes Cloud Function) and groups them
 * by source. Built-in duplicates are filtered out so dropdowns never show
 * the same type twice.
 */
export function useCustomTaskTypes() {
  const [customTypes, setCustomTypes] = useState<Record<TaskSource, string[]>>({
    'Blog Engine': [],
    'Newsletter': [],
    'Card Data': [],
    'Client Dashboard': [],
    'Content Creation': [],
  });

  useEffect(() => {
    const unsub = subscribeToTaskTypeDocs((docs) => {
      const grouped: Record<TaskSource, string[]> = {
        'Blog Engine': [],
        'Newsletter': [],
        'Card Data': [],
        'Client Dashboard': [],
        'Content Creation': [],
      };
      docs.forEach((data) => {
        const source = data.source as TaskSource;
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (!name || !ALL_SOURCES.includes(source)) return;
        // Skip built-in duplicates (case-insensitive)
        const builtIns = SOURCE_TYPES[source] ?? [];
        if (builtIns.some((t) => t.toLowerCase() === name.toLowerCase())) return;
        if (grouped[source].some((t) => t.toLowerCase() === name.toLowerCase())) return;
        grouped[source].push(name);
      });
      (Object.keys(grouped) as TaskSource[]).forEach((s) => grouped[s].sort());
      setCustomTypes(grouped);
    });
    return () => unsub();
  }, []);

  return { customTypes };
}
