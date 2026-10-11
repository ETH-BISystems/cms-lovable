import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ArticleComplianceCheck } from '../types';

export type CompliancePublishConcern = 'missing' | 'stale' | 'fail';

interface ConfirmPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  concern: CompliancePublishConcern;
  check: ArticleComplianceCheck | null;
}

const CONCERN_COPY: Record<CompliancePublishConcern, { title: string; description: string }> = {
  missing: {
    title: 'Publish without a compliance check?',
    description:
      "The compliance check hasn't been run on this article. Publishing non-compliant credit-card affiliate content risks issuer violations.",
  },
  stale: {
    title: 'Publish with an outdated compliance check?',
    description:
      'The article changed after the last compliance check ran, so the result below may no longer reflect the current content.',
  },
  fail: {
    title: 'Compliance check failed — publish anyway?',
    description: 'The latest compliance check failed against the compliance rules document.',
  },
};

/**
 * Soft gate on the publish CTA: shown when the latest compliance check is
 * missing, stale, or failed. Explicit confirmation proceeds with the publish —
 * the check never hard-blocks.
 */
export function ConfirmPublishDialog({ open, onOpenChange, onConfirm, concern, check }: ConfirmPublishDialogProps) {
  const copy = CONCERN_COPY[concern];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        {check && concern !== 'missing' && (
          <div className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-[12px] text-muted-foreground space-y-1">
            <p>
              <span className={`font-semibold ${check.verdict === 'fail' ? 'text-destructive' : 'text-success'}`}>
                {check.verdict.toUpperCase()}
              </span>
              {check.verdict === 'fail' && (
                <span className="tabular-nums"> · {check.findings.length} finding{check.findings.length === 1 ? '' : 's'}</span>
              )}
            </p>
            {check.summary && <p>{check.summary}</p>}
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Publish Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
