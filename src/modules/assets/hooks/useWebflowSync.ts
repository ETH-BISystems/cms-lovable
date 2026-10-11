/**
 * useWebflowSync Hook
 *
 * Handle Webflow sync operations:
 * - Sync single asset
 * - Bulk sync multiple assets
 * - Track sync progress and results
 */

import { useState } from 'react';
import { syncToWebflow, bulkSyncToWebflow } from '../services/assetService';
import { validateBulkSync } from '../services/webflowService';
import type {
  SyncToWebflowInput,
  SyncToWebflowResult,
  BulkSyncToWebflowInput,
  BulkSyncToWebflowResult,
} from '../types';

export interface WebflowSyncState {
  loading: boolean;
  error: Error | null;
  result: SyncToWebflowResult | BulkSyncToWebflowResult | null;
}

export interface UseWebflowSyncResult {
  syncState: WebflowSyncState;
  syncOne: (input: SyncToWebflowInput) => Promise<SyncToWebflowResult>;
  syncBulk: (input: BulkSyncToWebflowInput, assets: any[]) => Promise<BulkSyncToWebflowResult>;
  reset: () => void;
}

export function useWebflowSync(): UseWebflowSyncResult {
  const [syncState, setSyncState] = useState<WebflowSyncState>({
    loading: false,
    error: null,
    result: null,
  });

  const syncOne = async (input: SyncToWebflowInput): Promise<SyncToWebflowResult> => {
    try {
      setSyncState({ loading: true, error: null, result: null });
      const result = await syncToWebflow(input);
      setSyncState({ loading: false, error: null, result });
      return result;
    } catch (error: any) {
      console.error('Webflow sync error:', error);
      setSyncState({ loading: false, error, result: null });
      throw error;
    }
  };

  const syncBulk = async (
    input: BulkSyncToWebflowInput,
    assets: any[]
  ): Promise<BulkSyncToWebflowResult> => {
    try {
      // Validate bulk sync
      const validation = validateBulkSync(assets);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      setSyncState({ loading: true, error: null, result: null });
      const result = await bulkSyncToWebflow(input);
      setSyncState({ loading: false, error: null, result });
      return result;
    } catch (error: any) {
      console.error('Bulk Webflow sync error:', error);
      setSyncState({ loading: false, error, result: null });
      throw error;
    }
  };

  const reset = () => {
    setSyncState({ loading: false, error: null, result: null });
  };

  return {
    syncState,
    syncOne,
    syncBulk,
    reset,
  };
}
