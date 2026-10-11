/**
 * WebflowSyncDialog Component
 *
 * Dialog for syncing assets to Webflow (single or bulk).
 * Shows sync progress and results.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useWebflowSync } from '../hooks/useWebflowSync';
import { estimateSyncTime } from '../services/webflowService';
import type { AssetDocument } from '../types';

export interface WebflowSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: AssetDocument[];
  onComplete?: () => void;
}

export function WebflowSyncDialog({
  open,
  onOpenChange,
  assets,
  onComplete,
}: WebflowSyncDialogProps) {
  const { syncState, syncOne, syncBulk } = useWebflowSync();

  const isBulk = assets.length > 1;
  const estimatedTime = estimateSyncTime(assets.length);

  const handleSync = async () => {
    if (isBulk) {
      await syncBulk(
        { assetIds: assets.map((a) => a.id) },
        assets
      );
    } else {
      await syncOne({ assetId: assets[0].id });
    }
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Sync to Webflow ({assets.length} asset{assets.length > 1 ? 's' : ''})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estimate */}
          {!syncState.loading && !syncState.result && (
            <Alert>
              <AlertDescription>
                Estimated time: {estimatedTime}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading */}
          {syncState.loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Syncing to Webflow...</span>
              </div>
              <Progress value={50} className="animate-pulse" />
            </div>
          )}

          {/* Error */}
          {syncState.error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{syncState.error.message}</AlertDescription>
            </Alert>
          )}

          {/* Results (Bulk) */}
          {syncState.result && 'totalProcessed' in syncState.result && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <div className="font-medium">Sync completed!</div>
                <div className="mt-1 text-sm">
                  {(syncState.result as { successCount?: number }).successCount ?? 0} succeeded,{' '}
                  {(syncState.result as { failureCount?: number }).failureCount ?? 0} failed
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Results (Single) */}
          {syncState.result && 'success' in syncState.result && (
            <Alert variant={(syncState.result as { success?: boolean }).success ? 'default' : 'destructive'}>
              {(syncState.result as { success?: boolean }).success ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{(syncState.result as { message?: string }).message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncState.loading}
          >
            {syncState.result ? 'Close' : 'Cancel'}
          </Button>
          {!syncState.result && (
            <Button onClick={handleSync} disabled={syncState.loading}>
              Sync Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
