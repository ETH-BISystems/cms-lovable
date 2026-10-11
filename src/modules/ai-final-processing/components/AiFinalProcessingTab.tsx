import { useEffect, useMemo, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Activity,
  Bot,
  CalendarClock,
  CircleDollarSign,
  Loader2,
  Play,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSettingsPermissions } from '../../settings/hooks/useSettingsPermissions';
import { useAiFinalProcessingStatus } from '../hooks/useAiFinalProcessingStatus';
import { runCardQueueNow, runNow, testZeroGpt, updateSettings } from '../services/aiFinalProcessingService';
import { CADENCE_META, type ProcessingCadence, type ZeroGptTestResponse } from '../types';

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 90) return `${Math.round(seconds)}s`;
  return `${Math.round(seconds / 60)} min`;
}

function formatNextRun(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Melbourne' });
  return sameDay ? `${time} today` : d.toLocaleString('en-AU', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Melbourne' });
}

const CADENCE_ORDER: ProcessingCadence[] = ['twice_daily', 'three_times_daily', 'per_article', 'paused'];

export function AiFinalProcessingTab() {
  const { isAdmin } = useSettingsPermissions();
  const { data, loading, error, refresh, running } = useAiFinalProcessingStatus();
  const [savingCadence, setSavingCadence] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);
  const [starting, setStarting] = useState(false);
  const [confirmCardRun, setConfirmCardRun] = useState(false);
  const [startingCard, setStartingCard] = useState(false);
  const [zgTest, setZgTest] = useState<ZeroGptTestResponse | null>(null);
  const [zgTesting, setZgTesting] = useState(false);
  const [threshold, setThreshold] = useState<string>('');
  const [savingAdvanced, setSavingAdvanced] = useState(false);

  useEffect(() => {
    if (data) setThreshold(String(data.settings.aiScoreThreshold));
  }, [data]);

  const settings = data?.settings;
  const readOnly = !isAdmin;

  const handleCadence = async (cadence: ProcessingCadence) => {
    if (!settings || cadence === settings.cadence) return;
    setSavingCadence(true);
    try {
      const res = await updateSettings({ cadence });
      if (res.schedulerError) {
        toast.warning('Cadence saved, scheduler update failed', { description: res.schedulerError });
      } else {
        toast.success('Processing cadence updated', { description: res.schedulerActions.join(' · ') });
      }
      await refresh();
    } catch (err) {
      toast.error('Failed to update cadence', { description: (err as Error).message });
    } finally {
      setSavingCadence(false);
    }
  };

  const handleEnabled = async (enabled: boolean) => {
    try {
      await updateSettings({ enabled });
      toast.success(enabled ? 'AI Final Processing enabled' : 'AI Final Processing disabled', {
        description: enabled
          ? 'Articles entering the Publish stage will be queued, and publishing requires a passing run.'
          : 'Publishing is no longer gated. Scheduled runs continue processing the queue.',
      });
      await refresh();
    } catch (err) {
      toast.error('Failed to update setting', { description: (err as Error).message });
    }
  };

  const handleRunNow = async () => {
    setConfirmRun(false);
    setStarting(true);
    try {
      const res = await runNow();
      if (res.started) {
        toast.success('Gemma rewrite execution started', { description: res.message });
      } else {
        toast.info('Nothing to process', { description: res.message });
      }
      await refresh();
    } catch (err) {
      toast.error('Could not start processing', { description: (err as Error).message });
    } finally {
      setStarting(false);
    }
  };

  // Card prose queue (Card Data Manager scraper humanise backlog) — the
  // out-of-schedule wake for the card side (2026-09-09).
  const handleCardRunNow = async () => {
    setConfirmCardRun(false);
    setStartingCard(true);
    try {
      const res = await runCardQueueNow();
      if (res.started) {
        toast.success('Card prose execution started', { description: res.message });
      } else {
        toast.info('Card queue not started', { description: res.message });
      }
      await refresh();
    } catch (err) {
      toast.error('Could not start card processing', { description: (err as Error).message });
    } finally {
      setStartingCard(false);
    }
  };

  const handleTestZeroGpt = async () => {
    setZgTesting(true);
    try {
      setZgTest(await testZeroGpt());
    } catch (err) {
      setZgTest({ status: 'error', message: (err as Error).message, details: {} });
    } finally {
      setZgTesting(false);
    }
  };

  const handleSaveAdvanced = async () => {
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error('Threshold must be between 0 and 100');
      return;
    }
    setSavingAdvanced(true);
    try {
      await updateSettings({ aiScoreThreshold: value });
      toast.success('Detection settings saved');
      await refresh();
    } catch (err) {
      toast.error('Save failed', { description: (err as Error).message });
    } finally {
      setSavingAdvanced(false);
    }
  };

  const telemetry = data?.telemetry;
  const schedulerOk = data?.scheduler?.exists && !data?.scheduler?.error;
  const cadenceDescription = useMemo(() => {
    if (!settings) return '';
    return CADENCE_META[settings.cadence].hint;
  }, [settings]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data || !settings) {
    return <div className="text-destructive text-[13px]">Failed to load AI Final Processing status: {error?.message ?? 'no data'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header: master switch + ZeroGPT connection ── */}
      <div className="bg-card rounded-lg border border-border px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold text-card-foreground">AI Final Processing</h3>
              <Badge variant={settings.enabled ? 'default' : 'secondary'} className="text-[10px]">
                {settings.enabled ? 'Gate enabled' : 'Gate disabled'}
              </Badge>
              {running && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Execution running
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              Approved articles pass ZeroGPT AI detection and a conservative self-hosted Gemma normalisation
              (Cloud Run Job, NVIDIA L4) before they can be published. AI detection is probabilistic — scores
              are recorded and shown, never guaranteed.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="afp-enabled" className="text-[12px] text-muted-foreground">
              Publish gate
            </Label>
            <Switch id="afp-enabled" checked={settings.enabled} disabled={readOnly} onCheckedChange={handleEnabled} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" className="text-[12px] gap-1.5" onClick={handleTestZeroGpt} disabled={zgTesting || readOnly}>
            {zgTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Test ZeroGPT Connection
          </Button>
          {zgTest && (
            <span className={cn('text-[11px]', zgTest.status === 'connected' ? 'text-success' : zgTest.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
              {zgTest.message}
            </span>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Queued (articles / cards)</p>
          <p className="text-[18px] font-semibold mt-1 tabular-nums">{data.queued} / {data.cardsQueued}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Next Scheduled Run</p>
          <p className="text-[14px] font-semibold mt-1.5 flex items-center justify-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            {settings.cadence === 'per_article' ? 'On approval' : formatNextRun(data.nextRuns[0])}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Runs (30 days)</p>
          <p className="text-[18px] font-semibold mt-1 tabular-nums">{telemetry?.runsLast30Days ?? 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-[10px] text-muted-foreground">Est. GPU hours / month</p>
          <p className="text-[18px] font-semibold mt-1 tabular-nums">{telemetry?.estimatedGpuHoursPerMonth ?? '—'}</p>
        </div>
      </div>

      {/* ── Processing cadence ── */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Processing cadence</h3>
          <div className="flex items-center gap-2">
            {savingCadence && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            <Button
              variant="default"
              size="sm"
              className="text-[12px] gap-1.5"
              disabled={readOnly || starting || startingCard || data.queued === 0}
              onClick={() => setConfirmRun(true)}
            >
              {starting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run Article Queue ({data.queued})
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-[12px] gap-1.5"
              disabled={readOnly || starting || startingCard || data.cardsQueued === 0}
              onClick={() => setConfirmCardRun(true)}
              title="Wake Gemma 4 for the Card Data Manager prose queue (out-of-schedule)"
            >
              {startingCard ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Run Card Queue ({data.cardsQueued})
            </Button>
          </div>
        </div>
        <div className="px-5 py-4">
          <RadioGroup value={settings.cadence} onValueChange={(v) => void handleCadence(v as ProcessingCadence)} disabled={readOnly || savingCadence} className="space-y-3">
            {CADENCE_ORDER.map((cadence) => {
              const meta = CADENCE_META[cadence];
              return (
                <div key={cadence} className="flex items-start gap-3">
                  <RadioGroupItem value={cadence} id={`cadence-${cadence}`} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`cadence-${cadence}`} className="text-[13px] font-medium cursor-pointer">
                        {meta.label}
                      </Label>
                      {meta.badge && (
                        <Badge variant={cadence === 'per_article' ? 'secondary' : 'default'} className="text-[10px]">
                          {meta.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{meta.hint}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <div>
              <span className="font-medium text-card-foreground">Timezone</span>
              <p>{settings.timezone}</p>
            </div>
            <div>
              <span className="font-medium text-card-foreground">Scheduled times</span>
              <p>{data.scheduleTimes.length ? data.scheduleTimes.join(' · ') : cadenceDescription}</p>
            </div>
            <div>
              <span className="font-medium text-card-foreground">Scheduler</span>
              <p className={cn(schedulerOk ? 'text-success' : 'text-muted-foreground')}>
                {data.scheduler.error
                  ? `Error: ${data.scheduler.error}`
                  : data.scheduler.exists
                    ? data.scheduler.paused
                      ? `Paused (${data.scheduler.schedule})`
                      : `Active (${data.scheduler.schedule} ${data.scheduler.timezone ?? ''})`
                    : 'Not created yet — save a cadence to create it'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cost awareness ── */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-card-foreground">Cost awareness</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-[12px] text-muted-foreground">
            The GPU only runs while a batch executes and stops when it exits. Twice-daily batches minimise
            repeated Gemma model startups; <span className="font-medium text-card-foreground">Per article / Immediate</span> may
            cause up to ~50 separate GPU executions per day at full volume. Actual cost depends on execution
            duration and current Google Cloud pricing.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Recent average runtime</p>
              <p className="text-[14px] font-semibold tabular-nums">{formatDuration(telemetry?.avgDurationSeconds)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Articles / run</p>
              <p className="text-[14px] font-semibold tabular-nums">{telemetry?.avgArticlesPerRun ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Runs / month</p>
              <p className="text-[14px] font-semibold tabular-nums">{telemetry?.runsLast30Days ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Articles processed (30d)</p>
              <p className="text-[14px] font-semibold tabular-nums">{telemetry?.articlesProcessedLast30Days ?? 0}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Figures are measured from real executions in the last 30 days — no estimates are invented.
          </p>
        </div>
      </div>

      {/* ── Detection & retry bounds ── */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Detection &amp; retries</h3>
          {!readOnly && (
            <Button variant="outline" size="sm" className="text-[12px]" onClick={handleSaveAdvanced} disabled={savingAdvanced}>
              {savingAdvanced ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          )}
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">ZeroGPT score threshold (% AI)</Label>
            <Input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(e.target.value)} disabled={readOnly} className="text-[12px] h-8" />
            <p className="text-[10px] text-muted-foreground">Final detection must be at or below this score.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Gemma retry bound</Label>
            <Input type="number" value={settings.gemmaMaxRetries} disabled className="text-[12px] h-8" />
            <p className="text-[10px] text-muted-foreground">Rewrite attempts per article (bounded — never loops).</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-muted-foreground">Batch limit</Label>
            <Input type="number" value={settings.batchLimit} disabled className="text-[12px] h-8" />
            <p className="text-[10px] text-muted-foreground">Max articles per scheduled execution; overflow rolls to the next run.</p>
          </div>
        </div>
      </div>

      {/* ── Recent executions ── */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-[14px] font-semibold text-card-foreground">Recent executions</h3>
        </div>
        <div className="px-5 py-4">
          {data.recentExecutions.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No executions yet.</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Started</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Mode</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Processed</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Ready</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Failed</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Duration</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentExecutions.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="py-2 px-2 text-muted-foreground">{e.startedAt ? new Date(e.startedAt).toLocaleString() : '—'}</td>
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px] capitalize">{e.mode}</Badge></td>
                    <td className="py-2 px-2 text-right tabular-nums">{e.processed}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{e.succeeded}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{e.failed}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{formatDuration(e.durationSeconds)}</td>
                    <td className="py-2 px-2">
                      <Badge variant={e.status === 'succeeded' ? 'default' : e.status === 'running' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Run Now confirmation */}
      <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Wake Gemma 4 and process the backlog?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This starts the GPU and loads the Gemma 4 model — a full backlog of {data.queued} article
                  {data.queued === 1 ? '' : 's'} typically takes <strong>up to ~1 hour</strong> (model download +
                  load, then processing). The model alone takes ~6 minutes to load before processing begins, and
                  the job <strong>sleeps automatically</strong> when the queue is empty.
                </p>
                <p className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-[12px]">
                  <strong>Cost warning:</strong> up to <strong>~1 hour of Cloud Run GPU time</strong> will be billed
                  to our Google Cloud account for this run — actual billing is less when the queue drains sooner.
                </p>
                <p className="text-[11px]">
                  Up to {Math.min(data.queued, settings.batchLimit)} article(s) process this run; the rest roll to
                  the next scheduled batch. Articles move to &ldquo;Ready to publish&rdquo; as they pass.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRunNow()}>Wake &amp; Process Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Card Queue Run Now confirmation */}
      <AlertDialog open={confirmCardRun} onOpenChange={setConfirmCardRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> Wake Gemma 4 for the card prose queue?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {data.cardsQueued} card{data.cardsQueued === 1 ? '' : 's'} are queued for prose humanising
                  (Card Data Manager). The scheduler only drains this queue at its approved times — this wakes
                  the GPU <strong>out of schedule</strong> and processes up to 20 cards now. The model takes
                  ~6 minutes to load before processing starts.
                </p>
                <p className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-[12px]">
                  <strong>Cost warning:</strong> up to <strong>~1 hour of Cloud Run GPU time</strong> will be billed
                  to our Google Cloud account for this run. The job sleeps automatically when the queue is empty,
                  so actual billing is often less.
                </p>
                <p className="text-[11px]">
                  Only one batch runs at a time — if an execution is already active, the backend refuses to start another.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleCardRunNow()}>Wake &amp; Process Cards Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
