import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { seoIntelService } from '../services/seoIntelService';
import type {
  IntelActionName,
  IntelActionPayload,
  Recommendation,
  SeoSnapshot,
} from '../types/intel';

/** Live state for the Intelligence Dashboard: latest snapshot + recommendation queues. */
export function useSeoIntel() {
  const [snapshot, setSnapshot] = useState<SeoSnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [actioned, setActioned] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const onError = (err: Error) => setError(err.message);
    const unsubSnapshot = seoIntelService.subscribeToLatestSnapshot(snap => {
      setSnapshot(snap);
      setLoading(false);
    }, onError);
    const unsubRecs = seoIntelService.subscribeToOpenRecommendations(setRecommendations, onError);
    const unsubActioned = seoIntelService.subscribeToActionedRecommendations(setActioned, onError);
    return () => {
      unsubSnapshot();
      unsubRecs();
      unsubActioned();
    };
  }, []);

  const runSnapshot = useCallback(async (mock = false) => {
    setRunning(true);
    try {
      const result = await seoIntelService.runSnapshot(mock);
      toast.success(`Snapshot ${result.week} complete — ${result.recommendationsWritten} recommendations refreshed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Snapshot failed');
    } finally {
      setRunning(false);
    }
  }, []);

  return { snapshot, recommendations, actioned, loading, error, running, runSnapshot };
}

/** Single recommendation subscription for the detail page. */
export function useRecommendation(id: string | undefined) {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    return seoIntelService.subscribeToRecommendation(id, rec => {
      setRecommendation(rec);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  return { recommendation, loading, error };
}

/** Success messages + deep-link labels per action. */
const ACTION_SUCCESS: Record<IntelActionName, string> = {
  create_article: 'Draft created in the Article Pipeline',
  add_to_refresh_queue: 'Added to the Refresh Queue',
  create_task: 'Task created — see My Tasks',
  snooze: 'Snoozed — it will resurface later',
  dismiss: 'Dismissed — it will not be suggested again',
  reopen: 'Reopened',
};

/** Fire an action on a recommendation with toast feedback. */
export function useIntelAction() {
  const [pendingId, setPendingId] = useState<string | null>(null);

  const act = useCallback(async (
    recommendationId: string,
    action: IntelActionName,
    payload?: IntelActionPayload,
  ): Promise<boolean> => {
    setPendingId(recommendationId);
    try {
      await seoIntelService.actionRecommendation(recommendationId, action, payload);
      toast.success(ACTION_SUCCESS[action]);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
      return false;
    } finally {
      setPendingId(null);
    }
  }, []);

  return { act, pendingId };
}
