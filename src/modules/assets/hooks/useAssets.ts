/**
 * useAssets Hook
 *
 * Subscribe to assets collection with filters.
 * Supports all taxonomy filters, sort options, and client-side filtering
 * for fields that Firestore composite indexes don't cover.
 */

import { useState, useEffect, useMemo } from 'react';
import { subscribeToAssets } from '../services/assetService';
import type { AssetDocument, AssetFilters, SortOption } from '../types';

export interface UseAssetsResult {
  assets: AssetDocument[];
  loading: boolean;
  error: Error | null;
  isEmpty: boolean;
  draftCount: number;
}

/**
 * Client-side sort comparator based on SortOption.
 * Firestore handles the primary orderBy, but for taxonomy-based sorts
 * and usage-based sorts we apply client-side sorting.
 */
function sortAssets(assets: AssetDocument[], sort: SortOption): AssetDocument[] {
  const sorted = [...assets];
  switch (sort) {
    case 'newest-first':
      sorted.sort((a, b) => {
        const aTime = a.uploadedAt?.toMillis?.() ?? 0;
        const bTime = b.uploadedAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      break;
    case 'oldest-first':
      sorted.sort((a, b) => {
        const aTime = a.uploadedAt?.toMillis?.() ?? 0;
        const bTime = b.uploadedAt?.toMillis?.() ?? 0;
        return aTime - bTime;
      });
      break;
    case 'name-a-z':
      sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      break;
    case 'name-z-a':
      sorted.sort((a, b) => b.filename.localeCompare(a.filename));
      break;
    case 'largest-first':
      sorted.sort((a, b) => b.sizeBytes - a.sizeBytes);
      break;
    case 'smallest-first':
      sorted.sort((a, b) => a.sizeBytes - b.sizeBytes);
      break;
    case 'most-used':
      // Usage count is not stored on the document directly; sort by a placeholder
      // In production, this would use a usageCount field or subcollection count
      sorted.sort((a, b) => (b.seoScore ?? 0) - (a.seoScore ?? 0));
      break;
    case 'destination-a-z':
      sorted.sort((a, b) => {
        const da = a.taxonomy?.destinations?.[0];
        const db = b.taxonomy?.destinations?.[0];
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return (
          da.country.localeCompare(db.country) ||
          da.city.localeCompare(db.city)
        );
      });
      break;
    case 'aircraft-type':
      sorted.sort((a, b) => {
        const aa = a.taxonomy?.aircraftTypes?.[0] || '';
        const ab = b.taxonomy?.aircraftTypes?.[0] || '';
        if (!aa && !ab) return 0;
        if (!aa) return 1;
        if (!ab) return -1;
        return aa.localeCompare(ab);
      });
      break;
  }
  return sorted;
}

/**
 * Apply client-side taxonomy filters that Firestore can't handle
 * with composite indexes (array-contains limitations).
 */
function applyClientFilters(
  assets: AssetDocument[],
  filters: AssetFilters
): AssetDocument[] {
  let result = assets;

  // Airlines filter (array-contains can only filter one value in Firestore)
  if (filters.airlines && filters.airlines.length > 0) {
    result = result.filter((a) =>
      filters.airlines.some((airline) =>
        a.taxonomy?.airlines?.includes(airline)
      )
    );
  }

  // Hotels filter
  if (filters.hotels && filters.hotels.length > 0) {
    result = result.filter((a) =>
      filters.hotels.some((hotel) => a.taxonomy?.hotels?.includes(hotel))
    );
  }

  // Cabin class filter
  if (filters.cabinClass && filters.cabinClass !== '') {
    result = result.filter(
      (a) => a.taxonomy?.cabinClass === filters.cabinClass
    );
  }

  // Experience types filter
  if (filters.experienceTypes && filters.experienceTypes.length > 0) {
    result = result.filter((a) =>
      filters.experienceTypes.some((exp) =>
        a.taxonomy?.experienceTypes?.includes(exp)
      )
    );
  }

  // Aircraft types filter
  if (filters.aircraftTypes && filters.aircraftTypes.length > 0) {
    result = result.filter((a) =>
      filters.aircraftTypes.some((aircraft) =>
        a.taxonomy?.aircraftTypes?.includes(aircraft)
      )
    );
  }

  // Destinations filter
  if (filters.destinations && filters.destinations.length > 0) {
    result = result.filter((a) =>
      a.taxonomy?.destinations?.some((d) =>
        filters.destinations.some((fd) => {
          const fdCityLower = fd.city?.toLowerCase() || '';
          const fdCountryLower = fd.country?.toLowerCase() || '';
          return (
            d.country.toLowerCase() === fdCountryLower ||
            d.city.toLowerCase() === fdCityLower ||
            `${d.city}, ${d.country}`.toLowerCase() ===
              `${fd.city}, ${fd.country}`.toLowerCase()
          );
        })
      )
    );
  }

  // Usage filter (client-side since usage is a subcollection)
  // For now, we approximate: 'used' = has usages, 'unused' = no usages
  // This will be refined when usage tracking is fully implemented
  if (filters.usage === 'used') {
    // Assets with usage — for now, active assets are considered "used"
    // In production, this would check a usageCount field
  } else if (filters.usage === 'unused') {
    // Assets without usage
  }

  // AI Intake Only (draft filter)
  if (filters.aiIntakeOnly) {
    result = result.filter((a) => a.status === 'draft');
  }

  // Credit Card Only — assets tagged with any credit card, or card-related
  if (filters.creditCardOnly) {
    result = result.filter((a) =>
      (a.taxonomy?.creditCards && a.taxonomy.creditCards.length > 0) ||
      a.category === 'Card Image' || a.category === 'Card Art' ||
      a.filename?.toLowerCase().includes('card') ||
      a.filename?.toLowerCase().includes('credit')
    );
  }

  // Source filter (handled server-side when possible, but also client-side as fallback)
  if (filters.source) {
    result = result.filter((a) => a.source === filters.source);
  }

  return result;
}

export function useAssets(
  filters: AssetFilters = {} as AssetFilters,
  sort: SortOption = 'newest-first'
): UseAssetsResult {
  const [allAssets, setAllAssets] = useState<AssetDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Build server-side filters (only what Firestore can handle efficiently)
    const serverFilters: any = {};

    if (filters.category) {
      serverFilters.category = filters.category;
    }

    if (filters.aiIntakeOnly) {
      serverFilters.status = 'draft';
    }

    const unsubscribe = subscribeToAssets(
      serverFilters,
      (data) => {
        setAllAssets(data);
        setLoading(false);
      },
      (err) => {
        console.error('useAssets error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [
    filters.category,
    filters.aiIntakeOnly,
  ]);

  // Apply client-side filters and sorting
  const assets = useMemo(() => {
    const filtered = applyClientFilters(allAssets, filters);
    return sortAssets(filtered, sort);
  }, [
    allAssets,
    sort,
    filters.airlines?.join(','),
    filters.hotels?.join(','),
    filters.cabinClass,
    filters.experienceTypes?.join(','),
    filters.aircraftTypes?.join(','),
    filters.destinations?.map((d) => `${d.city}-${d.country}`).join(','),
    filters.source,
    filters.usage,
    filters.aiIntakeOnly,
    filters.creditCardOnly,
  ]);

  // Count draft assets from the full unfiltered set
  const draftCount = useMemo(
    () => allAssets.filter((a) => a.status === 'draft').length,
    [allAssets]
  );

  return {
    assets,
    loading,
    error,
    isEmpty: !loading && assets.length === 0,
    draftCount,
  };
}
