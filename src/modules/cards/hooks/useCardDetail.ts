import { useState, useEffect, useCallback, useMemo } from 'react';
import { cardService } from '../services/cardService';
import { extractDetailData } from '../utils/extractDetailData';
import type {
  CardDocument,
  ChangeHistoryEntry,
  CardDetailData,
  OfferHistoryEntry,
} from '../types';

interface UseCardDetailResult {
  card: CardDocument | null;
  changeHistory: ChangeHistoryEntry[];
  loading: boolean;
  error: Error | null;
  detailData: CardDetailData;
  offerHistory: OfferHistoryEntry[];
  updateDetail: (fields: Partial<CardDetailData>) => Promise<void>;
}

function computeOfferHistory(changeHistory: ChangeHistoryEntry[]): OfferHistoryEntry[] {
  const bonusChanges = changeHistory
    .filter((entry) => entry.field === 'signupBonus' || entry.field === 'signupBonus_scraped')
    .sort((a, b) => {
      const aTime = a.changedAt?.toMillis?.() ?? 0;
      const bTime = b.changedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

  return bonusChanges.map((entry, index) => {
    const startDate = entry.changedAt?.toDate?.() ?? new Date();
    const nextEntry = bonusChanges[index + 1];
    const endDate = index === 0 ? null : (nextEntry?.changedAt?.toDate?.() ?? null);
    const durationMs = endDate
      ? startDate.getTime() - endDate.getTime()
      : Date.now() - startDate.getTime();
    const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
    const newVal = String(entry.newValue ?? '');

    return {
      id: `offer-${index}`,
      bonusAmount: newVal,
      spendRequirement: '',
      timeframe: '',
      startDate,
      endDate,
      durationDays,
    };
  });
}

export function useCardDetail(cardId: string | null): UseCardDetailResult {
  const [card, setCard] = useState<CardDocument | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cardId) {
      setCard(null);
      setChangeHistory([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    let cardLoaded = false;
    let historyLoaded = false;
    const checkLoaded = () => {
      if (cardLoaded && historyLoaded) setLoading(false);
    };

    const unsubCard = cardService.subscribeToCard(
      cardId,
      (doc) => { setCard(doc); cardLoaded = true; checkLoaded(); },
      (err) => { setError(err); setLoading(false); }
    );

    const unsubHistory = cardService.subscribeToChangeHistory(
      cardId,
      (entries) => { setChangeHistory(entries); historyLoaded = true; checkLoaded(); },
      (err) => { setError(err); setLoading(false); }
    );

    return () => { unsubCard(); unsubHistory(); };
  }, [cardId]);

  const detailData = useMemo(() => extractDetailData(card), [card]);
  const offerHistory = useMemo(() => computeOfferHistory(changeHistory), [changeHistory]);

  const updateDetail = useCallback(
    async (fields: Partial<CardDetailData>): Promise<void> => {
      if (!cardId) throw new Error('No card selected');
      await cardService.updateCard({ cardId, fields });
    },
    [cardId]
  );

  return { card, changeHistory, loading, error, detailData, offerHistory, updateDetail };
}
