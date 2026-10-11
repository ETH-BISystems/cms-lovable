import { useState } from 'react';
import { AlertTriangle, AtSign, Download, Eye, Link2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSettings, type SocialAccountsSettings } from '@/modules/settings';
import { callBackfillSocialHandle, callRemoveSocialHandle, callZernioConnectStart } from '../services/experienceService';
import { itemMatchesAccount, timestampToDate } from '../utils/handleMatch';
import type { ExperienceItem } from '../types';

interface ManageHandlesDialogProps {
  open: boolean;
  onClose: () => void;
  /** Every loaded experience item (unfiltered) — for per-handle stats. */
  allItems: ExperienceItem[];
  /** Called with an accountHandle value present on the items, to filter the grid. */
  onViewHandle: (handle: string) => void;
}

type SettingsPlatform = SocialAccountsSettings['accounts'][number]['platform'];
type Account = SocialAccountsSettings['accounts'][number];

const PLATFORMS: Array<{ id: SettingsPlatform; label: string; color: string }> = [
  { id: 'youtube', label: 'YouTube', color: 'bg-red-500/10 text-red-600' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-gray-500/10 text-gray-600' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500/10 text-pink-600' },
  { id: 'twitter', label: 'X / Twitter', color: 'bg-blue-500/10 text-blue-600' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-600/10 text-blue-700' },
  { id: 'linkedin', label: 'LinkedIn', color: 'bg-sky-500/10 text-sky-600' },
  { id: 'pinterest', label: 'Pinterest', color: 'bg-red-600/10 text-red-700' },
];

/** The import pipeline names X/Twitter 'x-twitter'; settings stores 'twitter'. */
const toImportPlatform = (platform: SettingsPlatform) =>
  (platform === 'twitter' ? 'x-twitter' : platform) as Parameters<typeof callBackfillSocialHandle>[0]['platform'];

const platformMeta = (id: string) =>
  PLATFORMS.find((p) => p.id === id) ?? { id, label: id, color: 'bg-muted text-muted-foreground' };

/** Stable row key — multiple accounts per platform are supported. */
const rowKey = (a: Account) => a.zernioAccountId ?? `${a.platform}:${a.accountName ?? 'unlinked'}`;

/**
 * Handle management centre for the Experience Library: every connected
 * account with its imported / linked / unlinked counts and last import
 * outcome, view-its-posts filtering, on-demand re-import, removal (deletes
 * all imported items), and the Connect-with-Zernio flow. Accounts are
 * connected via Zernio OAuth — only Zernio-connected accounts can import.
 */
export function ManageHandlesDialog({ open, onClose, allItems, onViewHandle }: ManageHandlesDialogProps) {
  const { data, loading } = useSettings<SocialAccountsSettings>('socialAccounts');

  // Connect flow state
  const [connectPlatform, setConnectPlatform] = useState<SettingsPlatform>('youtube');
  const [connecting, setConnecting] = useState(false);

  // Per-row action state
  const [importing, setImporting] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const connected = (data?.accounts || []).filter((a) => a.connected && a.accountName);

  const statsFor = (account: Account) => {
    const matched = allItems.filter((i) => itemMatchesAccount(i, account));
    const linked = matched.filter((i) => i.attachedArticles.length > 0).length;
    return { matched, imported: matched.length, linked, unlinked: matched.length - linked };
  };

  const startConnect = async (platform: SettingsPlatform) => {
    setConnecting(true);
    try {
      const { authUrl } = await callZernioConnectStart({ platform });
      window.open(authUrl, '_blank', 'noopener');
      toast.info(`Authorize ${platformMeta(platform).label} in the new tab`, {
        description: 'When it finishes, the account appears here and its recent posts import automatically.',
      });
    } catch (err) {
      toast.error(`Could not start the ${platformMeta(platform).label} connect flow`, {
        description: (err as Error).message,
      });
    } finally {
      setConnecting(false);
    }
  };

  const startBackfill = (acc: Account) => {
    const key = rowKey(acc);
    const label = platformMeta(acc.platform).label;
    setImporting(key);
    toast.info(`Importing recent posts from ${acc.accountName}…`, {
      description: 'Keep this page open — the result shows here and posts appear as they land.',
    });
    callBackfillSocialHandle({
      platform: toImportPlatform(acc.platform),
      handle: acc.accountName ?? undefined,
      brand: acc.brand,
    })
      .then((res) => {
        if (res.errors.length > 0) {
          toast.warning(`${label} import finished with issues`, { description: res.errors[0] });
        } else {
          toast.success(`${label} import complete`, {
            description: `${res.imported} posts imported · ${res.skipped} already in the library`,
          });
        }
      })
      .catch((err) => toast.error(`${label} import failed`, { description: (err as Error).message }))
      .finally(() => setImporting(null));
  };

  const handleRemove = async (acc: Account) => {
    const key = rowKey(acc);
    const label = platformMeta(acc.platform).label;
    setRemoving(key);
    try {
      const res = await callRemoveSocialHandle({ platform: acc.platform, handle: acc.accountName! });
      toast.success(`${acc.accountName} removed`, {
        description: `${res.deletedCount} imported item${res.deletedCount === 1 ? '' : 's'} deleted · ${res.articlesUpdated} article${res.articlesUpdated === 1 ? '' : 's'} updated`,
      });
      if (res.errors.length > 0) {
        toast.warning(`${label} removal finished with issues`, { description: res.errors[0] });
      }
    } catch (err) {
      toast.error(`Failed to remove ${acc.accountName}`, { description: (err as Error).message });
    } finally {
      setRemoving(null);
      setConfirmingRemove(null);
    }
  };

  const renderStatus = (acc: Account) => {
    const status = acc.lastImportStatus;
    const startedAt = status ? timestampToDate(status.at) : null;
    // A persisted 'running' status survives page reloads and dropped
    // connections; if it's been stuck for over 15 minutes the run was killed.
    const runningServerSide =
      status?.status === 'running' && startedAt !== null && Date.now() - startedAt.getTime() < 15 * 60_000;
    if (importing === rowKey(acc) || runningServerSide) {
      return (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Import in progress — posts appear in the
          library as they land.
        </p>
      );
    }
    if (!status) return <p className="text-[10px] text-muted-foreground">No import has run yet.</p>;
    if (status.status === 'running') {
      return (
        <p className="text-[10px] text-destructive flex items-start gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            An import started{startedAt ? ` ${startedAt.toLocaleString()}` : ''} but never finished —
            it was likely cut off. Try Import now again.
          </span>
        </p>
      );
    }
    if (status.errors.length > 0) {
      return (
        <p className="text-[10px] text-destructive flex items-start gap-1" title={status.errors.join('\n')}>
          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Last import: {status.imported} imported · {status.errors.length} error{status.errors.length > 1 ? 's' : ''} — {status.errors[0]}
          </span>
        </p>
      );
    }
    const finishedAt = timestampToDate(status.at);
    return (
      <p className="text-[10px] text-muted-foreground">
        Last import: {status.imported} imported · {status.skipped} already in library
        {finishedAt ? ` · ${finishedAt.toLocaleDateString()}` : ''}
      </p>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AtSign className="w-4 h-4" /> Social Handles
          </DialogTitle>
          <DialogDescription>
            Every connected account feeding the Experience Library — how much it has imported,
            what's linked to articles, and its last import outcome. Accounts connect via Zernio
            OAuth; removing an account deletes all its imported posts and their article attachments.
          </DialogDescription>
        </DialogHeader>

        {/* Connected accounts — min-w-0 keeps rows inside the grid dialog */}
        <div className="space-y-2 min-w-0">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
          ) : connected.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              No accounts connected yet — connect one below and its recent posts import automatically.
            </p>
          ) : (
            connected.map((acc) => {
              const key = rowKey(acc);
              const meta = platformMeta(acc.platform);
              const stats = statsFor(acc);
              const busy = removing === key || importing === key;
              const zernioReady = !!acc.zernioAccountId && !acc.needsReconnection;
              // The grid filter matches on the items' accountHandle value,
              // which platform metadata sometimes writes differently from the
              // typed handle — use the most common value among matched items.
              const viewHandle = (() => {
                const counts = new Map<string, number>();
                for (const i of stats.matched) {
                  if (i.accountHandle) counts.set(i.accountHandle, (counts.get(i.accountHandle) || 0) + 1);
                }
                return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
              })();
              return (
                <div key={key} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge className={cn('text-[10px] shrink-0', meta.color)}>{meta.label}</Badge>
                      {acc.zernioProfilePicture && (
                        <img src={acc.zernioProfilePicture} alt="" className="h-4 w-4 rounded-full shrink-0" />
                      )}
                      <span className="text-[12px] font-medium truncate">{acc.accountName}</span>
                      {acc.brand && <span className="text-[10px] text-muted-foreground shrink-0">{acc.brand}</span>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm" className="h-7 text-[10px]"
                        disabled={busy || !viewHandle}
                        title={viewHandle ? `Show everything from ${acc.accountName}` : 'Nothing imported yet'}
                        onClick={() => viewHandle && onViewHandle(viewHandle)}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      {zernioReady ? (
                        <Button
                          variant="ghost" size="sm" className="h-7 text-[10px]"
                          disabled={busy}
                          onClick={() => startBackfill(acc)}
                        >
                          <Download className="w-3 h-3 mr-1" /> Import now
                        </Button>
                      ) : (
                        <Button
                          variant="ghost" size="sm" className="h-7 text-[10px]"
                          disabled={busy || connecting}
                          title={acc.needsReconnection
                            ? 'The Zernio authorization expired — reconnect to resume imports'
                            : 'This account predates Zernio — reconnect to enable imports'}
                          onClick={() => void startConnect(acc.platform)}
                        >
                          <Link2 className="w-3 h-3 mr-1" /> Reconnect
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="sm" className="h-7 text-[10px] text-destructive"
                        disabled={busy}
                        onClick={() => setConfirmingRemove(key)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span><span className="font-semibold text-foreground">{stats.imported}</span> imported</span>
                    <span><span className="font-semibold text-success">{stats.linked}</span> linked to articles</span>
                    <span><span className="font-semibold text-foreground">{stats.unlinked}</span> not linked</span>
                  </div>

                  {!zernioReady && (
                    <p className="text-[10px] text-amber-600 flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>
                        {acc.needsReconnection
                          ? 'The Zernio authorization expired — reconnect to resume imports.'
                          : 'This account predates Zernio — reconnect it to enable imports.'}
                      </span>
                    </p>
                  )}

                  {renderStatus(acc)}

                  {confirmingRemove === key && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-destructive">
                        Remove {acc.accountName} and permanently delete its {stats.imported} imported item{stats.imported === 1 ? '' : 's'}?
                        {stats.linked > 0 ? ` ${stats.linked} article attachment${stats.linked === 1 ? '' : 's'} will be detached.` : ''}
                        {' '}The account is also disconnected at Zernio.
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="destructive" size="sm" className="h-7 text-[10px]"
                          disabled={removing === key}
                          onClick={() => handleRemove(acc)}
                        >
                          {removing === key
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Deleting…</>
                            : 'Delete everything'}
                        </Button>
                        <Button
                          variant="outline" size="sm" className="h-7 text-[10px]"
                          disabled={removing === key}
                          onClick={() => setConfirmingRemove(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Connect a new account */}
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-[12px] font-semibold">Connect an account</p>
          <p className="text-[11px] text-muted-foreground -mt-2">
            Connecting runs a Zernio authorization in a new tab. Once authorized, the account's
            recent posts import automatically and the daily sync keeps it topped up. Only connected
            accounts can be imported.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Platform</p>
              <Select value={connectPlatform} onValueChange={(v) => setConnectPlatform(v as SettingsPlatform)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="h-8 text-xs w-full" onClick={() => void startConnect(connectPlatform)} disabled={connecting}>
                {connecting
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting…</>
                  : <><Link2 className="w-3.5 h-3.5 mr-1.5" /> Connect with Zernio</>}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
