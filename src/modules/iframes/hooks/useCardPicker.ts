import { useEffect, useMemo, useState } from 'react';
import { cardService, type CardDocument } from '@/modules/cards';
import { searchIncludes } from '@/platform/utils/searchText';

/**
 * Card data for the iFrame card picker and the audit screen's joins.
 * Subscribes to the full card_data collection once and filters locally.
 * `visibleCards` excludes unpublished cards (they can't be picked for new
 * embeds); `allCards` includes them (the audit screen flags them instead).
 */
export function useCardPicker(): {
  allCards: CardDocument[];
  visibleCards: CardDocument[];
  cardsById: Map<string, CardDocument>;
  issuers: string[];
  search: string;
  setSearch: (v: string) => void;
  issuer: string;
  setIssuer: (v: string) => void;
  loading: boolean;
  error: Error | null;
} {
  const [allCards, setAllCards] = useState<CardDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [issuer, setIssuer] = useState('');

  useEffect(() => {
    return cardService.subscribeToCards(
      {},
      (cards) => {
        setAllCards(cards);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
  }, []);

  const cardsById = useMemo(() => new Map(allCards.map((c) => [c.id, c])), [allCards]);

  const issuers = useMemo(
    () => Array.from(new Set(allCards.map((c) => c.issuer).filter(Boolean))).sort(),
    [allCards]
  );

  const visibleCards = useMemo(() => {
    return allCards
      .filter((c) => c.publishState !== 'unpublished')
      .filter((c) => !issuer || c.issuer === issuer)
      .filter(
        (c) =>
          !search.trim() ||
          searchIncludes(c.name, search) ||
          searchIncludes(c.issuer, search) ||
          searchIncludes(c.category, search)
      )
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [allCards, search, issuer]);

  return { allCards, visibleCards, cardsById, issuers, search, setSearch, issuer, setIssuer, loading, error };
}
