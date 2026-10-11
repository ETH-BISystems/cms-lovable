// MOCK — scraper callable invocations (ported from production).
//
// production: `scrapeCard` (TinyFish browses real websites + Claude generates
// editorial content, timeout 900s), `scrapeAllCards` (bulk stealth scrape,
// timeout 3600s), `triggerFOMCScrape` (900s). Here each is an in-memory
// simulation against the mock card store with realistic latency.

import { delay } from '@/services/_delay';
import type { ScrapeCardInput, ScrapeCardResult, ScrapeAllCardsResult } from '../types';
import { storeScrapeCard, storeScrapeAllCards, storeSetScraperRunning } from './mockCardStore';

export const scraperService = {
  // production: httpsCallable(functions, 'scrapeCard', { timeout: 900_000 })
  scrapeCard: async (input: ScrapeCardInput): Promise<ScrapeCardResult> => {
    await delay(1600);
    const outcome = storeScrapeCard(input.cardId);
    return {
      success: true,
      changesDetected: outcome.changesDetected,
      fieldsChanged: outcome.fieldsChanged,
      fieldsUpdated: outcome.fieldsUpdated,
      editorialFieldsFilled: [],
      historyRowsScraped: 0,
    };
  },

  // production: httpsCallable(functions, 'scrapeAllCards', { timeout: 3_600_000 })
  scrapeAllCards: async (): Promise<ScrapeAllCardsResult> => {
    storeSetScraperRunning(true);
    await delay(2500);
    return storeScrapeAllCards();
  },

  // production: httpsCallable(functions, 'triggerFOMCScrape', { timeout: 900_000 })
  triggerFOMCScrape: async (): Promise<void> => {
    await delay(1200);
  },
};
