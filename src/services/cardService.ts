// UI-only card service. Wraps the mock store with the same subscribe/query
// shape the real Firestore-backed service will expose. See
// CLAUDE_HANDOVER.md §6 for the production replacement plan.

import { mockCards } from '@/mocks/mockCards';
import type {
  CardDocument,
  CardFilters,
  ChangeHistoryEntry,
} from '@/modules/cards/types';

function applyFilters(cards: CardDocument[], filters: Partial<CardFilters>): CardDocument[] {
  let out = cards;
  if (filters.status) out = out.filter((c) => c.status === filters.status);
  if (filters.issuer) out = out.filter((c) => c.issuer === filters.issuer);
  if (filters.category) out = out.filter((c) => c.category === filters.category);
  if (filters.search) {
    const s = filters.search.toLowerCase();
    out = out.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.issuer.toLowerCase().includes(s) ||
        c.category.toLowerCase().includes(s)
    );
  }
  return out;
}

export const cardService = {
  subscribeToCards(
    filters: Partial<CardFilters>,
    onData: (cards: CardDocument[]) => void,
    _onError: (err: Error) => void
  ): () => void {
    return mockCards.subscribeCards((all) => onData(applyFilters(all, filters)));
  },

  subscribeToCard(
    cardId: string,
    onData: (card: CardDocument | null) => void,
    _onError: (err: Error) => void
  ): () => void {
    return mockCards.subscribeCard(cardId, onData);
  },

  subscribeToChangeHistory(
    cardId: string,
    onData: (entries: ChangeHistoryEntry[]) => void,
    _onError: (err: Error) => void
  ): () => void {
    return mockCards.subscribeChangeHistory(cardId, onData);
  },
};
