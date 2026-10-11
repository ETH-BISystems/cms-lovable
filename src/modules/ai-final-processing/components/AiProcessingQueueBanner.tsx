import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { runNow, subscribeToQueueCounts } from '../services/aiFinalProcessingService';

/**
 * Pipeline-page banner: visible when articles wait in the AI Final Processing
 * queue. Admins/editors get the wake-up button — a warning dialog spells out
 * the GPU cost (model wake ≈ up to ~1 hour for a full backlog, sleeps when
 * done) before the job starts.
 */
export function AiProcessingQueueBanner() {
  const { role } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    return subscribeToQueueCounts(setCounts);
  }, []);

  const queued = counts['queued'] ?? 0;
  const inFlight = (counts['zerogpt_processing'] ?? 0) + (counts['gemma_processing'] ?? 0) + (counts['validating'] ?? 0);
  const canRun = role === Role.Admin || role === Role.Editor;
  const total = queued + inFlight;
  if (total === 0) return null;

  const handleRun = async () => {
    setConfirmOpen(false);
    setStarting(true);
    try {
      const res = await runNow();
      if (res.started) toast.success('Gemma 4 is waking up', { description: res.message });
      else toast.info('Nothing to process', { description: res.message });
    } catch (err) {
      toast.error('Could not start processing', { description: (err as Error).message });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/5 px-4 py-2.5 animate-fade-in">
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <p className="flex-1 text-[12px] text-foreground">
        <span className="font-semibold">AI Final Processing:</span>{' '}
        {queued > 0 && <span>{queued} article{queued === 1 ? '' : 's'} queued</span>}
        {queued > 0 && inFlight > 0 && <span className="text-muted-foreground"> · </span>}
        {inFlight > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> {inFlight} processing now
          </span>
        )}
      </p>
      {canRun && queued > 0 && (
        <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]" onClick={() => setConfirmOpen(true)} disabled={starting}>
          {starting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Process Backlog Now
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Wake Gemma 4 and process the backlog?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This wakes the serverless GPU and loads the Gemma 4 model. A full backlog of {queued} article
                  {queued === 1 ? '' : 's'} typically takes <strong>up to ~1 hour</strong>; GPU billing runs only
                  while it works and the job <strong>goes back to sleep automatically</strong> when the queue
                  is empty.
                </p>
                <p className="text-[11px]">
                  Articles appear as &ldquo;Ready to publish&rdquo; in their Publish step as they pass.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRun()}>Wake &amp; Process</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
