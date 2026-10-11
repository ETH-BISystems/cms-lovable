import { useEffect, useRef, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { callBackfillSocialHandle, callZernioConnectionSync } from '../services/experienceService';

type Phase =
  | { kind: 'syncing' }
  | { kind: 'done'; connected: string[]; backfills: number }
  | { kind: 'error'; message: string };

/**
 * Landing route for the Zernio OAuth connect flow. Zernio redirects the
 * browser here after the user authorizes (standard mode — Zernio hosts any
 * Page/org/board selection upstream). This page reconciles
 * settings/socialAccounts with Zernio, kicks off a backfill for each newly
 * connected account, and reports the outcome so the user can close the tab.
 */
export function ZernioCallbackPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'syncing' });
  // The effect must run exactly once — React 18 StrictMode double-invokes
  // effects in dev, which would fire two syncs/backfills.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await callZernioConnectionSync();
        const fresh = res.accounts.filter((a) => a.isNew && a.connected && !a.needsReconnection);
        const connectedNames = res.accounts
          .filter((a) => a.connected)
          .map((a) => a.accountName ?? a.platform);

        // Auto-backfill newly connected accounts — fire and report; each
        // callable records its own honest outcome in import-runs.
        let backfills = 0;
        await Promise.allSettled(
          fresh.map((a) => {
            backfills++;
            return callBackfillSocialHandle({
              platform: (a.platform === 'twitter' ? 'x-twitter' : a.platform) as Parameters<typeof callBackfillSocialHandle>[0]['platform'],
              handle: a.accountName ?? undefined,
            });
          })
        );

        setPhase({ kind: 'done', connected: connectedNames, backfills });
      } catch (err) {
        setPhase({ kind: 'error', message: (err as Error).message });
      }
    })();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-24 rounded-lg border border-border bg-card p-6 space-y-4 text-center">
      {phase.kind === 'syncing' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <h1 className="text-[15px] font-semibold">Finishing the connection…</h1>
          <p className="text-[12px] text-muted-foreground">
            Linking your social account and starting the first import.
          </p>
        </>
      )}

      {phase.kind === 'done' && (
        <>
          <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
          <h1 className="text-[15px] font-semibold">Account connected</h1>
          {phase.connected.length > 0 ? (
            <p className="text-[12px] text-muted-foreground">
              Linked: {phase.connected.join(', ')}.
              {phase.backfills > 0 &&
                ` The first import ${phase.backfills === 1 ? 'is' : 's are'} running — posts appear in the Experience Library as they land.`}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No new accounts were linked. If you expected one, check Settings → Social Accounts and
              use "Refresh from Zernio".
            </p>
          )}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button asChild size="sm" className="h-8 text-xs">
              <Link to="/settings">Back to Settings</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link to="/experience">Open Experience Library</Link>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">You can close this tab.</p>
        </>
      )}

      {phase.kind === 'error' && (
        <>
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
          <h1 className="text-[15px] font-semibold">Connection sync failed</h1>
          <p className="text-[12px] text-destructive break-words">{phase.message}</p>
          <p className="text-[11px] text-muted-foreground">
            The account may still have connected at Zernio — open Settings → Social Accounts and use
            "Refresh from Zernio" to pull it in.
          </p>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to="/settings">Back to Settings</Link>
          </Button>
        </>
      )}
    </div>
  );
}
