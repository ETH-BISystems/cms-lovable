import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ShieldAlert, ShieldCheck, ShieldX, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ArticleComplianceCheck, ComplianceCheckSeverity } from '../types';

interface ComplianceCheckPanelProps {
  check: ArticleComplianceCheck | null;
  isStale: boolean;
  running: boolean;
  onRun: () => void;
}

const SEVERITY_STYLES: Record<ComplianceCheckSeverity, { label: string; badge: string; border: string }> = {
  level1: { label: 'Level 1', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30', border: 'border-amber-500/25' },
  level2: { label: 'Level 2', badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30', border: 'border-orange-500/25' },
  level3: { label: 'Level 3', badge: 'bg-destructive/10 text-destructive border-destructive/30', border: 'border-destructive/25' },
};

/**
 * Compliance Check section of the Publish step: audits the article body
 * against the editable compliance rules document (Settings → Compliance) and
 * renders an explicit PASS/FAIL verdict with per-finding reasons. The
 * persisted result (article.complianceCheck) renders on reopen; Re-run is
 * always allowed. Failing or skipping the check never hard-blocks publishing
 * — the publish CTA asks for explicit confirmation instead.
 */
export function ComplianceCheckPanel({ check, isStale, running, onRun }: ComplianceCheckPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" /> Compliance Check
        </p>
        <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={onRun} disabled={running}>
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {running ? 'Checking…' : check ? 'Re-run Compliance Check' : 'Run Compliance Check'}
        </Button>
      </div>

      {running ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Auditing the full article against the compliance rules document — this can take 30-60 seconds…
          </p>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : check ? (
        <div className="space-y-3">
          {/* Verdict badge */}
          {check.verdict === 'pass' ? (
            <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3">
              <ShieldCheck className="h-7 w-7 text-success shrink-0" />
              <div>
                <p className="text-[15px] font-bold tracking-tight text-success">PASS</p>
                {check.summary && <p className="text-[11px] text-muted-foreground">{check.summary}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
              <ShieldX className="h-7 w-7 text-destructive shrink-0" />
              <div>
                <p className="text-[15px] font-bold tracking-tight text-destructive">
                  FAIL
                  <span className="ml-2 text-[11px] font-medium tabular-nums">
                    {check.findings.length} finding{check.findings.length === 1 ? '' : 's'}
                  </span>
                </p>
                {check.summary && <p className="text-[11px] text-muted-foreground">{check.summary}</p>}
              </div>
            </div>
          )}

          {isStale && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                The article changed after this check ran — re-run to validate the current content.
              </p>
            </div>
          )}

          {/* Findings */}
          {check.findings.length > 0 && (
            <div className="space-y-2">
              {check.findings.map((f, i) => {
                const sev = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.level2;
                return (
                  <div key={i} className={`rounded-md border ${sev.border} px-3 py-2.5 space-y-1.5`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${sev.badge}`}>{sev.label}</Badge>
                      {f.rule && <span className="text-[11px] font-medium text-foreground">{f.rule}</span>}
                    </div>
                    {f.excerpt && (
                      <blockquote className="border-l-2 border-muted-foreground/30 bg-muted/40 rounded-sm px-2.5 py-1.5 text-[11px] italic text-muted-foreground">
                        “{f.excerpt}”
                      </blockquote>
                    )}
                    {f.explanation && <p className="text-[11px] text-muted-foreground">{f.explanation}</p>}
                    {f.suggestion && (
                      <p className="text-[11px] text-foreground">
                        <span className="font-medium">Fix:</span> {f.suggestion}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground tabular-nums">
            Checked {formatDistanceToNow(check.checkedAt, { addSuffix: true })} against rules v{check.rulesHash.slice(0, 7)}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Not yet run — the article will be audited against the compliance rules document (Settings → Compliance)
          before publishing.
        </p>
      )}
    </div>
  );
}
