import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { callSuggestCardTags, callUpdateArticle, type CardTagSuggestion } from '../services/articleService';
import type { PipelineArticle } from '../types';

export type SuggestionDecision = 'pending' | 'accepted' | 'rejected';

/**
 * State + actions for the AI card-tag scan shown at Final Approval and the
 * Publish step.
 *
 * Auto-runs the scan once when an untagged article arrives; the editor then
 * accepts suggestions individually or all at once, rejects inaccurate ones,
 * or adds tags manually (or ignores everything — nothing blocks approval or
 * publishing). Accepted/manual tags persist via the updateArticle callable
 * to the article's cardTags, and their names merge into topicTags so they
 * resolve to Webflow tags at publish time.
 */
export function useCardTagSuggestions(article: PipelineArticle) {
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<CardTagSuggestion[]>([]);
  const [decisions, setDecisions] = useState<Record<string, SuggestionDecision>>({});
  const [scannedOnce, setScannedOnce] = useState(false);
  const autoScanFired = useRef(false);

  const appliedTags = useMemo(() => article.cardTags ?? [], [article.cardTags]);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const results = await callSuggestCardTags(article.id);
      const appliedIds = new Set((article.cardTags ?? []).map((t) => t.cardId));
      setSuggestions(results.filter((s) => !appliedIds.has(s.cardId)));
      setDecisions({});
      setScannedOnce(true);
      if (results.length === 0) toast.info('AI scan found no card mentions in this article');
    } catch (err) {
      toast.error('Card tag scan failed', { description: (err as Error).message });
    } finally {
      setScanning(false);
    }
  }, [article.id, article.cardTags]);

  // Auto-scan once when the article lands in the Publish step without tags
  useEffect(() => {
    if (autoScanFired.current || appliedTags.length > 0) return;
    autoScanFired.current = true;
    void scan();
  }, [appliedTags.length, scan]);

  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => decisions[s.cardId] !== 'rejected'),
    [suggestions, decisions]
  );
  const accepted = useMemo(
    () => suggestions.filter((s) => decisions[s.cardId] === 'accepted'),
    [suggestions, decisions]
  );

  const toggleAccept = useCallback((cardId: string) => {
    setDecisions((d) => ({ ...d, [cardId]: d[cardId] === 'accepted' ? 'pending' : 'accepted' }));
  }, []);

  const rejectSuggestion = useCallback((cardId: string) => {
    setDecisions((d) => ({ ...d, [cardId]: 'rejected' }));
  }, []);

  const acceptAll = useCallback(() => {
    setDecisions((d) => {
      const next = { ...d };
      for (const s of suggestions) {
        if (next[s.cardId] !== 'rejected') next[s.cardId] = 'accepted';
      }
      return next;
    });
  }, [suggestions]);

  const applyAccepted = useCallback(async () => {
    if (accepted.length === 0) return;
    setSaving(true);
    try {
      const newTags = [...appliedTags, ...accepted.map((s) => ({ cardId: s.cardId, name: s.name }))];
      const topicTags = [...new Set([...(article.topicTags ?? []), ...accepted.map((s) => s.name)])];
      await callUpdateArticle(article.id, { cardTags: newTags, topicTags });
      setSuggestions((prev) => prev.filter((s) => decisions[s.cardId] !== 'accepted'));
      setDecisions({});
      toast.success(`${accepted.length} card tag${accepted.length === 1 ? '' : 's'} added`);
    } catch (err) {
      toast.error('Failed to save card tags', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [accepted, appliedTags, article.id, article.topicTags, decisions]);

  /** Add a manually typed tag (CMS-50). Manual tags carry a `manual-` cardId
   * so they persist through the same cardTags/topicTags pipeline. */
  const addManualTag = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const cardId = `manual-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
      if (appliedTags.some((t) => t.cardId === cardId || t.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.info('That tag is already applied');
        return false;
      }
      setSaving(true);
      try {
        await callUpdateArticle(article.id, {
          cardTags: [...appliedTags, { cardId, name: trimmed }],
          topicTags: [...new Set([...(article.topicTags ?? []), trimmed])],
        });
        toast.success(`Tag "${trimmed}" added`);
        return true;
      } catch (err) {
        toast.error('Failed to add tag', { description: (err as Error).message });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [appliedTags, article.id, article.topicTags]
  );

  const removeApplied = useCallback(
    async (cardId: string, name: string) => {
      try {
        await callUpdateArticle(article.id, {
          cardTags: appliedTags.filter((t) => t.cardId !== cardId),
          topicTags: (article.topicTags ?? []).filter((t) => t !== name),
        });
        toast.success('Card tag removed');
      } catch (err) {
        toast.error('Failed to remove card tag', { description: (err as Error).message });
      }
    },
    [appliedTags, article.id, article.topicTags]
  );

  return {
    scanning,
    saving,
    scannedOnce,
    appliedTags,
    suggestions,
    visibleSuggestions,
    accepted,
    decisions,
    scan,
    toggleAccept,
    rejectSuggestion,
    acceptAll,
    applyAccepted,
    addManualTag,
    removeApplied,
  };
}
