import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { subscribeToSettings } from '../services/firestoreSubscriptions';
import { saveSettings } from '../services/settingsService';
import type { SettingId } from '../types';

export function useSettings<T>(settingId: SettingId) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToSettings<T>(
      settingId,
      (snapshot) => {
        setData(snapshot);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
        toast.error('Failed to load settings', { description: err.message });
      }
    );

    return () => unsubscribe();
  }, [settingId]);

  const save = useCallback(
    async (updates: Partial<T>) => {
      try {
        await saveSettings(settingId, updates as Record<string, unknown>);
        toast.success('Settings saved successfully');
      } catch (err) {
        // production branches on FirebaseError codes (functions/permission-denied,
        // functions/invalid-argument, functions/failed-precondition); the mock
        // only throws plain Errors, so surface a single save-failed toast.
        const message = err instanceof Error ? err.message : 'Please try again.';
        toast.error('Save failed', { description: message });
        throw err;
      }
    },
    [settingId]
  );

  return { data, loading, error, save };
}
