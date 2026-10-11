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
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { runNow, subscribeToWatermarkPhaseCounts } from '../services/aiFinalProcessingService';

/**
 * Watermark Removal column wake button: always visible under the column
 * header (greyed when the column has nothing to process) so the
 * out-of-schedule trigger is discoverable at all times. Shows live
 * waiting/processing counts, and the warning dialog spells out the GPU cost
 * (model wake ≈ up to ~1 hour for a full backlog, sleeps automatically when
 * the queue drains) before anything starts.
 */
export function WatermarkRemovalWakeButton() {
  const { role } = useAuth();
  const [pending, setPending] = useState(0);
  const [inFlight, setInFlight] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Mock: one static emission of the watermark-phase counts (production
    // buckets a live onSnapshot over the phase stages client-side).
    return subscribeToWatermarkPhaseCounts((wait, flying) => {
      setPending(wait);
      setInFlight(flying);
    });
  }, []);

  const canRun = role === Role.Admin || role === Role.Editor;

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
    <div className="mx-2 mb-2 rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2 space-y-1.5 animate-fade-in">
      <p className="text-[10px] text-foreground">
        {pending > 0 && <span className="font-semibold">{pending} waiting for watermark removal</span>}
        {pending > 0 && inFlight > 0 && <span className="text-muted-foreground"> · </span>}
        {inFlight > 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-2.5 w-2.5 animate-spin" /> {inFlight} processing now
          </span>
        )}
        {pending === 0 && inFlight === 0 && (
          <span className="text-muted-foreground">Runs on the daily schedule — or wake it manually:</span>
        )}
      </p>
      {canRun && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 w-full gap-1 text-[10px]"
          onClick={() => setConfirmOpen(true)}
          disabled={starting || pending === 0}
          title={pending === 0 ? 'Nothing is waiting to be processed' : `Process ${pending} article${pending === 1 ? '' : 's'} now`}
        >
          {starting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          Wake &amp; Process Now
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Wake Gemma 4 for this column?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This wakes the serverless GPU and loads the Gemma 4 model to process the{' '}
                  {pending} article{pending === 1 ? '' : 's'} waiting for watermark removal —
                  typically <strong>up to ~1 hour</strong> for a full backlog. GPU billing runs only
                  while it works, and the job <strong>switches off automatically</strong> once
                  processing is finished. (This is the out-of-schedule emergency path — the job also
                  runs on its daily schedule.)
                </p>
                <p className="text-[11px]">
                  Articles move to Fact Check as they pass; failures stay in the column with the
                  reason shown.
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
