import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { retryArticle } from '../services/aiFinalProcessingService';
import type { ArticleFinalProcessing } from '../types';

interface Props {
  finalProcessing: ArticleFinalProcessing | undefined | null;
  articleId: string;
  /** Whether the viewer may trigger a retry (admin/editor). */
  canRetry?: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground' },
  zerogpt_processing: { label: 'ZeroGPT detection…', className: 'bg-blue-500/10 text-blue-600' },
  gemma_processing: { label: 'Gemma normalisation…', className: 'bg-blue-500/10 text-blue-600' },
  validating: { label: 'Validating…', className: 'bg-blue-500/10 text-blue-600' },
  ready_to_publish: { label: 'Ready to publish', className: 'bg-green-500/10 text-green-600' },
  processing_failed: { label: 'Processing failed', className: 'bg-red-500/10 text-red-600' },
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
 * Compact per-article AI Final Processing status — shown in the Publish stage
 * panel so editors see ZeroGPT scores, Gemma rewrite state, keyword and URL
 * verification, and can retry a failed run.
 */
export function FinalProcessingStatusBlock({ finalProcessing, articleId, canRetry }: Props) {
  const [retrying, setRetrying] = useState(false);

  if (!finalProcessing) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
        <FileSearch className="h-3.5 w-3.5 shrink-0" />
        AI Final Processing has not run for this article yet — it will be queued automatically.
      </div>
    );
  }

  const display = STATUS_DISPLAY[finalProcessing.status] ?? STATUS_DISPLAY.queued;
  const inFlight = ['zerogpt_processing', 'gemma_processing', 'validating'].includes(finalProcessing.status);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await retryArticle(articleId);
      toast.success('Article re-queued for AI Final Processing');
    } catch (err) {
      toast.error('Retry failed', { description: (err as Error).message });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/30">
        <span className="text-[11px] font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> AI Final Processing
        </span>
        <Badge className={cn('text-[10px] gap-1', display.className)} variant="secondary">
          {inFlight && <Loader2 className="h-3 w-3 animate-spin" />}
          {finalProcessing.status === 'ready_to_publish' && <CheckCircle2 className="h-3 w-3" />}
          {finalProcessing.status === 'processing_failed' && <AlertTriangle className="h-3 w-3" />}
          {display.label}
        </Badge>
      </div>
      <div className="px-3 py-2 text-[11px] space-y-1">
        <Score label="ZeroGPT initial" value={finalProcessing.initialAiScore} />
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Gemma normalisation</span>
          <span className="font-medium">
            {finalProcessing.gemmaAttempts > 0
              ? finalProcessing.status === 'ready_to_publish' || finalProcessing.finalAiScore != null
                ? `Complete (${finalProcessing.gemmaAttempts} pass${finalProcessing.gemmaAttempts === 1 ? '' : 'es'})`
                : 'In progress'
              : finalProcessing.status === 'ready_to_publish'
                ? 'Not needed'
                : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Keywords preserved</span>
          <span className="font-semibold tabular-nums">
            {finalProcessing.keywordsTotal > 0
              ? `${finalProcessing.keywordsPreserved}/${finalProcessing.keywordsTotal}`
              : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">URLs &amp; links</span>
          <span className={cn('font-medium', finalProcessing.urlsVerified && 'text-success')}>
            {finalProcessing.urlsVerified ? 'Verified' : '—'}
          </span>
        </div>
        <Score label="Final ZeroGPT" value={finalProcessing.finalAiScore} />

        {finalProcessing.status === 'processing_failed' && (
          <div className="mt-2 rounded border border-destructive/25 bg-destructive/5 px-2 py-1.5 text-[10px] text-muted-foreground space-y-1">
            <p className="text-destructive font-medium">
              Failed at {finalProcessing.failureStage ?? 'unknown'} — {finalProcessing.failureReason ?? 'unknown error'}
            </p>
            {finalProcessing.failureReason?.includes('insufficient_credits') && (
              <p>ZeroGPT account needs an API credit top-up. See Settings → AI Final Processing.</p>
            )}
            {finalProcessing.rewrittenContent && <p>The completed rewrite is preserved for review.</p>}
            {canRetry && (
              <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 mt-1" onClick={handleRetry} disabled={retrying}>
                {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Re-queue article
              </Button>
            )}
          </div>
        )}

        {finalProcessing.status === 'ready_to_publish' && (
          <p className="flex items-center gap-1 text-[10px] text-success pt-1">
            <ShieldCheck className="h-3 w-3" /> All checks passed — safe to publish.
          </p>
        )}
      </div>
    </div>
  );
}
