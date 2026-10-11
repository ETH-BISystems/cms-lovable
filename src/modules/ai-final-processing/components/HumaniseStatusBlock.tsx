import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  FileSearch,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { runHumanise } from '../services/aiFinalProcessingService';
import type { ArticleHumanise } from '../types';

interface Props {
  humanise: ArticleHumanise | undefined | null;
  articleId: string;
  /** Whether the viewer may trigger a (re)run (admin/editor). */
  canRun?: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground' },
  zerogpt_processing: { label: 'ZeroGPT scan…', className: 'bg-blue-500/10 text-blue-600' },
  gemma_processing: { label: 'Humanising…', className: 'bg-blue-500/10 text-blue-600' },
  validating: { label: 'Final scan…', className: 'bg-blue-500/10 text-blue-600' },
  passed: { label: 'Humanised', className: 'bg-green-500/10 text-green-600' },
  failed: { label: 'Humanise failed', className: 'bg-red-500/10 text-red-600' },
};

function Score({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums', value == null && 'text-muted-foreground font-normal')}>
        {value == null ? '—' : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

/**
 * CMS-131: per-article Humanise stage status — ZeroGPT scan of the draft,
 * the Gemma humanise pass, and the after-score with the visible drop the
 * client asked to see. Editors/admins can (re)run the pass on demand.
 */
export function HumaniseStatusBlock({ humanise, articleId, canRun }: Props) {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runHumanise(articleId);
      toast.success(
        result.executionId
          ? 'Humanise pass started — the article updates live'
          : 'Article queued — another run is already in flight',
      );
    } catch (err) {
      toast.error('Could not start the humanise pass', { description: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  if (!humanise) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <FileSearch className="h-3.5 w-3.5 shrink-0" />
          This article has not been humanised yet — it queues automatically on entering this stage.
        </div>
        {canRun && (
          <Button variant="outline" size="sm" className="text-[11px] h-7 gap-1.5" onClick={handleRun} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Humanise now
          </Button>
        )}
      </div>
    );
  }

  const display = STATUS_DISPLAY[humanise.status] ?? STATUS_DISPLAY.queued;
  const inFlight = ['zerogpt_processing', 'gemma_processing', 'validating'].includes(humanise.status);
  const showDrop =
    humanise.status === 'passed' && humanise.initialAiScore != null && humanise.finalAiScore != null;

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
        <span className="text-[11px] font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Humanise (ZeroGPT → Gemma)
        </span>
        <Badge className={cn('text-[10px] gap-1', display.className)} variant="secondary">
          {inFlight && <Loader2 className="h-3 w-3 animate-spin" />}
          {humanise.status === 'passed' && <CheckCircle2 className="h-3 w-3" />}
          {humanise.status === 'failed' && <AlertTriangle className="h-3 w-3" />}
          {display.label}
        </Badge>
      </div>
      <div className="px-3 py-2 text-[11px] space-y-1">
        <Score label="ZeroGPT before (Claude draft)" value={humanise.initialAiScore} />
        {showDrop && (
          <div className="flex items-center justify-center gap-1.5 py-0.5 text-success font-semibold">
            <ArrowDown className="h-3 w-3" />
            {Math.round((humanise.initialAiScore as number) - (humanise.finalAiScore as number))} point drop
          </div>
        )}
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Gemma humanise pass</span>
          <span className="font-medium">
            {humanise.gemmaAttempts > 0
              ? humanise.status === 'passed' || humanise.finalAiScore != null
                ? `Complete (${humanise.gemmaAttempts} pass${humanise.gemmaAttempts === 1 ? '' : 'es'})`
                : 'In progress'
              : humanise.status === 'passed'
                ? 'Not needed'
                : '—'}
          </span>
        </div>
        <Score label="ZeroGPT after humanising" value={humanise.finalAiScore} />

        {humanise.status === 'failed' && (
          <div className="mt-2 rounded border border-destructive/25 bg-destructive/5 px-2 py-1.5 text-[10px] text-muted-foreground space-y-1">
            <p className="text-destructive font-medium">
              Failed at {humanise.failureStage ?? 'unknown'} — {humanise.failureReason ?? 'unknown error'}
            </p>
            {humanise.failureReason?.includes('insufficient_credits') && (
              <p>ZeroGPT account needs an API credit top-up. See Settings → AI Final Processing.</p>
            )}
            {humanise.rewrittenContent && <p>The completed rewrite is preserved for review.</p>}
          </div>
        )}

        {humanise.status === 'passed' && (
          <p className="flex items-center gap-1 text-[10px] text-success pt-1">
            <ShieldCheck className="h-3 w-3" /> Humanised — the editor reviews this text next.
          </p>
        )}

        {canRun && humanise.status !== 'passed' && !inFlight && (
          <Button
            variant="outline"
            size="sm"
            className="text-[10px] h-6 gap-1 mt-1"
            onClick={handleRun}
            disabled={running}
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            {humanise.status === 'failed' ? 'Retry humanise pass' : 'Humanise now'}
          </Button>
        )}
      </div>
    </div>
  );
}
