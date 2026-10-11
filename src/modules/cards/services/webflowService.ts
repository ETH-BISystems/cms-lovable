// MOCK — Webflow sync callable invocations (ported from production).
//
// production: `syncToWebflow` (six collection upserts + publish, timeout 300s)
// and `bulkSyncToWebflow` (timeout 540s). The mock stamps a webflowItemId,
// flips webflowStatus to 'synced', and logs a 'webflow-sync' change-history
// entry via the card store — mirroring the real function's observable effect.

import { delay } from '@/services/_delay';
import type {
  SyncToWebflowInput,
  SyncToWebflowResult,
  BulkSyncToWebflowInput,
  BulkSyncToWebflowResult,
} from '../types';
import { storeSyncCardToWebflow } from './mockCardStore';

export const webflowService = {
  // production: httpsCallable(functions, 'syncToWebflow', { timeout: 300_000 })
  syncToWebflow: async (input: SyncToWebflowInput): Promise<SyncToWebflowResult> => {
    await delay(1200);
    const webflowItemId = storeSyncCardToWebflow(input.cardId);
    return { webflowItemId };
  },

  // production: httpsCallable(functions, 'bulkSyncToWebflow', { timeout: 540_000 })
  bulkSyncToWebflow: async (input: BulkSyncToWebflowInput): Promise<BulkSyncToWebflowResult> => {
    const synced: string[] = [];
    const failed: Array<{ cardId: string; error: string }> = [];
    for (const cardId of input.cardIds) {
      await delay(350);
      try {
        storeSyncCardToWebflow(cardId);
        synced.push(cardId);
      } catch (err) {
        failed.push({ cardId, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return { synced, failed };
  },
};
