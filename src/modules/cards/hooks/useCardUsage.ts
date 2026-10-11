import { useEffect, useState } from 'react';
import { cardService } from '../services/cardService';
import type { CardUsageArticle, CardUsageIframe } from '../types';

// production: the two subscriptions below were direct
// onSnapshot(collection(db, 'articles' / 'iframe_instances')) reads; both now
// sit behind the mock cardService. The pure filters are unchanged — they see
// the same document-shaped rows Firestore produced.

/** Firestore `DocumentData` stand-in for the pure filters' signatures. */
type DocumentData = Record<string, unknown>;

// ─── Pure filters (unit-tested in production) ────────────────────────────────

function toDate(v: unknown): Date | null {
  if (v && typeof v === 'object' && 'toMillis' in (v as Record<string, unknown>)) {
    return new Date((v as { toMillis: () => number }).toMillis());
  }
  return null;
}

/** Articles whose cardTags[] contain the card (editorial "cards covered" tags). */
export function filterArticlesUsingCard(
  docs: Array<{ id: string; data: DocumentData }>,
  cardId: string
): CardUsageArticle[] {
  const out: CardUsageArticle[] = [];
  for (const d of docs) {
    const tags = Array.isArray(d.data.cardTags) ? d.data.cardTags : [];
    if (!tags.some((t: { cardId?: string }) => t?.cardId === cardId)) continue;
    out.push({
      id: d.id,
      title: typeof d.data.title === 'string' && d.data.title ? d.data.title : '(untitled)',
      stage: typeof d.data.stage === 'string' ? d.data.stage : undefined,
      publishedUrl: typeof d.data.publishedUrl === 'string' && d.data.publishedUrl ? d.data.publishedUrl : undefined,
      updatedAt: toDate(d.data.updatedAt),
    });
  }
  return out.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}

/** Iframe instances whose cards[] contain the card (embeds placed anywhere). */
export function filterIframesUsingCard(
  docs: Array<{ id: string; data: DocumentData }>,
  cardId: string
): CardUsageIframe[] {
  const out: CardUsageIframe[] = [];
  for (const d of docs) {
    const cards = Array.isArray(d.data.cards) ? d.data.cards : [];
    if (!cards.some((c: { cardId?: string }) => c?.cardId === cardId)) continue;
    const hosts = Array.isArray(d.data.hosts) ? d.data.hosts : [];
    out.push({
      id: d.id,
      type: typeof d.data.type === 'string' ? d.data.type : 'unknown',
      hosts: hosts
        .filter((h: unknown) => h && typeof h === 'object')
        .map((h: Record<string, unknown>) => ({
          collection: String(h.collection ?? ''),
          docId: String(h.docId ?? ''),
          field: String(h.field ?? ''),
          title: String(h.title ?? ''),
        })),
      updatedAt: toDate(d.data.updatedAt),
    });
  }
  return out.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCardUsageResult {
  articles: CardUsageArticle[];
  iframes: CardUsageIframe[];
  loading: boolean;
  error: Error | null;
}

/**
 * Where is this card used? Drives the card detail panel's Articles and
 * Iframes tabs. The deleteCard callable re-checks the same two collections
 * server-side and refuses to delete a card that is still referenced.
 */
export function useCardUsage(cardId: string | null): UseCardUsageResult {
  const [articles, setArticles] = useState<CardUsageArticle[]>([]);
  const [iframes, setIframes] = useState<CardUsageIframe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cardId) {
      setArticles([]);
      setIframes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let articlesReady = false;
    let iframesReady = false;
    const maybeDone = () => {
      if (articlesReady && iframesReady) setLoading(false);
    };

    const unsubArticles = cardService.subscribeToArticleDocs(
      (docs) => {
        setArticles(filterArticlesUsingCard(docs, cardId));
        articlesReady = true;
        maybeDone();
      },
      (err) => setError(err)
    );
    const unsubIframes = cardService.subscribeToIframeInstanceDocs(
      (docs) => {
        setIframes(filterIframesUsingCard(docs, cardId));
        iframesReady = true;
        maybeDone();
      },
      (err) => setError(err)
    );

    return () => {
      unsubArticles();
      unsubIframes();
    };
  }, [cardId]);

  return { articles, iframes, loading, error };
}
