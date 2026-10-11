// MOCK — in-memory card service (ported from the Firestore-backed original).
//
// production: reads used `onSnapshot` over the `card_data` collection (plus
// the per-card `change_history` subcollection); mutations were callable Cloud
// Functions (`addCard`, `updateCard`, `webflowAuthorsList`, `setOverride`,
// `setCardPublishState`, `deleteCard`, `scanCardUrl`, `updateCardGlobalFields`).
// Every callable name is preserved in comments above its mock. The in-memory
// store re-emits to subscribers after each mutation, mirroring onSnapshot.

import { delay } from '@/services/_delay';
import { searchIncludes } from '@/platform/utils/searchText';
import type {
  CardDocument,
  CardFilters,
  ChangeHistoryEntry,
  AddCardInput,
  AddCardResult,
  UpdateCardInput,
  SetOverrideInput,
  ScanCardUrlInput,
  ScanCardUrlResult,
  SetCardPublishStateInput,
  SetCardPublishStateResult,
  DeleteCardInput,
  DeleteCardResult,
  WebflowAuthor,
  ScraperStatus,
} from '../types';
import {
  onCardStoreChange,
  getCards,
  getCard,
  getChangeHistory,
  getArticlesUsingCardDocs,
  getIframeInstancesDocs,
  getCardCategories,
  getCardGlobalFields,
  getScraperStatus,
  getWebflowAuthors,
  storeAddCard,
  storeUpdateCard,
  storeSetOverride,
  storeSetPublishState,
  storeDeleteCard,
  storeSaveCardCategories,
  storeSaveCardGlobalFields,
} from './mockCardStore';

function applyFilters(cards: CardDocument[], filters: Partial<CardFilters>): CardDocument[] {
  let result = cards;
  // production: status/issuer filtered server-side via where() clauses
  if (filters.status) result = result.filter((c) => c.status === filters.status);
  if (filters.issuer) result = result.filter((c) => c.issuer === filters.issuer);
  // Client-side filters — tolerant of legacy documents missing fields
  if (filters.category) result = result.filter((c) => c.category === filters.category);
  if (filters.search) {
    // Trademark-insensitive: "blue business plus" must match
    // "American Express Blue Business® Plus Credit Card" (2026-09-10).
    result = result.filter(
      (c) =>
        searchIncludes(c.name, filters.search!) ||
        searchIncludes(c.issuer, filters.search!) ||
        searchIncludes(c.category, filters.search!)
    );
  }
  return result;
}

export const cardService = {
  // production: onSnapshot(query(collection(db, 'card_data'), ...wheres))
  subscribeToCards(
    filters: Partial<CardFilters>,
    onData: (cards: CardDocument[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(applyFilters(getCards(), filters));
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 60);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(doc(db, 'card_data', cardId))
  subscribeToCard(
    cardId: string,
    onData: (card: CardDocument | null) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getCard(cardId));
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 60);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(query(collection(db, 'card_data', cardId, 'change_history'),
  //   orderBy('changedAt', 'desc'), limit(100)))
  subscribeToChangeHistory(
    cardId: string,
    onData: (entries: ChangeHistoryEntry[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getChangeHistory(cardId));
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 60);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // ─── Settings / status subscriptions (direct doc reads in production) ──────

  // production: onSnapshot(doc(db, 'settings', 'cardCategories'))
  subscribeToCardCategories(
    onData: (list: string[]) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getCardCategories());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 40);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(doc(db, 'settings', 'card-global-fields'))
  subscribeToCardGlobalFields(
    onData: (fields: { ourMission: string; ratingMethodology: string }) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getCardGlobalFields());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 40);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(doc(db, 'scraper_status', 'current'))
  subscribeToScraperStatus(
    onData: (status: ScraperStatus) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getScraperStatus());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 40);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(collection(db, 'articles')) — full collection; the
  // hook's pure filter picks the docs tagging the card.
  subscribeToArticleDocs(
    onData: (docs: Array<{ id: string; data: Record<string, unknown> }>) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getArticlesUsingCardDocs());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 50);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // production: onSnapshot(collection(db, 'iframe_instances'))
  subscribeToIframeInstanceDocs(
    onData: (docs: Array<{ id: string; data: Record<string, unknown> }>) => void,
    onError: (err: Error) => void
  ): () => void {
    const emit = () => {
      try {
        onData(getIframeInstancesDocs());
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };
    const timer = setTimeout(emit, 50);
    const unsub = onCardStoreChange(emit);
    return () => {
      clearTimeout(timer);
      unsub();
    };
  },

  // ─── Mutations (callable Cloud Functions in production) ────────────────────

  // production: httpsCallable(functions, 'addCard')
  async addCard(input: AddCardInput): Promise<AddCardResult> {
    await delay(400);
    const id = storeAddCard({
      name: input.name,
      issuer: input.issuer,
      category: input.category,
      scrapeFrequency: input.scrapeFrequency,
      issuerUrl: input.issuerUrl,
      ratesTermsUrl: input.ratesTermsUrl,
      affiliateLink: input.affiliateLink,
      notes: input.notes,
      cardImageUrl: input.cardImageUrl ?? '',
      sourceUrls: input.sourceUrls ?? [],
      tpgUrl: input.tpgUrl ?? '',
      dailyDropUrl: input.dailyDropUrl ?? '',
      omaatUrl: input.omaatUrl ?? '',
      annualFee_scraped: input.annualFee,
      signupBonus_scraped: input.signupBonus,
      bonusSpendReq_scraped: input.bonusSpendReq,
    });
    return { id };
  },

  // production: httpsCallable(functions, 'updateCard')
  async updateCard(input: UpdateCardInput): Promise<void> {
    await delay(300);
    storeUpdateCard(input.cardId, { ...input.fields });
  },

  /**
   * Live list of the Webflow Authors collection for the Card Overview author
   * dropdown — authors are managed in Webflow; the CMS never keeps its own copy.
   * production: httpsCallable(functions, 'webflowAuthorsList')
   */
  async listWebflowAuthors(): Promise<{ authors: WebflowAuthor[] }> {
    await delay(200);
    return { authors: getWebflowAuthors() };
  },

  // production: httpsCallable(functions, 'setOverride') — dual-value override pattern
  async setOverride(input: SetOverrideInput): Promise<void> {
    await delay(200);
    storeSetOverride(input.cardId, input.field, input.value, input.isOverriding);
  },

  // production: httpsCallable(functions, 'setCardPublishState')
  async setCardPublishState(input: SetCardPublishStateInput): Promise<SetCardPublishStateResult> {
    await delay(250);
    storeSetPublishState(input.cardId, input.publishState);
    return { success: true };
  },

  /**
   * Hard-delete a card and its synced Webflow items. production:
   * httpsCallable(functions, 'deleteCard') — refuses (failed-precondition,
   * details = CardUsageDetails) while the card is still embedded by any
   * iframe instance or tagged on any article. The mock throws the same shape.
   */
  async deleteCard(input: DeleteCardInput): Promise<DeleteCardResult> {
    await delay(350);
    storeDeleteCard(input.cardId);
    return { success: true, deletedWebflowItems: 1 };
  },

  // production: httpsCallable(functions, 'scanCardUrl', { timeout: 300_000 })
  async scanCardUrl(input: ScanCardUrlInput): Promise<ScanCardUrlResult> {
    await delay(1500);
    const host = (() => {
      try {
        return new URL(input.issuerUrl).hostname.replace(/^www\./, '');
      } catch {
        return 'issuer.example';
      }
    })();
    return {
      cardName: 'Scanned Card',
      issuer: host.split('.')[0].replace(/^\w/, (c) => c.toUpperCase()),
      annualFee: '$95',
      signupBonus: 'Earn 60,000 bonus points after you spend $4,000 in the first 3 months',
      spendReq: '$4,000 in 3 months',
      timeframe: '3 months',
      apr: '20.49% – 27.49% variable',
      benefitsCount: 6,
      earnCategoriesCount: 4,
      foreignTransactionFee: 'None',
      cardPros: ['Strong welcome offer', 'No foreign transaction fees'],
      cardCons: ['Annual fee after year one'],
      recommendedCredit: 'Good–Excellent (690–850)',
    };
  },

  // production: httpsCallable(functions, 'updateCardGlobalFields')
  async updateCardGlobalFields(input: { ourMission?: string; ratingMethodology?: string }): Promise<void> {
    await delay(250);
    storeSaveCardGlobalFields(input);
  },

  // production: httpsCallable(functions, 'settingsUpdate') with
  // { settingId: 'cardCategories', data: { list } }
  async saveCardCategories(list: string[]): Promise<void> {
    await delay(200);
    storeSaveCardCategories(list);
  },
};
