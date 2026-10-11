/**
 * GoogleDriveTab Component
 *
 * Google Drive source tab inside the Asset Library upload dialog.
 *
 * Workspace-wide connection model: one staff member connects her Google
 * Drive once (OAuth, drive.readonly); after that every CMS user can browse
 * and import from it. The refresh token lives in Secret Manager server-side
 * and never reaches the browser — thumbnails render through a signed proxy.
 *
 * Flow: connection state (unconfigured → connect CTA → connected) → folder
 * browser with breadcrumbs + shared-with-me → multi-select images/folders →
 * bulk import with per-file results → imported assets land in the library
 * (parent selects them for follow-up tagging).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen, Folder, Check, X, ChevronRight, Search, Upload, Settings,
  Loader2, AlertTriangle, RefreshCw, Unlink, HardDrive, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import { Role } from '@/platform/types/roles';
import {
  getGoogleDriveStatus,
  getGoogleDriveAuthUrl,
  listGoogleDriveFiles,
  importFromGoogleDrive,
  disconnectGoogleDrive,
} from '../services/googleDriveService';
import type {
  GoogleDriveConnection,
  GoogleDriveFile,
  GoogleDriveImportResult,
} from '../types';

/** Server-side per-call cap (googleDriveImport) — the client chunks to it. */
const IMPORT_CHUNK_SIZE = 50;

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Crumb {
  id: string | null;
  name: string;
}

const ROOT_CRUMB: Crumb = { id: null, name: 'My Drive' };
const SHARED_CRUMB: Crumb = { id: 'sharedWithMe', name: 'Shared with me' };

type Phase = 'loading' | 'unconfigured' | 'disconnected' | 'connected';

export interface GoogleDriveTabProps {
  /** Called with the created asset ids after a successful import. */
  onImportComplete?: (assetIds: string[]) => void;
}

export function GoogleDriveTab({ onImportComplete }: GoogleDriveTabProps) {
  const { role } = useAuth();
  const isAdmin = role === Role.Admin;

  const [phase, setPhase] = useState<Phase>('loading');
  const [connection, setConnection] = useState<GoogleDriveConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [crumbs, setCrumbs] = useState<Crumb[]>([ROOT_CRUMB]);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [selectedFiles, setSelectedFiles] = useState<Map<string, GoogleDriveFile>>(new Map());
  const [selectedFolders, setSelectedFolders] = useState<Map<string, GoogleDriveFile>>(new Map());

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GoogleDriveImportResult | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentFolder = crumbs[crumbs.length - 1];

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  // ── Connection status ────────────────────────────────────────────────────

  const refreshStatus = useCallback(async (quiet = false): Promise<GoogleDriveConnection | null> => {
    try {
      const status = await getGoogleDriveStatus();
      setConnection(status);
      if (!status.configured) setPhase('unconfigured');
      else if (!status.connected) setPhase('disconnected');
      else setPhase('connected');
      return status;
    } catch (err) {
      if (!quiet) {
        console.error('Drive status error:', err);
        toast.error('Could not check the Google Drive connection');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // ── Folder listing ───────────────────────────────────────────────────────

  const loadFolder = useCallback(async (folder: Crumb, search: string, pageToken: string | null = null) => {
    setListLoading(true);
    setListError(null);
    try {
      const result = await listGoogleDriveFiles({
        folderId: folder.id,
        query: search || null,
        pageToken,
      });
      setFiles((prev) => (pageToken ? [...prev, ...result.files] : result.files));
      setNextPageToken(result.nextPageToken);
    } catch (err) {
      console.error('Drive list error:', err);
      setListError((err as Error).message || 'Failed to load this folder');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'connected') {
      loadFolder(currentFolder, activeSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentFolder.id, activeSearch]);

  const navigateTo = (crumb: Crumb) => {
    setCrumbs((prev) => [...prev, crumb]);
    setFiles([]);
    setNextPageToken(null);
    setSearchInput('');
    setActiveSearch('');
    setImportResult(null);
  };

  const navigateBack = (index: number) => {
    setCrumbs((prev) => prev.slice(0, index + 1));
    setFiles([]);
    setNextPageToken(null);
    setImportResult(null);
  };

  // ── Connect / disconnect ─────────────────────────────────────────────────

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { authUrl } = await getGoogleDriveAuthUrl();
      const popup = window.open(authUrl, 'google-drive-connect', 'width=640,height=760');
      if (!popup) {
        toast.error('Popup blocked — allow popups for this site and try again');
        setConnecting(false);
        return;
      }
      toast.info('Finish the Google sign-in in the popup — one connection serves the whole team.');

      // Poll until the callback stores the connection (popup redirects itself
      // to /assets?drive=connected and closes).
      const started = Date.now();
      pollTimer.current = setInterval(async () => {
        if (Date.now() - started > 3 * 60 * 1000) {
          stopPolling();
          setConnecting(false);
          return;
        }
        const status = await refreshStatus(true);
        if (status?.connected) {
          stopPolling();
          setConnecting(false);
          toast.success(`Google Drive connected${status.driveUserEmail ? ` as ${status.driveUserEmail}` : ''}`);
        }
      }, 4000);
    } catch (err) {
      console.error('Connect Drive error:', err);
      toast.error('Could not start the Google Drive connection', {
        description: (err as Error).message,
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConfirmDisconnect(false);
    setDisconnecting(true);
    try {
      await disconnectGoogleDrive();
      toast.success('Google Drive disconnected');
      setFiles([]);
      setCrumbs([ROOT_CRUMB]);
      await refreshStatus();
    } catch (err) {
      console.error('Disconnect Drive error:', err);
      toast.error('Failed to disconnect Google Drive', { description: (err as Error).message });
    } finally {
      setDisconnecting(false);
    }
  };

  // ── Selection ────────────────────────────────────────────────────────────

  const toggleFile = (file: GoogleDriveFile) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      if (next.has(file.id)) next.delete(file.id);
      else next.set(file.id, file);
      return next;
    });
  };

  const toggleFolder = (folder: GoogleDriveFile) => {
    setSelectedFolders((prev) => {
      const next = new Map(prev);
      if (next.has(folder.id)) next.delete(folder.id);
      else next.set(folder.id, folder);
      return next;
    });
  };

  const selectionCount = selectedFiles.size + selectedFolders.size;

  // ── Import ───────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (selectionCount === 0) return;
    setImporting(true);
    setImportResult(null);

    const folderIds = Array.from(selectedFolders.keys());
    const allFileIds = Array.from(selectedFiles.keys());
    // Chunk to the server-side per-call cap (googleDriveImport rejects >50).
    const chunks: string[][] = [];
    for (let i = 0; i < allFileIds.length; i += IMPORT_CHUNK_SIZE) {
      chunks.push(allFileIds.slice(i, i + IMPORT_CHUNK_SIZE));
    }
    if (chunks.length === 0) chunks.push([]);

    const aggregate: GoogleDriveImportResult = {
      imported: 0,
      failed: 0,
      skipped: 0,
      truncated: false,
      assetIds: [],
      results: [],
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        const result = await importFromGoogleDrive({
          fileIds: chunks[i],
          folderIds: i === 0 ? folderIds : undefined,
        });
        aggregate.imported += result.imported;
        aggregate.failed += result.failed;
        aggregate.skipped += result.skipped;
        aggregate.truncated = aggregate.truncated || result.truncated;
        aggregate.assetIds.push(...result.assetIds);
        aggregate.results.push(...result.results);
      }
      setImportResult(aggregate);
      if (aggregate.imported > 0) {
        toast.success(`Imported ${aggregate.imported} asset${aggregate.imported !== 1 ? 's' : ''} from Google Drive`);
      } else {
        toast.error('Nothing was imported — see the per-file results below.');
      }
    } catch (err) {
      console.error('Drive import error:', err);
      toast.error('Google Drive import failed', { description: (err as Error).message });
    } finally {
      setImporting(false);
      setSelectedFiles(new Map());
      setSelectedFolders(new Map());
    }
  };

  const handleDone = () => {
    if (importResult && importResult.assetIds.length > 0) {
      onImportComplete?.(importResult.assetIds);
    }
    setImportResult(null);
  };

  // ── Connection phases ────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">Checking Drive connection...</span>
      </div>
    );
  }

  if (phase === 'unconfigured') {
    return (
      <div className="text-center py-16 space-y-4">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Google Drive isn't set up yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            An admin needs to enter the Google Drive OAuth client ID and secret in
            Settings → API Credentials before the workspace can connect.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'disconnected') {
    return (
      <div className="text-center py-16 space-y-4">
        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Connect Google Drive</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            One staff member connects a Google Drive account once — after that, everyone on the
            team can browse and import images from it here. Access is read-only.
          </p>
          {connection?.connectionError && (
            <p className="text-xs text-amber-600 max-w-sm mx-auto">{connection.connectionError}</p>
          )}
        </div>
        <Button
          className="bg-primary text-primary-foreground"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Waiting for Google sign-in...</>
          ) : (
            <><HardDrive className="h-4 w-4 mr-2" />Connect Google Drive</>
          )}
        </Button>
      </div>
    );
  }

  // ── Import results view ──────────────────────────────────────────────────

  if (importResult) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs text-green-600 border-green-200">
            {importResult.imported} imported
          </Badge>
          {importResult.skipped > 0 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
              {importResult.skipped} skipped
            </Badge>
          )}
          {importResult.failed > 0 && (
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
              {importResult.failed} failed
            </Badge>
          )}
        </div>
        {importResult.truncated && (
          <p className="text-xs text-amber-600">
            Only the first {IMPORT_CHUNK_SIZE} files of a selection are imported per run — run the
            import again to continue with the rest.
          </p>
        )}

        <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border p-2">
          {importResult.results.map((r, i) => (
            <div key={`${r.fileId}-${i}`} className="flex items-start gap-2 text-xs py-1">
              {r.ok ? (
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <X className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${r.skipped ? 'text-amber-500' : 'text-destructive'}`} />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{r.name}</p>
                {!r.ok && r.error && <p className="text-muted-foreground">{r.error}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportResult(null)}>
            Import more
          </Button>
          <Button size="sm" onClick={handleDone} disabled={importResult.assetIds.length === 0}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ── Connected browser ────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Connected-as header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-xs text-green-600 border-green-200 shrink-0">Connected</Badge>
          <span className="text-xs text-muted-foreground truncate">
            {connection?.driveUserEmail ?? 'Google Drive'}
          </span>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDisconnect(true)}
            disabled={disconnecting}
          >
            {disconnecting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Unlink className="h-3 w-3 mr-1" />}
            Disconnect
          </Button>
        )}
      </div>

      {/* Breadcrumbs + search */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs min-w-0 flex-1">
          {crumbs.map((crumb, i) => (
            <span key={crumb.id ?? 'root'} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              <button
                className={`hover:underline truncate max-w-[120px] ${i === crumbs.length - 1 ? 'font-medium' : 'text-muted-foreground'}`}
                onClick={() => i < crumbs.length - 1 && navigateBack(i)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setActiveSearch(searchInput.trim())}
            placeholder="Search this folder…"
            className="h-7 text-xs w-40"
          />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setActiveSearch(searchInput.trim())}>
            <Search className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Listing */}
      {listLoading && files.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading from Drive...</span>
        </div>
      ) : listError ? (
        <div className="text-center py-8 space-y-3">
          <AlertTriangle className="h-6 w-6 mx-auto text-destructive" />
          <p className="text-sm text-destructive">{listError}</p>
          <Button size="sm" variant="outline" onClick={() => loadFolder(currentFolder, activeSearch)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Retry
          </Button>
        </div>
      ) : files.length === 0 && currentFolder.id !== null ? (
        <div className="text-center py-10 space-y-2">
          <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            {activeSearch ? 'No folders or images match your search' : 'No folders or images here'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-1">
            {/* Shared-with-me entry, pinned at root */}
            {currentFolder.id === null && !activeSearch && (
              <button
                onClick={() => navigateTo(SHARED_CRUMB)}
                className="rounded-md border p-2 hover:border-primary/50 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="aspect-[4/3] bg-muted rounded-sm flex items-center justify-center">
                  <Users className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-[10px] font-medium mt-1.5 truncate">Shared with me</p>
                <p className="text-[9px] text-muted-foreground">Team-shared items</p>
              </button>
            )}

            {files.map((file) =>
              file.isFolder ? (
                <div
                  key={file.id}
                  className={`relative rounded-md border p-2 cursor-pointer transition-all ${
                    selectedFolders.has(file.id) ? 'ring-2 ring-primary' : 'hover:border-primary/50 hover:bg-accent/50'
                  }`}
                  onClick={() => navigateTo({ id: file.id, name: file.name })}
                >
                  <div
                    className="absolute top-1 left-1 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFolder(file);
                    }}
                  >
                    <Checkbox checked={selectedFolders.has(file.id)} className="bg-background/80" />
                  </div>
                  <div className="aspect-[4/3] bg-muted rounded-sm flex items-center justify-center">
                    <Folder className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-[10px] font-medium mt-1.5 truncate">{file.name}</p>
                  <p className="text-[9px] text-muted-foreground">Folder</p>
                </div>
              ) : (
                <div
                  key={file.id}
                  className={`relative rounded-md border overflow-hidden cursor-pointer transition-all ${
                    selectedFiles.has(file.id) ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                  }`}
                  onClick={() => toggleFile(file)}
                >
                  <div className="absolute top-1 left-1 z-10">
                    <Checkbox checked={selectedFiles.has(file.id)} className="bg-background/80" />
                  </div>
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                    {file.thumbnailUrl ? (
                      <img src={file.thumbnailUrl} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground p-1 text-center break-all">
                        {file.name.replace(/\.[^.]+$/, '')}
                      </span>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] truncate">{file.name}</p>
                    <p className="text-[9px] text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              )
            )}
          </div>

          {nextPageToken && (
            <div className="text-center">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={listLoading}
                onClick={() => loadFolder(currentFolder, activeSearch, nextPageToken)}
              >
                {listLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* Import action bar */}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">
          {selectionCount > 0
            ? `${selectedFiles.size} image${selectedFiles.size !== 1 ? 's' : ''} + ${selectedFolders.size} folder${selectedFolders.size !== 1 ? 's' : ''} selected`
            : 'Select images or folders to import'}
        </span>
        <Button
          size="sm"
          className="h-8 text-xs bg-primary text-primary-foreground"
          disabled={selectionCount === 0 || importing}
          onClick={handleImport}
        >
          {importing ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Importing {selectionCount} item{selectionCount !== 1 ? 's' : ''}…</>
          ) : (
            <><Upload className="h-3.5 w-3.5 mr-1.5" />Import {selectionCount > 0 ? selectionCount : ''} item{selectionCount !== 1 ? 's' : ''}</>
          )}
        </Button>
      </div>

      {/* Disconnect confirmation */}
      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the workspace-wide connection for the whole team — nobody will be able
              to browse or import from Google Drive until someone connects again. Already-imported
              assets stay in the library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDisconnect}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
