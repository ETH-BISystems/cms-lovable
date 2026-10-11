/**
 * useAssetMutations Hook
 *
 * Handle all asset CRUD operations:
 * - Update asset metadata
 * - Delete asset
 * - Add asset to article
 * - Remove asset from article
 * - Bulk operations
 */

import { useState } from 'react';
import {
  updateAsset,
  deleteAsset,
  addAssetToArticle,
  removeAssetFromArticle,
  bulkAddTags,
  batchApplyAssetMetadata,
  generateExportZIP,
} from '../services/assetService';
import type {
  UpdateAssetInput,
  DeleteAssetInput,
  DeleteAssetResult,
  AddAssetToArticleInput,
  RemoveAssetFromArticleInput,
  BulkAddTagsInput,
  BulkAddTagsResult,
  BatchApplyAssetMetadataInput,
  BatchApplyAssetMetadataResult,
  GenerateExportZIPInput,
  GenerateExportZIPResult,
} from '../types';

export interface MutationState {
  loading: boolean;
  error: Error | null;
}

export interface UseAssetMutationsResult {
  mutationState: MutationState;
  update: (input: UpdateAssetInput) => Promise<void>;
  deleteOne: (input: DeleteAssetInput) => Promise<DeleteAssetResult>;
  addToArticle: (input: AddAssetToArticleInput) => Promise<void>;
  removeFromArticle: (input: RemoveAssetFromArticleInput) => Promise<void>;
  bulkTag: (input: BulkAddTagsInput) => Promise<BulkAddTagsResult>;
  batchApply: (input: BatchApplyAssetMetadataInput) => Promise<BatchApplyAssetMetadataResult>;
  exportZIP: (input: GenerateExportZIPInput) => Promise<GenerateExportZIPResult>;
  reset: () => void;
}

export function useAssetMutations(): UseAssetMutationsResult {
  const [mutationState, setMutationState] = useState<MutationState>({
    loading: false,
    error: null,
  });

  const update = async (input: UpdateAssetInput) => {
    try {
      setMutationState({ loading: true, error: null });
      await updateAsset(input);
      setMutationState({ loading: false, error: null });
    } catch (error: any) {
      console.error('Update asset error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const deleteOne = async (input: DeleteAssetInput): Promise<DeleteAssetResult> => {
    try {
      setMutationState({ loading: true, error: null });
      const result = await deleteAsset(input);
      setMutationState({ loading: false, error: null });
      return result;
    } catch (error: any) {
      console.error('Delete asset error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const addToArticle = async (input: AddAssetToArticleInput) => {
    try {
      setMutationState({ loading: true, error: null });
      await addAssetToArticle(input);
      setMutationState({ loading: false, error: null });
    } catch (error: any) {
      console.error('Add to article error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const removeFromArticle = async (input: RemoveAssetFromArticleInput) => {
    try {
      setMutationState({ loading: true, error: null });
      await removeAssetFromArticle(input);
      setMutationState({ loading: false, error: null });
    } catch (error: any) {
      console.error('Remove from article error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const bulkTag = async (input: BulkAddTagsInput): Promise<BulkAddTagsResult> => {
    try {
      setMutationState({ loading: true, error: null });
      const result = await bulkAddTags(input);
      setMutationState({ loading: false, error: null });
      return result;
    } catch (error: any) {
      console.error('Bulk add tags error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const batchApply = async (
    input: BatchApplyAssetMetadataInput
  ): Promise<BatchApplyAssetMetadataResult> => {
    try {
      setMutationState({ loading: true, error: null });
      const result = await batchApplyAssetMetadata(input);
      setMutationState({ loading: false, error: null });
      return result;
    } catch (error: any) {
      console.error('Batch apply metadata error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const exportZIP = async (input: GenerateExportZIPInput): Promise<GenerateExportZIPResult> => {
    try {
      setMutationState({ loading: true, error: null });
      const result = await generateExportZIP(input);
      setMutationState({ loading: false, error: null });
      return result;
    } catch (error: any) {
      console.error('Export ZIP error:', error);
      setMutationState({ loading: false, error });
      throw error;
    }
  };

  const reset = () => {
    setMutationState({ loading: false, error: null });
  };

  return {
    mutationState,
    update,
    deleteOne,
    addToArticle,
    removeFromArticle,
    bulkTag,
    batchApply,
    exportZIP,
    reset,
  };
}
