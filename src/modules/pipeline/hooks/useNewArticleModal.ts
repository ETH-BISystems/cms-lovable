import { useState, useCallback } from 'react';
import type { CreateArticleInput } from '../types';

export function useNewArticleModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillData, setPrefillData] = useState<Partial<CreateArticleInput> | null>(null);

  const openModal = useCallback((prefill?: Partial<CreateArticleInput>) => {
    setPrefillData(prefill ?? null);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setPrefillData(null);
  }, []);

  return { isOpen, prefillData, openModal, closeModal };
}
