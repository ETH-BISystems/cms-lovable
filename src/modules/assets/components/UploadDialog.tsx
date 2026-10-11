/**
 * UploadDialog Component
 *
 * Dialog for uploading new assets with three source tabs:
 * - Device: Select/drop one or many files (bulk upload, CMS-158), with
 *   per-file progress and failure reporting
 * - Stock Photos: (placeholder for stock photo integration)
 * - Google Drive: Import from connected Google Drive
 *
 * A single uploaded file transitions to AIIntakeFlow for guided tagging
 * (legacy behavior). Multi-file (bulk) uploads skip per-file AI intake and
 * instead report a summary; the caller auto-selects the new assets so the
 * user can batch-apply shared metadata in one action.
 *
 * Validates: Requirements 24 (Upload Modal with AI Intake Integration)
 */

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  X,
  Monitor,
  Image,
  FolderOpen,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AIIntakeFlow } from './AIIntakeFlow';
import { GoogleDriveTab } from './GoogleDriveTab';
import { useBulkAssetUpload, type BulkUploadItem } from '../hooks/useBulkAssetUpload';
import { validateFile } from '../services/storageService';
import type { AssetCategory, AssetSource } from '../types';

/** Cap on files per bulk batch — keeps the dialog and callables manageable. */
const MAX_FILES_PER_BATCH = 50;

export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single-file upload completed (legacy AI intake path). */
  onUploadComplete?: (assetId: string) => void;
  /** Bulk upload settled — asset ids of every successful file (CMS-158). */
  onBulkUploadComplete?: (assetIds: string[]) => void;
  /** Called with the created asset ids after a Google Drive import. */
  onDriveImportComplete?: (assetIds: string[]) => void;
}

function BulkFileRow({ item, onRemove }: { item: BulkUploadItem; onRemove?: () => void }) {
  return (
    <div className="rounded-md border bg-card p-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        {item.status === 'completed' && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
        )}
        {item.status === 'failed' && <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />}
        {(item.status === 'uploading' || item.status === 'finalizing' || item.status === 'pending') && (
          <Loader2
            className={`h-4 w-4 shrink-0 text-muted-foreground ${item.status !== 'pending' ? 'animate-spin' : ''}`}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {(item.file.size / 1024 / 1024).toFixed(2)} MB
            {item.status === 'finalizing' && ' · Processing…'}
            {item.status === 'pending' && ' · Waiting…'}
          </p>
        </div>
        {onRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {item.status === 'uploading' && <Progress value={item.progress} className="h-1.5" />}
      {item.status === 'failed' && item.error && (
        <p className="text-[10px] text-destructive">{item.error}</p>
      )}
    </div>
  );
}

export function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
  onBulkUploadComplete,
  onDriveImportComplete,
}: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<AssetCategory>('Photo');
  const [source, setSource] = useState<AssetSource>('Upload');
  const [description, setDescription] = useState('');
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [activeTab, setActiveTab] = useState('device');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    uploading,
    allSettled,
    completedCount,
    failedCount,
    succeededAssetIds,
    startBulkUpload,
    reset,
  } = useBulkAssetUpload();

  const isBulk = files.length > 1;
  const singleCompletedAssetId =
    !isBulk && allSettled && succeededAssetIds.length === 1 ? succeededAssetIds[0] : null;

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    setRejectedFiles([]);

    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of incoming) {
      const validation = validateFile(file);
      if (!validation.valid) {
        rejected.push(`${file.name} (${validation.errors.join(', ')})`);
      } else {
        accepted.push(file);
      }
    }

    setFiles((prev) => {
      const room = MAX_FILES_PER_BATCH - prev.length;
      const overflow = accepted.length - room;
      if (overflow > 0) {
        rejected.push(
          `${overflow} file${overflow !== 1 ? 's' : ''} skipped — maximum ${MAX_FILES_PER_BATCH} per batch`
        );
      }
      return [...prev, ...accepted.slice(0, Math.max(room, 0))];
    });

    if (rejected.length > 0) {
      setRejectedFiles(rejected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploading || allSettled) return;
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    await startBulkUpload(files, { category, source, description });
  };

  const resetDialog = () => {
    setFiles([]);
    setDescription('');
    setRejectedFiles([]);
    setShowIntakeFlow(false);
    setActiveTab('device');
    reset();
  };

  const handleClose = () => {
    if (singleCompletedAssetId) {
      onUploadComplete?.(singleCompletedAssetId);
    }
    resetDialog();
    onOpenChange(false);
  };

  // After a single-file upload completes, transition to AIIntakeFlow
  const handleUploadSuccess = () => {
    if (singleCompletedAssetId) {
      setShowIntakeFlow(true);
    }
  };

  // Bulk flow: hand the successful asset ids to the library for batch editing
  const handleBulkDone = () => {
    if (succeededAssetIds.length > 0) {
      onBulkUploadComplete?.(succeededAssetIds);
    }
    resetDialog();
    onOpenChange(false);
  };

  // Handle AIIntakeFlow completion (single-file path)
  const handleIntakeComplete = () => {
    if (singleCompletedAssetId) {
      onUploadComplete?.(singleCompletedAssetId);
    }
    resetDialog();
    onOpenChange(false);
  };

  // Swallow overlay/Escape closes while an upload run is in flight — the
  // batch keeps running and the per-file state must stay visible.
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && uploading) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Asset
          </DialogTitle>
        </DialogHeader>

        {/* Show AIIntakeFlow after successful single-file upload */}
        {showIntakeFlow && singleCompletedAssetId ? (
          <AIIntakeFlow
            assetId={singleCompletedAssetId}
            filename={files[0]?.name || 'uploaded-file'}
            category={category}
            initialDescription={description}
            onComplete={handleIntakeComplete}
            onCancel={handleClose}
          />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="device" className="text-xs">
                <Monitor className="h-3.5 w-3.5 mr-1.5" />Device
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-xs">
                <Image className="h-3.5 w-3.5 mr-1.5" />Stock Photos
              </TabsTrigger>
              <TabsTrigger value="google-drive" className="text-xs">
                <FolderOpen className="h-3.5 w-3.5 mr-1.5" />Google Drive
              </TabsTrigger>
            </TabsList>

            {/* Device Tab */}
            <TabsContent value="device" className="space-y-4 mt-4">
              {/* File Selection — hidden once an upload run has started */}
              {!uploading && !allSettled && (
                <div
                  className="group flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 transition-all hover:border-primary/50 hover:bg-muted/50"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Upload className="mb-4 h-14 w-14 text-muted-foreground transition-colors group-hover:text-primary" />
                  <p className="text-sm font-semibold">
                    Click to upload or drag and drop
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    JPG, PNG, WebP, GIF, SVG, AVIF (max 50MB each) — select multiple files for bulk upload
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.avif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files || []));
                      e.target.value = '';
                    }}
                  />
                </div>
              )}

              {/* Rejected files warning */}
              {rejectedFiles.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium mb-1">
                      {rejectedFiles.length} file{rejectedFiles.length !== 1 ? 's' : ''} skipped:
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {rejectedFiles.map((entry, i) => (
                        <li key={i}>{entry}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Selected files (pre-upload) */}
              {!uploading && !allSettled && files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setFiles([])}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {files.map((file, i) => (
                      <BulkFileRow
                        key={`${file.name}-${file.size}-${i}`}
                        item={{
                          id: `${i}`,
                          file,
                          status: 'pending',
                          progress: 0,
                          assetId: null,
                          error: null,
                        }}
                        onRemove={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upload run: per-file progress / results */}
              {(uploading || allSettled) && (
                <div className="space-y-2">
                  <Label>
                    {uploading
                      ? `Uploading ${completedCount + failedCount + 1} of ${items.length}…`
                      : `Uploaded ${completedCount} of ${items.length}`}
                  </Label>
                  <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <BulkFileRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata — applies to every file in the batch */}
              {files.length > 0 && !uploading && !allSettled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={category}
                        onValueChange={(value) => setCategory(value as AssetCategory)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Photo">Photo</SelectItem>
                          <SelectItem value="Screenshot">Screenshot</SelectItem>
                          <SelectItem value="Infographic">Infographic</SelectItem>
                          <SelectItem value="Card Art">Card Art</SelectItem>
                          <SelectItem value="Issuer Logo">Issuer Logo</SelectItem>
                          <SelectItem value="Airline Logo">Airline Logo</SelectItem>
                          <SelectItem value="Hotel Logo">Hotel Logo</SelectItem>
                          <SelectItem value="Alliance Logo">Alliance Logo</SelectItem>
                          <SelectItem value="Program Logo">Program Logo</SelectItem>
                          <SelectItem value="Team Photo">Team Photo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Source</Label>
                      <Select
                        value={source}
                        onValueChange={(value) => setSource(value as AssetSource)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Upload">Upload</SelectItem>
                          <SelectItem value="Stock">Stock</SelectItem>
                          <SelectItem value="AI Generated">AI Generated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        isBulk
                          ? 'Applied to every file in this batch — you can also batch-edit after upload...'
                          : 'Brief description of the asset...'
                      }
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Bulk summary */}
              {allSettled && isBulk && (
                <Alert variant={failedCount > 0 ? 'destructive' : 'default'}>
                  <AlertDescription>
                    {completedCount} of {items.length} file{items.length !== 1 ? 's' : ''} uploaded
                    successfully.
                    {failedCount > 0 &&
                      ` ${failedCount} failed — details above. Successful uploads are still kept.`}
                    {failedCount === 0 &&
                      ' Continue to select them in the library and batch-apply shared keywords, description and tags.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Single-file success */}
              {singleCompletedAssetId && !showIntakeFlow && (
                <Alert>
                  <AlertDescription>
                    Upload successful! Starting AI intake flow...
                  </AlertDescription>
                </Alert>
              )}

              {/* All files failed */}
              {allSettled && completedCount === 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    No files were uploaded successfully. Review the errors above and try again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                {uploading ? (
                  <Button variant="outline" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </Button>
                ) : allSettled ? (
                  isBulk ? (
                    completedCount > 0 ? (
                      <Button onClick={handleBulkDone}>
                        Done — select {completedCount} uploaded asset{completedCount !== 1 ? 's' : ''}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={handleClose}>
                        Close
                      </Button>
                    )
                  ) : singleCompletedAssetId ? (
                    <Button onClick={handleUploadSuccess}>Continue to AI Intake</Button>
                  ) : (
                    <Button variant="outline" onClick={handleClose}>
                      Close
                    </Button>
                  )
                ) : (
                  <>
                    <Button variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={files.length === 0}>
                      {isBulk ? `Upload ${files.length} files` : 'Upload'}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Stock Photos Tab */}
            <TabsContent value="stock" className="mt-4">
              <div className="text-center py-16 space-y-3">
                <Image className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">Stock Photos</p>
                <p className="text-xs text-muted-foreground">
                  Stock photo integration coming soon
                </p>
              </div>
            </TabsContent>

            {/* Google Drive Tab */}
            <TabsContent value="google-drive" className="mt-4">
              <GoogleDriveTab onImportComplete={onDriveImportComplete} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
