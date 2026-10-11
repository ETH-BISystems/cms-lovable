import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { CardFilters } from '../types';

const DEFAULT_FILTERS: CardFilters = {
  issuer: '',
  category: '',
  status: '',
  search: '',
};

interface CardsContextValue {
  // Active card selection (drives CardDetailPanel open/close)
  activeCardId: string | null;
  setActiveCardId: (id: string | null) => void;

  // Filter state for CardsPage DataTable
  filters: CardFilters;
  setFilters: (filters: Partial<CardFilters>) => void;
  resetFilters: () => void;

  // Bulk selection
  selectedCardIds: Set<string>;
  toggleCardSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  // Scraper running state
  isScraperRunning: boolean;
  setIsScraperRunning: (running: boolean) => void;
  scraperProgress: { current: number; total: number } | null;
  setScraperProgress: (progress: { current: number; total: number } | null) => void;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: ReactNode }) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CardFilters>(DEFAULT_FILTERS);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [scraperProgress, setScraperProgress] = useState<{ current: number; total: number } | null>(null);

  const setFilters = useCallback((partial: Partial<CardFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const toggleCardSelection = useCallback((id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedCardIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
  }, []);

  return (
    <CardsContext.Provider
      value={{
        activeCardId,
        setActiveCardId,
        filters,
        setFilters,
        resetFilters,
        selectedCardIds,
        toggleCardSelection,
        selectAll,
        clearSelection,
        isScraperRunning,
        setIsScraperRunning,
        scraperProgress,
        setScraperProgress,
      }}
    >
      {children}
    </CardsContext.Provider>
  );
}

export function useCardsContext(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) {
    throw new Error('useCardsContext must be used within a CardsProvider');
  }
  return ctx;
}
