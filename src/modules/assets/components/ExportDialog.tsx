/**
 * ExportDialog Component
 *
 * Dialog for exporting selected assets as ZIP.
 * Options: include metadata JSON
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, CheckCircle } from 'lucide-react';
import { useAssetMutations } from '../hooks/useAssetMutations';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
}

export function ExportDialog({ open, onOpenChange, assetIds }: ExportDialogProps) {
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { exportZIP } = useAssetMutations();

  const handleExport = async () => {
    try {
      setExporting(true);
      const result = await exportZIP({
        assetIds,
        includeMetadata,
      });
      setDownloadUrl(result.downloadUrl);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      onOpenChange(false);
      setDownloadUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Export Assets ({assetIds.length} selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Options */}
          {!downloadUrl && !exporting && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Export will generate a ZIP file containing all selected assets.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Switch
                  id="metadata"
                  checked={includeMetadata}
                  onCheckedChange={setIncludeMetadata}
                />
                <Label htmlFor="metadata">Include metadata JSON file</Label>
              </div>
            </div>
          )}

          {/* Exporting */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating ZIP file...</span>
              </div>
              <Progress value={50} className="animate-pulse" />
            </div>
          )}

          {/* Ready to download */}
          {downloadUrl && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription>
                <div className="font-medium">Export ready!</div>
                <div className="mt-1 text-sm">
                  Your ZIP file is ready to download. Link expires in 1 hour.
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setDownloadUrl(null);
            }}
            disabled={exporting}
          >
            Cancel
          </Button>
          {!downloadUrl ? (
            <Button onClick={handleExport} disabled={exporting}>
              Generate ZIP
            </Button>
          ) : (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
