// MOCK — production subscribed to articles/{id}/voice-notes via onSnapshot;
// the same live feed now comes from the pipeline article store.

import { useState, useEffect } from 'react';
import { subscribeToStore, getVoiceNotesSnapshot } from '../services/articleStore';

export interface PipelineVoiceNote {
  id: string;
  audioStoragePath: string | null;
  transcript: string;
  transcriptionStatus: 'pending' | 'completed' | 'error' | 'skipped';
  contributor: string;
  contributorUid: string;
  duration: number;
  recordedAt: Date;
  transcribedAt: Date | null;
  topicTags: string[];
  mode: 'recorded' | 'typed';
}

export interface UseVoiceNotesReturn {
  voiceNotes: PipelineVoiceNote[];
  loading: boolean;
  error: string | null;
}

/**
 * Subscribe to voice notes for a specific article.
 * Emits immediately and after every store mutation (e.g. callSaveVoiceNote).
 */
export function useVoiceNotes(articleId: string): UseVoiceNotesReturn {
  const [voiceNotes, setVoiceNotes] = useState<PipelineVoiceNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) {
      setVoiceNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const deliver = () => {
      setVoiceNotes(getVoiceNotesSnapshot(articleId).map(({ articleId: _a, ...n }) => n));
      setLoading(false);
    };
    const t = setTimeout(deliver, 50);
    const unsub = subscribeToStore(deliver);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [articleId]);

  return { voiceNotes, loading, error };
}
