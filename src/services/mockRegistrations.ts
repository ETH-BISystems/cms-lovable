/**
 * Central cross-module mock-callable registry — imported once by the app
 * shell (`src/routes/_app.tsx`).
 *
 * Some pages call cross-cutting Cloud Functions through the generic
 * `callFunction(name)` facade instead of a typed service import (e.g.
 * keywords pages calling `createArticle` / `addToRefreshQueue`). Those pages
 * register local fallbacks at module scope; this registry installs the
 * authoritative store-backed handlers with `override: true` so the real
 * pipeline mock always wins regardless of module load order.
 */

import { registerMockFunction } from './functionsService';
import {
  callCreateArticle,
  callAddToRefreshQueue,
} from '@/modules/pipeline/services/articleService';

export function ensureCrossModuleMocks(): void {
  // production: httpsCallable(functions, 'createArticle')
  registerMockFunction(
    'createArticle',
    async (payload) => {
      const articleId = await callCreateArticle(payload as Parameters<typeof callCreateArticle>[0]);
      return { success: true, articleId };
    },
    { override: true },
  );

  // production: httpsCallable(functions, 'addToRefreshQueue')
  registerMockFunction(
    'addToRefreshQueue',
    async (payload) => {
      await callAddToRefreshQueue(payload as Parameters<typeof callAddToRefreshQueue>[0]);
      return { success: true };
    },
    { override: true },
  );
}
