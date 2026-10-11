/**
 * useBulkAssetUpload Hook (CMS-158)
 *
 * Uploads many files from the device in one action. Each file flows through
 * the standard pipeline (uploadAsset → Storage → completeUpload) with
 * per-file progress and failure reporting — one bad file never aborts the
 * rest of the batch.
 *
 * A small concurrency pool (3 at a time) keeps uploads fast without
 * hammering the callable endpoints.
 */

import { useMemo, useState } from 'react';
import { uploadAsset, completeUpload } from '../services/assetService';
import { validateFile, uploadFile } from '../services/storageService';
import type { UploadAssetInput } from '../types';

export type BulkUploadStatus = 'pending' | 'uploading' | 'finalizing' | 'completed' | 'failed';

export interface BulkUploadItem {
  /** Stable client-side id for list rendering. */
  id: string;
  file: File;
  status: BulkUploadStatus;
  /** 0-100, meaningful while status === 'uploading'. */
  progress: number;
  assetId: string | null;
  error: string | null;
}

export interface BulkUploadMetadata
  extends Omit<UploadAssetInput, 'filename' | 'contentType' | 'sizeBytes'> {}

export interface UseBulkAssetUploadResult {
  items: BulkUploadItem[];
  /** True while any file is pending/uploading/finalizing. */
  uploading: boolean;
  /** True when the batch has run and every file reached a terminal state. */
  allSettled: boolean;
  completedCount: number;
  failedCount: number;
  /** Asset ids of successful uploads, in completion order. */
  succeededAssetIds: string[];
  /** Upload every given file (existing items are replaced). */
  startBulkUpload: (files: File[], metadata: BulkUploadMetadata) => Promise<void>;
  reset: () => void;
}

const CONCURRENCY = 3;

let nextItemId = 0;
const makeItemId = () => `bulk-${Date.now()}-${nextItemId++}`;

export function useBulkAssetUpload(): UseBulkAssetUploadResult {
  const [items, setItems] = useState<BulkUploadItem[]>([]);

  const patchItem = (id: string, patch: Partial<BulkUploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadOne = async (
    item: BulkUploadItem,
    metadata: BulkUploadMetadata
  ): Promise<void> => {
    const validation = validateFile(item.file);
    if (!validation.valid) {
      patchItem(item.id, { status: 'failed', error: validation.errors.join(', ') });
      return;
    }

    try {
      patchItem(item.id, { status: 'uploading', progress: 0, error: null });

      const { assetId } = await uploadAsset({
        ...metadata,
        filename: item.file.name,
        contentType: item.file.type,
        sizeBytes: item.file.size,
      });
      patchItem(item.id, { assetId });

      const storagePath = `assets/${assetId}/${item.file.name}`;
      await new Promise<void>((resolve, reject) => {
        uploadFile(item.file, storagePath, {
          onProgress: (progress) => patchItem(item.id, { progress: progress.progress }),
          onError: reject,
          onComplete: resolve,
        });
      });

      patchItem(item.id, { status: 'finalizing', progress: 100 });
      await completeUpload({ assetId, storagePath });

      patchItem(item.id, { status: 'completed', progress: 100 });
    } catch (error: any) {
      console.error(`Bulk upload failed for ${item.file.name}:`, error);
      patchItem(item.id, {
        status: 'failed',
        error: error?.message || 'Upload failed',
      });
    }
  };

  const startBulkUpload = async (files: File[], metadata: BulkUploadMetadata) => {
    const initialItems: BulkUploadItem[] = files.map((file) => ({
      id: makeItemId(),
      file,
      status: 'pending',
      progress: 0,
      assetId: null,
      error: null,
    }));
    setItems(initialItems);

    // Simple worker pool: CONCURRENCY workers pull from the shared queue.
    const queue = [...initialItems];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      let next: BulkUploadItem | undefined;
      while ((next = queue.shift()) !== undefined) {
        await uploadOne(next, metadata);
      }
    });
    await Promise.all(workers);
  };

  const reset = () => setItems([]);

  const derived = useMemo(() => {
    const uploading = items.some(
      (item) => item.status === 'pending' || item.status === 'uploading' || item.status === 'finalizing'
    );
    const completed = items.filter((item) => item.status === 'completed');
    const failed = items.filter((item) => item.status === 'failed');
    return {
      uploading,
      allSettled: items.length > 0 && !uploading,
      completedCount: completed.length,
      failedCount: failed.length,
      succeededAssetIds: completed.map((item) => item.assetId!).filter(Boolean),
    };
  }, [items]);

  return {
    items,
    ...derived,
    startBulkUpload,
    reset,
  };
}
