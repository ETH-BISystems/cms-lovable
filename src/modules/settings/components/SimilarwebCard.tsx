import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { trafficMarketService } from '@/modules/keywords';
import type { TrafficMarketStatus } from '@/modules/keywords';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { TrafficMarketSettings } from '../types';

const KEY_SOURCE_LABELS: Record<'secret-manager' | 'env', string> = {
  'secret-manager': 'Secret Manager',
  env: 'env fallback',
};

/**
 * Similarweb — Traffic & Market integration card (Settings → SEO API tab).
 *
 * Self-contained: fetches its own key status via trafficMarket_status and
 * stores keys via trafficMarket_setApiKey (admin-only callable; keys go to
 * Google Secret Manager, never Firestore). The sample-data flag lives at
 * settings/trafficMarket.useSampleData and is saved through the standard
 * settingsUpdate path ('trafficMarket' is not editor-writable → admin-only).
 */
export function SimilarwebCard() {
  const { canWrite, isAdmin } = useSettingsPermissions();
  const canWriteSampleMode = canWrite('trafficMarket');

  // Key status (from the trafficMarket_status callable)
  const [status, setStatus] = useState<TrafficMarketStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<Error | null>(null);

  // Set-key form (admin only)
  const [keyInput, setKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Connection test (any role)
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Sample-data mode (settings/trafficMarket.useSampleData)
  const { data: tmSettings, loading: settingsLoading, save } = useSettings<TrafficMarketSettings>('trafficMarket');
  const [savingSampleMode, setSavingSampleMode] = useState(false);
  const sampleMode = tmSettings?.useSampleData ?? false;

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const s = await trafficMarketService.status({});
      setStatus(s);
    } catch (err) {
      setStatusError(err instanceof Error ? err : new Error('Failed to load Similarweb status'));
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleSaveKey = async () => {
    const apiKey = keyInput.trim();
    if (!apiKey) return;
    setSavingKey(true);
    try {
      const result = await trafficMarketService.setApiKey({ apiKey });
      toast.success('Similarweb API key saved', {
        description: `${result.message} Traffic & Market pages activate within ~5 minutes (backend status cache).`,
      });
      setKeyInput('');
      setTestResult(null);
      await fetchStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save API key.';
      toast.error('Could not save Similarweb API key', { description: message });
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const s = await trafficMarketService.status({ test: true });
      setStatus(s);
      // Backend omits `connection` when no key is configured.
      setTestResult(s.connection ?? { ok: false, message: 'No key configured' });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSampleModeChange = async (checked: boolean) => {
    setSavingSampleMode(true);
    try {
      await save({ useSampleData: checked });
    } catch {
      // useSettings.save already surfaced the error toast.
    } finally {
      setSavingSampleMode(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-card-foreground">Similarweb — Traffic &amp; Market</h3>
        {!statusLoading && !statusError && (
          status?.keyConfigured ? (
            <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10">Connected</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Disabled — no API key</Badge>
          )
        )}
      </div>
      <div className="px-5 py-4 space-y-4">
        {statusLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-5 w-48" />
          </div>
        ) : statusError ? (
          <div className="flex items-center gap-3">
            <p className="text-[12px] text-destructive">Failed to load Similarweb status: {statusError.message}</p>
            <Button variant="outline" size="sm" className="text-[12px]" onClick={() => void fetchStatus()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Status line */}
            <div className="flex flex-wrap items-center gap-2">
              {status?.keyConfigured ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-[12px]">
                {status?.keyConfigured ? 'API key configured' : 'No API key configured'}
              </span>
              {status?.keySource && (
                <Badge variant="outline" className="text-[10px]">
                  Source: {KEY_SOURCE_LABELS[status.keySource]}
                </Badge>
              )}
              {sampleMode && (
                <Badge variant="outline" className="text-[10px]">Sample data mode</Badge>
              )}
            </div>
            {isAdmin && status?.maskedKey && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Active Key</label>
                <Input value={status.maskedKey} disabled className="text-[12px] h-8 max-w-xs font-mono" />
              </div>
            )}

            {/* Set key (admin only) */}
            {isAdmin ? (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">
                  {status?.keyConfigured ? 'Replace API Key' : 'Set API Key'}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Similarweb API key"
                    autoComplete="off"
                    disabled={savingKey}
                    className="text-[12px] h-8 max-w-xs font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[12px] gap-1.5"
                    onClick={() => void handleSaveKey()}
                    disabled={savingKey || !keyInput.trim()}
                  >
                    {savingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Verify &amp; Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Only Admins can set or replace the Similarweb API key.
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Keys are stored in Google Secret Manager — never in Firestore.</span>
            </div>

            {/* Connection test (any role) */}
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="text-[12px] gap-1.5"
                onClick={() => void handleTestConnection()}
                disabled={testing}
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Test Connection
              </Button>
              {testResult && (
                <div
                  className={
                    testResult.ok
                      ? 'flex items-center gap-2 p-3 rounded-md bg-green-500/10'
                      : 'flex items-center gap-2 p-3 rounded-md bg-destructive/10'
                  }
                >
                  {testResult.ok ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <p className="text-[12px]">{testResult.message}</p>
                </div>
              )}
            </div>

            {/* Sample data mode */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center gap-3">
                {settingsLoading ? (
                  <Skeleton className="h-5 w-10" />
                ) : (
                  <Switch
                    checked={sampleMode}
                    disabled={!canWriteSampleMode || savingSampleMode}
                    onCheckedChange={(checked) => void handleSampleModeChange(checked)}
                  />
                )}
                <span className="text-[12px] font-medium">Sample data mode</span>
                {savingSampleMode && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Serve deterministic demo data on all Traffic &amp; Market pages while no API key is configured.
                {!canWriteSampleMode && ' Only Admins can change this setting.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
