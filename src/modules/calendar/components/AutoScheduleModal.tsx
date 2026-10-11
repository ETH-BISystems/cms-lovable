import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { AutoScheduleOutput } from '../types';

const EMPTY_PLACEMENTS: AutoScheduleOutput['scheduled'] = [];

const SCHEDULING_RULES = [
  'Topic spacing — 2-day minimum gap between same-cluster articles',
  'Publishing velocity — distribute to hit weekly target',
  'Seasonal timing — align with seasonal content demand',
  'Competitor timing — avoid or leverage competitor publish windows',
  'Team workload — distribute evenly across assignees',
  'Weekend handling — reduce weekend scheduling',
];

interface AutoScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unscheduledCount: number;
  onApply: (articleIds: string[]) => Promise<AutoScheduleOutput>;
  onUndo?: (undoToken: string) => Promise<void>;
  proposedPlacements?: AutoScheduleOutput['scheduled'];
  loadingProposals?: boolean;
}

export function AutoScheduleModal({
  open,
  onOpenChange,
  unscheduledCount,
  onApply,
  onUndo,
  proposedPlacements = EMPTY_PLACEMENTS,
  loadingProposals = false,
}: AutoScheduleModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize all placements as checked
  useEffect(() => {
    setCheckedIds(new Set(proposedPlacements.map((p) => p.articleId)));
  }, [proposedPlacements]);

  // Clean up undo timer
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const toggleCheck = (articleId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  };

  const handleApply = async () => {
    const selectedIds = Array.from(checkedIds);
    if (selectedIds.length === 0) return;

    setApplying(true);
    try {
      const result = await onApply(selectedIds);
      const token = result.undoToken;
      setUndoToken(token);

      toast.success(`${result.scheduled.length} articles scheduled`, {
        action: token
          ? {
              label: 'Undo',
              onClick: () => handleUndo(token),
            }
          : undefined,
      });

      // Auto-expire undo after 30 seconds
      undoTimerRef.current = setTimeout(() => {
        setUndoToken(null);
      }, 30_000);

      onOpenChange(false);
    } catch {
      // Error toast handled by mutations hook
    } finally {
      setApplying(false);
    }
  };

  const handleUndo = async (token: string) => {
    if (!onUndo) return;
    try {
      await onUndo(token);
      toast.success('Auto-schedule reverted');
      setUndoToken(null);
    } catch {
      toast.error('Undo window has expired. Changes are permanent.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-[16px] font-semibold tracking-tight">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Sparkles className="h-4 w-4 text-accent" />
            </span>
            Auto-Schedule Articles
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {unscheduledCount} unscheduled article{unscheduledCount !== 1 ? 's' : ''} to schedule
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rules summary */}
          <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
            <h4 className="text-[13px] font-semibold">Scheduling Rules</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {SCHEDULING_RULES.map((rule, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-success mt-0.5">✓</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Proposed placements table */}
          {loadingProposals ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating proposals…
              </h4>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : proposedPlacements.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-[13px] font-semibold">Proposed Placements</h4>
              <div className="border border-border/70 rounded-lg divide-y divide-border/60 text-xs overflow-hidden">
                {proposedPlacements.map((placement) => (
                  <div
                    key={placement.articleId}
                    className="flex items-center gap-3 p-2 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checkedIds.has(placement.articleId)}
                      onCheckedChange={() => toggleCheck(placement.articleId)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{placement.title}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(placement.date), 'EEE, MMM d')} at {placement.publishTime}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 max-w-[140px] truncate" title={placement.reason}>
                      {placement.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-4 text-center animate-fade-in">
              <Sparkles className="h-4 w-4 text-muted-foreground/50" />
              <p className="text-[12px] text-muted-foreground">
                No unscheduled articles to place.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={applying || checkedIds.size === 0}
          >
            {applying ? 'Scheduling...' : `Apply Schedule (${checkedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
