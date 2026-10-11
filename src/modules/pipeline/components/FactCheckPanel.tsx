import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShieldCheck, ShieldX, Sparkles, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ArticleFactCheck, FactCheckIssueType } from '../types';

interface FactCheckPanelProps {
  factCheck: ArticleFactCheck | null;
  isChecking: boolean;
  onRun: () => void;
  /** Extra context line rendered under the header (e.g. the auto-run note in
   * the Fact Check stage, or the "sent back" note in Review & Edit). */
  note?: string;
  /** Hide the re-run button (e.g. non-privileged roles). */
  canRun?: boolean;
}

const ISSUE_TYPE_STYLES: Record<FactCheckIssueType, { label: string; badge: string; border: string }> = {
  incorrect: { label: 'Incorrect', badge: 'bg-destructive/10 text-destructive border-destructive/30', border: 'border-destructive/25' },
  outdated: { label: 'Outdated', badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30', border: 'border-orange-500/25' },
  unverifiable: { label: 'Unverifiable', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30', border: 'border-amber-500/25' },
};

/**
 * Fact Check report (CMS-161): renders the Perplexity verdict with the
 * flagged claims. Incorrect/outdated issues fail the article and bounce it
 * to Review & Edit; unverifiable items are shown as review notes only.
 */
export function FactCheckPanel({ factCheck, isChecking, onRun, note, canRun = true }: FactCheckPanelProps) {
  const issues = factCheck?.issues ?? [];
  const failing = issues.filter((i) => i.issueType !== 'unverifiable');
  const notes = issues.filter((i) => i.issueType === 'unverifiable');

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Fact Check
          <span className="text-[10px] font-normal text-muted-foreground">· Perplexity AI</span>
        </p>
        {canRun && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={onRun} disabled={isChecking}>
            {isChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {isChecking ? 'Checking…' : factCheck?.verdict ? 'Re-run Fact Check' : 'Run Fact Check'}
          </Button>
        )}
      </div>

      {note && <p className="text-[11px] text-muted-foreground">{note}</p>}

      {isChecking ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Perplexity is verifying the article's factual claims against current sources — this can take 30-60 seconds…
          </p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : factCheck?.status === 'error' ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-medium text-amber-700">The fact check could not complete</p>
            <p className="text-[11px] text-amber-700/80">{factCheck.error || 'Service temporarily unavailable — re-run to try again.'}</p>
          </div>
        </div>
      ) : factCheck?.verdict === 'pass' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3">
            <ShieldCheck className="h-7 w-7 text-success shrink-0" />
            <div>
              <p className="text-[15px] font-bold tracking-tight text-success">PASS</p>
              {factCheck.summary && <p className="text-[11px] text-muted-foreground">{factCheck.summary}</p>}
            </div>
          </div>
        </div>
      ) : factCheck?.verdict === 'fail' ? (
        <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
          <ShieldX className="h-7 w-7 text-destructive shrink-0" />
          <div>
            <p className="text-[15px] font-bold tracking-tight text-destructive">
              FAIL
              <span className="ml-2 text-[11px] font-medium tabular-nums">
                {failing.length} issue{failing.length === 1 ? '' : 's'}
              </span>
            </p>
            {factCheck.summary && <p className="text-[11px] text-muted-foreground">{factCheck.summary}</p>}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Not yet run — the fact check starts automatically when the article enters the Fact Check stage.
        </p>
      )}

      {/* Issues (incorrect / outdated first, unverifiable notes after) */}
      {!isChecking && issues.length > 0 && (
        <div className="space-y-2">
          {[...failing, ...notes].map((issue, i) => {
            const style = ISSUE_TYPE_STYLES[issue.issueType] ?? ISSUE_TYPE_STYLES.incorrect;
            return (
              <div key={i} className={`rounded-md border ${style.border} px-3 py-2.5 space-y-1.5`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${style.badge}`}>{style.label}</Badge>
                </div>
                {issue.claim && (
                  <blockquote className="border-l-2 border-muted-foreground/30 bg-muted/40 rounded-sm px-2.5 py-1.5 text-[11px] italic text-muted-foreground">
                    “{issue.claim}”
                  </blockquote>
                )}
                {issue.explanation && <p className="text-[11px] text-muted-foreground">{issue.explanation}</p>}
                {issue.correction && (
                  <p className="text-[11px] text-foreground">
                    <span className="font-medium">Correct fact:</span> {issue.correction}
                  </p>
                )}
                {issue.source && <p className="text-[10px] text-muted-foreground/80 break-all">Source: {issue.source}</p>}
              </div>
            );
          })}
        </div>
      )}

      {!isChecking && factCheck?.checkedAt && (
        <p className="text-[10px] text-muted-foreground tabular-nums">
          Checked {formatDistanceToNow(factCheck.checkedAt, { addSuffix: true })}
          {factCheck.checkedBy === 'auto-fact-check' ? ' automatically on stage entry' : ' via manual re-run'}
          {(factCheck.citations?.length ?? 0) > 0 && ` · ${factCheck.citations!.length} source${factCheck.citations!.length === 1 ? '' : 's'} cited`}
        </p>
      )}
    </div>
  );
}
