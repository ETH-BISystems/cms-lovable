import { useState, useCallback } from 'react';
import { cardService } from '../services/cardService';
import { scraperService } from '../services/scraperService';
import { webflowService } from '../services/webflowService';
import type {
  AddCardInput, AddCardResult,
  UpdateCardInput,
  SetOverrideInput,
  SyncToWebflowInput, SyncToWebflowResult,
  BulkSyncToWebflowInput, BulkSyncToWebflowResult,
  ScrapeCardInput, ScrapeCardResult,
  ScrapeAllCardsResult,
  ScanCardUrlInput, ScanCardUrlResult,
  SetCardPublishStateInput, SetCardPublishStateResult,
  DeleteCardInput, DeleteCardResult,
} from '../types';

// All mutations flow through callable Cloud Functions via the services layer
// (cardService / scraperService / webflowService). The mock cloud-function
// façade that previously backed this hook is gone (CMS-44/CMS-62).

interface UseCardActionsResult {
  addCard: (input: AddCardInput) => Promise<AddCardResult>;
  updateCard: (input: UpdateCardInput) => Promise<void>;
  setOverride: (input: SetOverrideInput) => Promise<void>;
  syncToWebflow: (input: SyncToWebflowInput) => Promise<SyncToWebflowResult>;
  bulkSyncToWebflow: (input: BulkSyncToWebflowInput) => Promise<BulkSyncToWebflowResult>;
  scrapeCard: (input: ScrapeCardInput) => Promise<ScrapeCardResult>;
  scrapeAllCards: () => Promise<ScrapeAllCardsResult>;
  triggerFOMCScrape: () => Promise<void>;
  scanCardUrl: (input: ScanCardUrlInput) => Promise<ScanCardUrlResult>;
  setCardPublishState: (input: SetCardPublishStateInput) => Promise<SetCardPublishStateResult>;
  deleteCard: (input: DeleteCardInput) => Promise<DeleteCardResult>;
  isLoading: boolean;
  error: Error | null;
}

export function useCardActions(): UseCardActionsResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const withLoading = async <R>(fn: () => Promise<R>): Promise<R> => {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const addCard = useCallback(
    (input: AddCardInput) => withLoading(() => cardService.addCard(input)),
    []
  );

  const updateCard = useCallback(
    (input: UpdateCardInput) => withLoading(() => cardService.updateCard(input)),
    []
  );

  const setOverride = useCallback(
    (input: SetOverrideInput) => withLoading(() => cardService.setOverride(input)),
    []
  );

  const syncToWebflow = useCallback(
    (input: SyncToWebflowInput) => withLoading(() => webflowService.syncToWebflow(input)),
    []
  );

  const bulkSyncToWebflow = useCallback(
    (input: BulkSyncToWebflowInput) => withLoading(() => webflowService.bulkSyncToWebflow(input)),
    []
  );

  const scrapeCard = useCallback(
    (input: ScrapeCardInput) => withLoading(() => scraperService.scrapeCard(input)),
    []
  );

  const scrapeAllCards = useCallback(
    () => withLoading(() => scraperService.scrapeAllCards()),
    []
  );

  const triggerFOMCScrape = useCallback(
    () => withLoading(() => scraperService.triggerFOMCScrape()),
    []
  );

  const scanCardUrl = useCallback(
    (input: ScanCardUrlInput) => withLoading(() => cardService.scanCardUrl(input)),
    []
  );

  const setCardPublishState = useCallback(
    (input: SetCardPublishStateInput) => withLoading(() => cardService.setCardPublishState(input)),
    []
  );

  const deleteCard = useCallback(
    (input: DeleteCardInput) => withLoading(() => cardService.deleteCard(input)),
    []
  );

  return {
    addCard,
    updateCard,
    setOverride,
    syncToWebflow,
    bulkSyncToWebflow,
    scrapeCard,
    scrapeAllCards,
    triggerFOMCScrape,
    scanCardUrl,
    setCardPublishState,
    deleteCard,
    isLoading,
    error,
  };
}
