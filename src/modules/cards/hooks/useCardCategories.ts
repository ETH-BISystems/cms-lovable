import { useState, useEffect, useCallback } from 'react';
import { cardService } from '../services/cardService';
import { DEFAULT_CARD_CATEGORIES } from '../types';

// Card categories are managed at runtime in the `settings/cardCategories`
// document ({ list: string[] }). production: reads subscribed to Firestore
// directly; writes flowed through the `settingsUpdate` callable Cloud
// Function (cardCategories is editor-writable). Both seams now sit behind
// the mock cardService.

interface UseCardCategoriesResult {
  categories: string[];
  loading: boolean;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
}

export function useCardCategories(): UseCardCategoriesResult {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CARD_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = cardService.subscribeToCardCategories(
      (list) => {
        const clean = Array.isArray(list)
          ? list.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
          : [];
        setCategories(clean.length > 0 ? clean : DEFAULT_CARD_CATEGORIES);
        setLoading(false);
      },
      () => {
        // Writer/Viewer roles cannot read settings docs — fall back to defaults
        setCategories(DEFAULT_CARD_CATEGORIES);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // production: httpsCallable(functions, 'settingsUpdate')
  //   ({ settingId: 'cardCategories', data: { list } })
  const saveList = useCallback(async (list: string[]) => {
    await cardService.saveCardCategories(list);
  }, []);

  const addCategory = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Category name is empty');
      if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
      await saveList([...categories, trimmed]);
    },
    [categories, saveList]
  );

  const removeCategory = useCallback(
    async (name: string) => {
      await saveList(categories.filter((c) => c !== name));
    },
    [categories, saveList]
  );

  return { categories, loading, addCategory, removeCategory };
}
