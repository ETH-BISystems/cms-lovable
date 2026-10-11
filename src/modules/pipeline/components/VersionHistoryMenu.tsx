import { useState } from 'react';
import { History, Loader2, RotateCw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { TimeAgo } from './shared/KanbanCard';
import { useArticleMutations } from '../hooks/useArticleMutations';
import { isRestorableVersion } from '../utils/versionHistory';
import type { ArticleVersion } from '../types';

/**
 * CMS-152: version history surfaced at the TOP of the article panel — a
 * header popover next to Save/Revert listing every version with author,
 * action and timestamp, click to restore. Also hosts the "discard unsaved
 * edits" affordance (returns the body to the last saved state) while the
 * body is dirty. The full-width Version History tab remains available;
 * restores go through the same restoreVersion mechanism either way.
 */
export function VersionHistoryMenu({ articleId, versions, loading, bodyDirty, onDiscardUnsaved }: {
  articleId: string;
  versions: ArticleVersion[];
  loading: boolean;
  /** True while the article body has unsaved edits — gates the discard action
   *  and adds a warning line to the restore confirmation. */
  bodyDirty: boolean;
  /** Discards unsaved body edits (returns the editor to the last saved state). */
  onDiscardUnsaved?: () => void;
}) {
  const { restoreVersion, loading: mutationLoading } = useArticleMutations();
  const [open, setOpen] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const restoring = !!mutationLoading.restoreVersion;
  const confirmVersion = versions.find(v => v.id === confirmRestoreId) ?? null;

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion(articleId, versionId);
      toast.success('Version restored', { description: 'A new version entry was recorded for this restore.' });
      setConfirmRestoreId(null);
      setOpen(false);
    } catch {
      // error toast handled in useArticleMutations
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[11px] gap-1.5"
            title="Version history — browse earlier versions and restore one"
          >
            <History className="w-3.5 h-3.5" /> History
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[380px] p-0">
          <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-foreground">Version history</p>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {versions.length} version{versions.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Unsaved-edits strip — the manual-save counterpart of the old
              "revert to last saved" button (CMS-152) */}
          {bodyDirty && onDiscardUnsaved && (
            <div className="px-3.5 py-2 border-b border-border bg-amber-500/10 flex items-center justify-between gap-2">
              <p className="text-[11px] text-amber-700">Changes haven&apos;t been saved.</p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 shrink-0 border-amber-600/40 text-amber-700 hover:bg-amber-500/10"
                title="Discard the unsaved edits and return to the last saved content"
                onClick={() => onDiscardUnsaved()}
              >
                <Undo2 className="w-3 h-3" /> Discard
              </Button>
            </div>
          )}

          <ScrollArea className="max-h-[320px]">
            <div className="p-2 space-y-1.5">
              {loading && <p className="py-6 text-center text-[11px] text-muted-foreground">Loading versions…</p>}
              {!loading && versions.length === 0 && (
                <p className="py-6 text-center text-[11px] text-muted-foreground">No version history yet</p>
              )}
              {!loading && versions.map((v, i) => {
                const isCurrent = i === 0;
                const canRestore = !isCurrent && isRestorableVersion(v);
                return (
                  <div key={v.id} className="flex items-center gap-2.5 rounded-lg border border-border/70 px-2.5 py-2">
                    <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-medium shrink-0">
                      {v.author.split(' ').map(w => w[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-semibold text-card-foreground truncate">{v.author}</p>
                        {isCurrent && <Badge variant="secondary" className="text-[8px] px-1 py-0">Current</Badge>}
                        {v.restoredFromVersionId && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-accent/40 text-accent">Restore</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{v.action}</p>
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <TimeAgo date={v.timestamp} />
                        <span>{v.wordCount.toLocaleString()} words</span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[9px] gap-1 shrink-0"
                        disabled={!canRestore || restoring}
                        title={canRestore
                          ? 'Return the article to this version'
                          : 'No content snapshot stored for this version (recorded before restore support)'}
                        onClick={() => setConfirmRestoreId(v.id)}
                      >
                        <RotateCw className="w-2.5 h-2.5" /> Restore
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="px-3.5 py-2 border-t border-border">
            <p className="text-[9px] text-muted-foreground">
              Restores are recorded as new version entries — nothing is ever overwritten. The full list lives in the Version History tab.
            </p>
          </div>
        </PopoverContent>
      </Popover>

      {/* Restore confirmation — same wording as the Version History tab */}
      <AlertDialog open={!!confirmVersion} onOpenChange={(o) => { if (!o && !restoring) setConfirmRestoreId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              The article content will be returned to the state from{' '}
              <span className="font-medium text-card-foreground">{confirmVersion?.timestamp.toLocaleString()}</span>{' '}
              ({confirmVersion?.action}). Nothing is overwritten — the restore is recorded as a new version entry,
              so the current state stays restorable too.
              {bodyDirty && ' Your unsaved changes will be discarded.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                // Keep the dialog open while the restore runs; closed on success.
                e.preventDefault();
                if (confirmVersion) void handleRestore(confirmVersion.id);
              }}
            >
              {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {restoring ? 'Restoring…' : 'Restore version'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
