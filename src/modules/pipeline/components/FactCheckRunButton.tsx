import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { callFactCheckArticle } from '../services/articleService';
import type { PipelineArticle } from '../types';

interface FactCheckRunButtonProps {
  /** Articles currently in the Fact Check column. */
  articles: PipelineArticle[];
}

/**
 * Fact Check column action (CMS-161): re-runs the Perplexity fact-check for
 * every article parked in the column that isn't mid-check. The automatic
 * stage-entry trigger is the primary path — this is the recovery button for
 * service errors (status 'error') or content edited after the last run. A
 * fresh FAIL still returns the article to Review & Edit (same callable).
 */
export function FactCheckRunButton({ articles }: FactCheckRunButtonProps) {
  const { role } = useAuth();
  const [running, setRunning] = useState(false);

  const canRun = role === Role.Admin || role === Role.Editor;
  const checkable = articles.filter((a) => a.factCheck?.status !== 'running');

  const handleRunAll = async () => {
    setRunning(true);
    let passed = 0;
    let failed = 0;
    let errored = 0;
    try {
      // Sequential: Perplexity rate limits are kinder to one-at-a-time, and
      // a column rarely holds more than a handful of articles.
      for (const article of checkable) {
        try {
          const res = await callFactCheckArticle(article.id);
          if (res.verdict === 'pass') passed++;
          else failed++;
        } catch {
          errored++;
        }
      }
      if (failed === 0 && errored === 0) {
        toast.success(`Fact check passed for ${passed} article${passed === 1 ? '' : 's'}`);
      } else {
        toast.warning(
          `Fact check finished: ${passed} passed, ${failed} failed (returned to Review & Edit)` +
            (errored ? `, ${errored} could not run` : ''),
        );
      }
    } finally {
      setRunning(false);
    }
  };

  if (!canRun) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2 space-y-1.5 animate-fade-in">
      <p className="text-[10px] text-foreground">
        {articles.length === 0 ? (
          <span className="text-muted-foreground">Fact check runs automatically when an article lands here.</span>
        ) : (
          <span>
            <span className="font-semibold">{articles.length} article{articles.length === 1 ? '' : 's'} in fact check</span>
            {articles.length !== checkable.length && (
              <span className="text-muted-foreground"> · {articles.length - checkable.length} checking now</span>
            )}
          </span>
        )}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="h-6 w-full gap-1 text-[10px]"
        onClick={() => void handleRunAll()}
        disabled={running || checkable.length === 0}
        title={checkable.length === 0 ? 'Nothing to re-check' : `Re-run the fact check for ${checkable.length} article${checkable.length === 1 ? '' : 's'}`}
      >
        {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Re-run Fact Check
      </Button>
    </div>
  );
}
