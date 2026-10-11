import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { callFactCheckArticle } from '../services/articleService';
import type { ArticleFactCheck, PipelineArticle } from '../types';

/**
 * State + actions for the Perplexity fact-check in the Fact Check stage
 * (CMS-161). The persisted report lives on the article doc (`factCheck`,
 * written server-side by the factCheckArticle callable / stage-entry
 * trigger), so it renders again on reopen and live-updates while the
 * automatic run is in flight; a just-returned manual result is kept locally
 * until the snapshot subscription catches up.
 */
export function useFactCheck(article: PipelineArticle) {
  const [running, setRunning] = useState(false);
  const [localResult, setLocalResult] = useState<ArticleFactCheck | null>(null);

  // Prefer the subscribed article doc once it has caught up with (or passed)
  // the locally held result from the last manual run. The doc also flips to
  // status 'running' the moment any check starts — that always wins so the
  // spinner shows for automatic and manual runs alike.
  const factCheck = useMemo<ArticleFactCheck | null>(() => {
    const persisted = article.factCheck ?? null;
    if (persisted?.status === 'running') return persisted;
    if (!localResult) return persisted;
    const persistedAt = persisted?.checkedAt?.getTime() ?? 0;
    const localAt = localResult.checkedAt?.getTime() ?? 0;
    return persistedAt >= localAt ? persisted : localResult;
  }, [article.factCheck, localResult]);

  // Live "checking" state: server says running, or a manual run is in flight.
  const isChecking = running || factCheck?.status === 'running';

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const result = await callFactCheckArticle(article.id);
      setLocalResult({
        status: result.verdict === 'pass' ? 'passed' : 'failed',
        verdict: result.verdict,
        summary: result.summary,
        issues: result.issues,
        checkedAt: result.checkedAt ? new Date(result.checkedAt) : new Date(),
        checkedBy: result.checkedBy,
        model: result.model,
        citations: result.citations,
      });
      if (result.verdict === 'pass') {
        toast.success('Fact check passed');
      } else {
        toast.warning(
          `Fact check failed — ${result.issues.length} issue${result.issues.length === 1 ? '' : 's'} flagged. Article returned to Review & Edit.`
        );
      }
    } catch (err) {
      toast.error('Fact check failed to run', { description: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }, [article.id]);

  return { factCheck, isChecking, run };
}
