import { useState, useEffect } from 'react';
import { useCardsContext } from '../context/CardsContext';
import { cardService } from '../services/cardService';
import type { CardDocument } from '../types';

interface UseCardsResult {
  cards: CardDocument[];
  allCards: CardDocument[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  filteredCount: number;
}

export function useCards(): UseCardsResult {
  const { filters } = useCardsContext();
  const [cards, setCards] = useState<CardDocument[]>([]);
  const [allCards, setAllCards] = useState<CardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Subscribe to all cards (unfiltered) for totalCount
    const unsubAll = cardService.subscribeToCards(
      {},
      (allDocs) => {
        setAllCards(allDocs);
      },
      (err) => setError(err)
    );

    // Subscribe to filtered cards
    const unsubFiltered = cardService.subscribeToCards(
      filters,
      (filteredDocs) => {
        setCards(filteredDocs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubAll();
      unsubFiltered();
    };
  }, [filters.status, filters.issuer, filters.category, filters.search]);

  return {
    cards,
    allCards,
    loading,
    error,
    totalCount: allCards.length,
    filteredCount: cards.length,
  };
}
