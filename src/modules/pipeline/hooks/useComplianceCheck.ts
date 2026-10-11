import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { callCheckArticleCompliance } from '../services/articleService';
import type { ArticleComplianceCheck, PipelineArticle } from '../types';

/**
 * State + actions for the AI compliance check in the Publish step.
 *
 * The persisted result lives on the article doc (`complianceCheck`, written
 * server-side by the checkArticleCompliance callable) so it renders again on
 * reopen; a just-returned result is kept locally until the snapshot
 * subscription catches up. The check never hard-blocks publishing — the
 * publish CTA asks for explicit confirmation when the latest check is
 * missing, stale, or failed.
 */
export function useComplianceCheck(article: PipelineArticle) {
  const [running, setRunning] = useState(false);
  const [localResult, setLocalResult] = useState<ArticleComplianceCheck | null>(null);

  // Prefer the subscribed article doc once it has caught up with (or passed)
  // the locally held result from the last run.
  const check = useMemo<ArticleComplianceCheck | null>(() => {
    const persisted = article.complianceCheck ?? null;
    if (!localResult) return persisted;
    if (persisted && persisted.checkedAt.getTime() >= localResult.checkedAt.getTime()) return persisted;
    return localResult;
  }, [article.complianceCheck, localResult]);

  // Stale = the article was edited after the check ran (updatedAt is bumped
  // by every article mutation; the compliance write itself deliberately does
  // not touch it). Small tolerance absorbs clock skew between writes.
  const isStale = useMemo(() => {
    if (!check) return false;
    return article.updatedAt.getTime() - check.checkedAt.getTime() > 2000;
  }, [article.updatedAt, check]);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const result = await callCheckArticleCompliance(article.id);
      setLocalResult({
        verdict: result.verdict,
        summary: result.summary,
        findings: result.findings,
        checkedAt: new Date(result.checkedAt),
        checkedBy: result.checkedBy,
        rulesHash: result.rulesHash,
        model: result.model,
      });
      if (result.verdict === 'pass') {
        toast.success('Compliance check passed');
      } else {
        toast.warning(`Compliance check failed — ${result.findings.length} finding${result.findings.length === 1 ? '' : 's'}`);
      }
    } catch (err) {
      toast.error('Compliance check failed to run', { description: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }, [article.id]);

  return { check, isStale, running, run };
}
