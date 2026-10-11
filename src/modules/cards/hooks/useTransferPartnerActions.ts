import { useState, useCallback } from 'react';
import { transferPartnerService } from '../services/transferPartnerService';
import type { AddTransferPartnerInput, UpdateTransferPartnerInput } from '../types';

interface UseTransferPartnerActionsResult {
  addTransferPartner: (input: AddTransferPartnerInput) => Promise<{ id: string }>;
  updateTransferPartner: (input: UpdateTransferPartnerInput) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useTransferPartnerActions(): UseTransferPartnerActionsResult {
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

  const addTransferPartner = useCallback(
    (input: AddTransferPartnerInput) =>
      withLoading(() => transferPartnerService.addPartner(input)),
    []
  );

  const updateTransferPartner = useCallback(
    (input: UpdateTransferPartnerInput) =>
      withLoading(() => transferPartnerService.updatePartner(input)),
    []
  );

  return { addTransferPartner, updateTransferPartner, isLoading, error };
}
