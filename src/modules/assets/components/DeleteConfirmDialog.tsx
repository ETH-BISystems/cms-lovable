/**
 * DeleteConfirmDialog Component
 *
 * Confirmation dialog for deleting assets.
 * Shows usage warnings if asset is used in articles.
 */

import React from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  assetCount?: number;
  usageWarnings?: Array<{
    articleId: string;
    articleTitle: string;
  }>;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  assetCount = 1,
  usageWarnings = [],
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Asset{assetCount > 1 ? 's' : ''}?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to delete {assetCount} asset{assetCount > 1 ? 's' : ''}. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {usageWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">
                This asset is currently used in {usageWarnings.length} article
                {usageWarnings.length > 1 ? 's' : ''}:
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {usageWarnings.slice(0, 5).map((warning) => (
                  <li key={warning.articleId}>{warning.articleTitle}</li>
                ))}
                {usageWarnings.length > 5 && (
                  <li>...and {usageWarnings.length - 5} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
