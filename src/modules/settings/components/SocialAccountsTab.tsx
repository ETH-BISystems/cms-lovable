import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Download, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  callBackfillSocialHandle,
  callZernioConnectStart,
  callZernioConnectionSync,
  callZernioDisconnect,
  timestampToDate,
} from '@/modules/experience';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { SocialAccountsSettings } from '../types';

type SocialPlatformId = SocialAccountsSettings['accounts'][number]['platform'];
type Account = SocialAccountsSettings['accounts'][number];

const ALL_PLATFORMS: SocialPlatformId[] = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook', 'linkedin', 'pinterest'];

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: 'bg-pink-500/10 text-pink-600' },
  youtube: { label: 'YouTube', color: 'bg-red-500/10 text-red-600' },
  tiktok: { label: 'TikTok', color: 'bg-gray-500/10 text-gray-600' },
  twitter: { label: 'Twitter / X', color: 'bg-blue-500/10 text-blue-600' },
  facebook: { label: 'Facebook', color: 'bg-blue-600/10 text-blue-700' },
  linkedin: { label: 'LinkedIn', color: 'bg-sky-500/10 text-sky-600' },
  pinterest: { label: 'Pinterest', color: 'bg-red-600/10 text-red-700' },
};

/** Stable row key — multiple accounts per platform are supported. */
const rowKey = (a: Account) => a.zernioAccountId ?? `${a.platform}:${a.accountName ?? 'unlinked'}`;

/**
 * Social accounts are connected via Zernio OAuth: Connect opens Zernio's
 * authorization flow in a new tab, which lands back on /zernio/callback and
 * upserts the account here. Imports (immediate backfill + daily sync) read
 * through Zernio only — an account without a live Zernio connection shows an
 * honest "Reconnect required" state instead of attempting legacy scrapes.
 */
export function SocialAccountsTab() {
  const { data, loading, error, save } = useSettings<SocialAccountsSettings>('socialAccounts');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('socialAccounts');

  const [connecting, setConnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const saved = data?.accounts || [];
  const connectedAccounts = saved.filter((a) => a.connected || a.zernioAccountId);
  // Platforms with no connected account get an empty "Connect" card.
  const unconnectedPlatforms = ALL_PLATFORMS.filter(
    (p) => !connectedAccounts.some((a) => a.platform === p && a.connected)
  );

  const startConnect = async (platform: SocialPlatformId) => {
    setConnecting(platform);
    try {
      const { authUrl } = await callZernioConnectStart({ platform });
      window.open(authUrl, '_blank', 'noopener');
      toast.info(`Authorize ${PLATFORM_META[platform]?.label} in the new tab`, {
        description: 'When it finishes, the account appears here automatically.',
      });
    } catch (err) {
      toast.error(`Could not start the ${PLATFORM_META[platform]?.label} connect flow`, {
        description: (err as Error).message,
      });
    } finally {
      setConnecting(null);
    }
  };

  const refreshFromZernio = async () => {
    setRefreshing(true);
    try {
      const res = await callZernioConnectionSync();
      toast.success('Synced with Zernio', {
        description: `${res.added} added · ${res.updated} updated${res.stale ? ` · ${res.stale} disconnected` : ''}`,
      });
    } catch (err) {
      toast.error('Zernio sync failed', { description: (err as Error).message });
    } finally {
      setRefreshing(false);
    }
  };

  const startBackfill = (account: Account) => {
    const key = rowKey(account);
    setBackfilling((prev) => ({ ...prev, [key]: true }));
    toast.info(`Importing recent posts from ${account.accountName}…`, {
      description: 'This runs in the background — results appear on the account card.',
    });
    callBackfillSocialHandle({
      platform: (account.platform === 'twitter' ? 'x-twitter' : account.platform) as Parameters<typeof callBackfillSocialHandle>[0]['platform'],
      handle: account.accountName ?? undefined,
      brand: account.brand,
    })
      .then((res) => {
        if (res.errors.length > 0) {
          toast.warning(`${PLATFORM_META[account.platform]?.label} import finished with issues`, {
            description: res.errors[0],
          });
        } else {
          toast.success(`${PLATFORM_META[account.platform]?.label} backfill complete`, {
            description: `${res.imported} posts imported · ${res.skipped} already in the library`,
          });
        }
      })
      .catch((err) => {
        toast.error(`${PLATFORM_META[account.platform]?.label} backfill failed`, {
          description: (err as Error).message,
        });
      })
      .finally(() => setBackfilling((prev) => ({ ...prev, [key]: false })));
  };

  const handleDisconnect = async (account: Account) => {
    const key = rowKey(account);
    setDisconnecting(key);
    try {
      if (account.zernioAccountId) {
        await callZernioDisconnect({ zernioAccountId: account.zernioAccountId });
        toast.success(`${account.accountName ?? PLATFORM_META[account.platform]?.label} disconnected`, {
          description: 'Imported posts stay in the Experience Library.',
        });
      } else {
        // Legacy entry with no Zernio connection — just clear it locally.
        const next = saved.map((a) =>
          rowKey(a) === key
            ? { ...a, connected: false, accountName: null, connectedAt: null, lastImportStatus: null }
            : a
        );
        await save({ accounts: next } as Partial<SocialAccountsSettings>);
      }
    } catch (err) {
      toast.error('Disconnect failed', { description: (err as Error).message });
    } finally {
      setDisconnecting(null);
    }
  };

  const handleBrandChange = async (account: Account, brand: string) => {
    const key = rowKey(account);
    const next = saved.map((a) => (rowKey(a) === key ? { ...a, brand } : a));
    await save({ accounts: next } as Partial<SocialAccountsSettings>);
  };

  const renderStatus = (account: Account) => {
    const status = account.lastImportStatus;
    if (!status) return null;
    const startedAt = timestampToDate(status.at);
    if (status.status === 'running' && startedAt && Date.now() - startedAt.getTime() < 15 * 60_000) {
      return (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Importing recent posts…
        </p>
      );
    }
    if (status.errors.length > 0) {
      return (
        <p className="text-[10px] text-destructive flex items-start gap-1 mt-1" title={status.errors.join('\n')}>
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Last import: {status.imported} imported · {status.errors.length} error{status.errors.length > 1 ? 's' : ''} — {status.errors[0]}
          </span>
        </p>
      );
    }
    return (
      <p className="text-[10px] text-muted-foreground mt-1">
        Last import: {status.imported} imported · {status.skipped} already in library
        {startedAt ? ` · ${startedAt.toLocaleDateString()}` : ''}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] text-muted-foreground">
          Connected accounts feed the Experience Library. Connecting runs a Zernio OAuth flow in a
          new tab — once authorized, the account's recent posts are imported and the daily sync
          keeps it topped up. Only accounts connected here can be imported or embedded, and any
          Zernio failure is shown verbatim on the account card.
        </p>
        {!readOnly && (
          <Button variant="outline" size="sm" className="h-7 text-[11px] shrink-0" disabled={refreshing} onClick={refreshFromZernio}>
            {refreshing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Refresh from Zernio
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectedAccounts.map((account) => {
          const key = rowKey(account);
          const meta = PLATFORM_META[account.platform] || { label: account.platform, color: 'bg-muted text-muted-foreground' };
          const zernioReady = !!account.zernioAccountId && !account.needsReconnection;
          return (
            <div key={key} className="bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={cn('text-[10px]', meta.color)}>{meta.label}</Badge>
                {account.connected && zernioReady ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  {account.zernioProfilePicture && (
                    <img src={account.zernioProfilePicture} alt="" className="h-5 w-5 rounded-full" />
                  )}
                  <p className="text-[12px] font-medium truncate">{account.accountName ?? 'Unknown account'}</p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Connected {timestampToDate(account.connectedAt)?.toLocaleDateString() ?? ''}
                </p>
              </div>

              {/* Brand assignment */}
              {!readOnly && (
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground">Brand</p>
                  <Select value={account.brand ?? 'EPM'} onValueChange={(v) => handleBrandChange(account, v)}>
                    <SelectTrigger className="h-6 text-[10px] w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EPM" className="text-xs">EPM — Elite Points &amp; Miles</SelectItem>
                      <SelectItem value="CC" className="text-xs">CC — Counting Countries</SelectItem>
                      <SelectItem value="JF" className="text-xs">JF — Justin Froeber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {account.connected && !zernioReady && (
                <p className="text-[10px] text-amber-600 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    {account.needsReconnection
                      ? 'The Zernio authorization expired — reconnect to resume imports.'
                      : 'This account predates Zernio — reconnect it to enable imports.'}
                  </span>
                </p>
              )}

              {account.connected && zernioReady && renderStatus(account)}
              {backfilling[key] && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Importing recent posts…
                </p>
              )}

              {!readOnly && (
                <div className="flex items-center gap-1 pt-1">
                  {account.connected && !zernioReady && (
                    <Button
                      variant="outline" size="sm" className="h-7 text-[11px]"
                      disabled={connecting === account.platform}
                      onClick={() => startConnect(account.platform)}
                    >
                      {connecting === account.platform ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                      Reconnect via Zernio
                    </Button>
                  )}
                  {account.connected && zernioReady && (
                    <Button
                      variant="ghost" size="sm" className="h-7 text-[11px]"
                      disabled={!!backfilling[key]}
                      onClick={() => startBackfill(account)}
                    >
                      <Download className="h-3 w-3 mr-1" /> Import now
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" className="h-7 text-[11px] text-destructive"
                    disabled={disconnecting === key}
                    onClick={() => handleDisconnect(account)}
                  >
                    {disconnecting === key ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {unconnectedPlatforms.map((platform) => {
          const meta = PLATFORM_META[platform];
          return (
            <div key={platform} className="bg-card rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={cn('text-[10px]', meta.color)}>{meta.label}</Badge>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">Not connected</p>
              {!readOnly && (
                <Button
                  variant="outline" size="sm" className="text-[11px] h-7"
                  disabled={connecting === platform}
                  onClick={() => startConnect(platform)}
                >
                  {connecting === platform ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                  Connect with Zernio
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
