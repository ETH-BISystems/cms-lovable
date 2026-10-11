/**
 * useAssetUpload Hook
 *
 * Handle complete upload workflow:
 * 1. Call uploadAsset Cloud Function to get signed URL
 * 2. Upload file to signed URL with progress tracking
 * 3. Return upload state and controls
 */

import { useState } from 'react';
import { uploadAsset, completeUpload } from '../services/assetService';
import { validateFile, uploadFile } from '../services/storageService';
import type { UploadAssetInput } from '../types';

export interface UploadState {
  uploading: boolean;
  progress: number;
  error: Error | null;
  assetId: string | null;
  completed: boolean;
}

export interface UseAssetUploadResult {
  uploadState: UploadState;
  startUpload: (file: File, metadata: Omit<UploadAssetInput, 'filename' | 'contentType' | 'sizeBytes'>) => Promise<void>;
  reset: () => void;
}

export function useAssetUpload(): UseAssetUploadResult {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    assetId: null,
    completed: false,
  });

  const startUpload = async (
    file: File,
    metadata: Omit<UploadAssetInput, 'filename' | 'contentType' | 'sizeBytes'>
  ) => {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      setUploadState({
        uploading: true,
        progress: 0,
        error: null,
        assetId: null,
        completed: false,
      });

      // Step 1: Call Cloud Function to create asset document
      const result = await uploadAsset({
        ...metadata,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      // Step 2: Upload file directly to Firebase Storage using SDK
      const storagePath = `assets/${result.assetId}/${file.name}`;

      await new Promise<void>((resolve, reject) => {
        const uploadTask = uploadFile(file, storagePath, {
          onProgress: (progress) => {
            setUploadState((prev) => ({
              ...prev,
              progress: progress.progress,
            }));
          },
          onError: reject,
          onComplete: resolve,
        });
      });

      // Step 3: Call Cloud Function to update URLs
      await completeUpload({
        assetId: result.assetId,
        storagePath,
      });

      // Step 4: Mark completed
      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        assetId: result.assetId,
        completed: true,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState({
        uploading: false,
        progress: 0,
        error,
        assetId: null,
        completed: false,
      });
    }
  };

  const reset = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      assetId: null,
      completed: false,
    });
  };

  return {
    uploadState,
    startUpload,
    reset,
  };
}
