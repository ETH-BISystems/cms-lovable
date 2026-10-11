import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSettings } from '../hooks/useSettings';
import { useSettingsPermissions } from '../hooks/useSettingsPermissions';
import type { CMSSyncSettings } from '../types';
import { NotYetAvailable } from './shared/NotYetAvailable';

export function WebflowSyncTab() {
  const { data, loading, error, save } = useSettings<CMSSyncSettings>('cmsSync');
  const { canWrite } = useSettingsPermissions();
  const readOnly = !canWrite('cmsSync');
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-destructive">Failed to load settings: {error.message}</div>;
  }

  const collections = data?.collections || [];
  const syncQueue = data?.syncQueue || [];
  const errorLog = data?.errorLog || [];
  const hasErrors = errorLog.filter(e => e.status === 'failed').length > 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'in_sync': return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
      case 'pending': return <Clock className="h-3.5 w-3.5 text-orange-500" />;
      case 'error': return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      default: return null;
    }
  };

  return (
    <NotYetAvailable note="CMS sync status is not yet populated — the sync queue and retry actions will activate once the Webflow sync worker writes this document. Publishing itself works from the Article Pipeline.">
    <div className="space-y-6">
      {/* Warning Banner */}
      {hasErrors && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-[12px] text-red-600">There are sync failures that need attention. Check the error log below.</p>
        </div>
      )}

      {/* Sync Architecture */}
      <div className="bg-muted/40 rounded-lg border border-border p-4">
        <p className="text-[12px] text-muted-foreground">
          CMS Sync pushes content from Firestore to Webflow CMS collections. Changes are queued and processed in order. Failed items are retried automatically up to 3 times before being flagged for manual review.
        </p>
      </div>

      {/* Collection Sync Status */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Collection Sync Status</h3>
          {!readOnly && (
            <Button variant="destructive" size="sm" className="text-[12px]" onClick={() => setShowPublishDialog(true)}>
              Full Publish
            </Button>
          )}
        </div>
        <div className="px-5 py-4">
          {collections.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No collections configured for sync.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Collection</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Webflow</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Last Synced</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Pending</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.map(col => (
                    <tr key={col.firestoreName} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 font-medium">{col.firestoreName}</td>
                      <td className="py-2 px-2 text-muted-foreground">{col.webflowCollection}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(col.status)}
                          <span className="capitalize">{col.status.replace('_', ' ')}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">{col.lastSynced ? new Date(col.lastSynced as unknown as string).toLocaleDateString() : '—'}</td>
                      <td className="py-2 px-2 text-right">{col.pendingCount}</td>
                      <td className="py-2 px-2 text-right">{col.failedCount > 0 ? <span className="text-red-600 font-medium">{col.failedCount}</span> : '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sync Queue */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-card-foreground">Sync Queue</h3>
          {syncQueue.length > 0 && <Badge variant="outline" className="text-[10px]">{syncQueue.length} items</Badge>}
        </div>
        <div className="px-5 py-4">
          {syncQueue.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">Queue is empty. All items are synced.</p>
          ) : (
            <div className="space-y-2">
              {syncQueue.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-[12px] font-medium">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.collection}</p>
                  </div>
                  <Badge variant={item.status === 'syncing' ? 'default' : 'secondary'} className="text-[10px]">
                    {item.status === 'syncing' && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Log */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-[14px] font-semibold text-card-foreground">Error Log</h3>
        </div>
        <div className="px-5 py-4">
          {errorLog.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center py-4">No errors. All syncs completed successfully.</p>
          ) : (
            <div className="space-y-2">
              {errorLog.map(entry => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-[12px] font-medium">{entry.title}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.collection} • {entry.errorType}: {entry.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{entry.status}</Badge>
                    {entry.status === 'failed' && !readOnly && (
                      <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2">Retry</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Publish Confirmation Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Full Publish Confirmation
            </DialogTitle>
            <DialogDescription>
              This will re-publish ALL items across all collections to Webflow. This is a destructive operation that may take several minutes and consume significant API quota.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setShowPublishDialog(false)}>Confirm Full Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </NotYetAvailable>
  );
}
