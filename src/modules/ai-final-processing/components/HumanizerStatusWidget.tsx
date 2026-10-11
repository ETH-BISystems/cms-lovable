/**
 * Humanizer Status Widget — the GLOBAL out-of-schedule switch for the Gemma 4
 * humanizer, surfaced on the Dashboard (business request 2026-09-10).
 *
 * The scheduler only wakes the GPU at its approved cadence times (e.g. 08:00 +
 * 20:00 Australia/Melbourne); work queued outside those windows stalls. This
 * widget gives the team:
 *   1. a live runner indicator (running vs sleeping),
 *   2. the next scheduled ON times rendered in multiple timezones (configured
 *      schedule timezone, the viewer's local timezone, and UTC) so people in
 *      different locations can plan their work — the runner switches OFF by
 *      itself when both queues drain (typical duration shown from telemetry),
 *   3. one "Run Humanizer Now" button with an explicit cost-warning popup —
 *      it wakes the GPU out of schedule and drains BOTH the article pipeline
 *      queue and the card scraper humanisation queue in real time (a single
 *      batch execution processes articles, then cards — same as a scheduled
 *      run). Admin-only, matching the aiFinalProcessingRunNow callable.
 */

import { useMemo, useState } from 'react';
import { Link } from '@/lib/router-compat';
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
import { ArrowRight, Bot, CircleDollarSign, Loader2, Moon, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import { useAiFinalProcessingStatus } from '../hooks/useAiFinalProcessingStatus';
import { runNow } from '../services/aiFinalProcessingService';

/** "Melbourne" from "Australia/Melbourne". */
function zoneCity(iana: string): string {
  const city = iana.split('/').pop() ?? iana;
  return city.replace(/_/g, ' ');
}

/** Short zone abbreviation (AEST, PDT, UTC…) for a zone at a given instant. */
function zoneAbbr(iso: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', { timeZoneName: 'short', timeZone }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

function timeInZone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
}

/** today / tomorrow / weekday — in the TARGET zone, not the viewer's. */
function dayInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const dayFmt = (x: Date) => x.toLocaleDateString('en-AU', { timeZone });
  if (dayFmt(d) === dayFmt(new Date())) return 'today';
  if (dayFmt(d) === dayFmt(new Date(Date.now() + 86_400_000))) return 'tomorrow';
  return d.toLocaleDateString('en-AU', { weekday: 'short', timeZone });
}

function formatElapsed(startedAt: string | null | undefined): string {
  if (!startedAt) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000));
  if (mins < 1) return 'just started';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function HumanizerStatusWidget() {
  const { role } = useAuth();
  const isAdmin = role === Role.Admin;
  const { data, loading, error, running, refresh } = useAiFinalProcessingStatus();
  const [confirmRun, setConfirmRun] = useState(false);
  const [starting, setStarting] = useState(false);

  const viewerZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const runningExecution = data?.recentExecutions.find((e) => e.status === 'running');
  const settings = data?.settings;
  const scheduleZone = settings?.timezone ?? 'Australia/Melbourne';
  const queuedTotal = (data?.queued ?? 0) + (data?.cardsQueued ?? 0);

  // One row per timezone: the schedule zone, the viewer's zone (when different),
  // and UTC — so distributed teammates read the same instant their own way.
  const zoneRows = useMemo(() => {
    const rows: Array<{ key: string; label: string; zone: string }> = [
      { key: 'schedule', label: `${zoneCity(scheduleZone)} (schedule)`, zone: scheduleZone },
    ];
    if (viewerZone !== scheduleZone) {
      rows.push({ key: 'local', label: `${zoneCity(viewerZone)} (you)`, zone: viewerZone });
    }
    rows.push({ key: 'utc', label: 'UTC', zone: 'UTC' });
    return rows;
  }, [scheduleZone, viewerZone]);

  const handleRunNow = async () => {
    setConfirmRun(false);
    setStarting(true);
    try {
      const res = await runNow();
      if (res.started) {
        toast.success('Humanizer started', { description: res.message });
      } else {
        toast.info('Nothing to process', { description: res.message });
      }
      await refresh();
    } catch (err) {
      toast.error('Could not start the humanizer', { description: (err as Error).message });
    } finally {
      setStarting(false);
    }
  };

  if (error) {
    // Keep the page intact, but NEVER vanish silently — a missing section is
    // undiagnosable (2026-09-10: a missing composite index made the callable
    // throw and the widget hid itself; only a curl exposed it).
    return (
      <section>
        <h2 className="text-[16px] font-semibold text-foreground mb-3">AI Humanizer (Gemma 4)</h2>
        <div className="bg-card rounded-xl border border-border/70 shadow-card px-5 py-3">
          <p className="text-[12px] text-muted-foreground">
            Humanizer status is temporarily unavailable — the scheduled runs are unaffected. ({error.message})
          </p>
        </div>
      </section>
    );
  }

  const avgRunMins = data?.telemetry.avgDurationSeconds != null
    ? Math.max(1, Math.round(data.telemetry.avgDurationSeconds / 60))
    : null;
  const scheduled = settings && settings.cadence !== 'per_article' && settings.cadence !== 'paused';

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16px] font-semibold text-foreground">AI Humanizer (Gemma 4)</h2>
        <Link to="/settings?tab=ai-final-processing" className="group inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline underline-offset-4">
          Open AI Final Processing <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="bg-card rounded-xl border border-border/70 shadow-card p-5">
        {loading || !data || !settings ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking humanizer status…
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-5">
            {/* Runner state + queues */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-accent" />
                </div>
                {running ? (
                  <Badge variant="default" className="text-[11px] gap-1.5 bg-success text-success-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                    </span>
                    Runner ON — started {formatElapsed(runningExecution?.startedAt)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px] gap-1.5">
                    <Moon className="h-3 w-3" /> Runner OFF (sleeping)
                  </Badge>
                )}
                {!settings.enabled && (
                  <Badge variant="outline" className="text-[10px]">Publish gate disabled</Badge>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">
                <span className="font-medium text-card-foreground tabular-nums">{data.queued}</span> article{data.queued === 1 ? '' : 's'}
                {' · '}
                <span className="font-medium text-card-foreground tabular-nums">{data.cardsQueued}</span> card{data.cardsQueued === 1 ? '' : 's'} queued for humanising.
                {avgRunMins != null && (
                  <> A run typically takes ~{avgRunMins} min, then the runner switches off automatically.</>
                )}
              </p>

              {/* Schedule across timezones */}
              <div className="mt-3 border border-border/60 rounded-lg overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40">
                      <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">Timezone</th>
                      <th className="text-left py-1.5 px-3 text-muted-foreground font-medium">
                        {scheduled ? 'Next switch-on' : 'Schedule'}
                      </th>
                      {scheduled && (data.nextRuns ?? []).length > 1 && (
                        <th className="text-left py-1.5 px-3 text-muted-foreground font-medium hidden sm:table-cell">Then</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {zoneRows.map((row) => (
                      <tr key={row.key} className="border-b border-border/40 last:border-0">
                        <td className="py-1.5 px-3 text-muted-foreground whitespace-nowrap">{row.label}</td>
                        {!scheduled ? (
                          <td className="py-1.5 px-3" colSpan={2}>
                            <span className="text-muted-foreground">
                              {settings.cadence === 'per_article'
                                ? 'Runs on article approval (per-article cadence)'
                                : 'Scheduled runs paused — manual Run Now only'}
                            </span>
                          </td>
                        ) : data.nextRuns.length === 0 ? (
                          <td className="py-1.5 px-3 text-muted-foreground" colSpan={2}>—</td>
                        ) : (
                          <>
                            <td className="py-1.5 px-3 whitespace-nowrap">
                              <span className="font-medium text-card-foreground tabular-nums">
                                {timeInZone(data.nextRuns[0], row.zone)} {zoneAbbr(data.nextRuns[0], row.zone)}
                              </span>
                              <span className="text-muted-foreground"> {dayInZone(data.nextRuns[0], row.zone)}</span>
                            </td>
                            {data.nextRuns.length > 1 && (
                              <td className="py-1.5 px-3 whitespace-nowrap hidden sm:table-cell">
                                <span className="font-medium text-card-foreground tabular-nums">
                                  {timeInZone(data.nextRuns[1], row.zone)} {zoneAbbr(data.nextRuns[1], row.zone)}
                                </span>
                                <span className="text-muted-foreground"> {dayInZone(data.nextRuns[1], row.zone)}</span>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {scheduled && data.scheduleTimes.length > 0 && (
                  <p className="text-[10px] text-muted-foreground px-3 py-1.5 border-t border-border/40">
                    Repeats daily at {data.scheduleTimes.join(' + ')} ({zoneCity(scheduleZone)}); the runner switches
                    off by itself once both queues are empty.
                  </p>
                )}
              </div>
            </div>

            {/* Global wake action */}
            <div className="lg:w-56 shrink-0 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-border/60 pt-4 lg:pt-0 lg:pl-5">
              <Button
                className="w-full gap-1.5"
                disabled={!isAdmin || running || starting || queuedTotal === 0}
                onClick={() => setConfirmRun(true)}
                title={
                  !isAdmin
                    ? 'Admins only'
                    : running
                      ? 'The runner is already on'
                      : queuedTotal === 0
                        ? 'Both queues are empty'
                        : 'Wake the GPU and process both queues now (billed)'
                }
              >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {running ? 'Runner is ON' : 'Run Humanizer Now'}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                {!isAdmin
                  ? 'Only admins can wake the runner out of schedule.'
                  : running
                    ? 'Processing — this page updates live.'
                    : queuedTotal === 0
                      ? 'Nothing queued right now.'
                      : 'Out-of-schedule run — processes articles + cards now.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cost-warning confirmation */}
      <AlertDialog open={confirmRun} onOpenChange={setConfirmRun}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4" /> Start the humanizer now — billed GPU time
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This wakes the Gemma 4 GPU runner <strong>outside its scheduled window</strong> and processes
                  both queues in real time: <strong>{data?.queued ?? 0} article(s)</strong> from the pipeline and{' '}
                  <strong>{data?.cardsQueued ?? 0} card(s)</strong> of scraper prose.
                </p>
                <p className="rounded-md bg-warning/10 text-warning-foreground border border-warning/30 px-3 py-2 text-[12px]">
                  <strong>Cost warning:</strong> up to <strong>~1 hour of Cloud Run GPU time</strong> will be billed
                  to our Google Cloud account for this run. The model alone takes ~6 minutes to load before
                  processing starts. The runner switches off automatically as soon as both queues are empty, so
                  actual billing is often less than the full hour.
                </p>
                <p className="text-[11px]">
                  Only one execution runs at a time — if the runner is already on, the backend refuses a second start.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRunNow()}>Yes — bill ~1 hr &amp; Run Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
