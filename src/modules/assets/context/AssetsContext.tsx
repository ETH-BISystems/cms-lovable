/**
 * AssetsContext
 *
 * Provides asset state and operations to all components in the assets module.
 * Aggregates all hooks into a single context for easy access.
 * Manages filters, sort option, and view mode state.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAssets, UseAssetsResult } from '../hooks/useAssets';
import { useAssetUpload, UseAssetUploadResult } from '../hooks/useAssetUpload';
import { useAIIntake, UseAIIntakeResult } from '../hooks/useAIIntake';
import { useAssetMutations, UseAssetMutationsResult } from '../hooks/useAssetMutations';
import { useWebflowSync, UseWebflowSyncResult } from '../hooks/useWebflowSync';
import type { AssetFilters, SortOption } from '../types';

export interface AssetsContextValue {
  // Assets list
  assets: UseAssetsResult;

  // Upload
  upload: UseAssetUploadResult;

  // AI intake
  aiIntake: UseAIIntakeResult;

  // Mutations
  mutations: UseAssetMutationsResult;

  // Webflow sync
  webflowSync: UseWebflowSyncResult;

  // Filters
  filters: AssetFilters;
  setFilters: (filters: AssetFilters) => void;

  // Sort
  sortOption: SortOption;
  setSortOption: (sort: SortOption) => void;

  // View mode
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

const AssetsContext = createContext<AssetsContextValue | undefined>(undefined);

const DEFAULT_FILTERS: AssetFilters = {
  category: '',
  airlines: [],
  hotels: [],
  cabinClass: '',
  experienceTypes: [],
  aircraftTypes: [],
  destinations: [],
  source: '',
  usage: 'all',
  dateFrom: null,
  dateTo: null,
  search: '',
  aiIntakeOnly: false,
  creditCardOnly: false,
};

export interface AssetsProviderProps {
  children: ReactNode;
  initialFilters?: Partial<AssetFilters>;
}

export function AssetsProvider({ children, initialFilters = {} }: AssetsProviderProps) {
  const [filters, setFilters] = React.useState<AssetFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [sortOption, setSortOption] = React.useState<SortOption>('newest-first');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  const assets = useAssets(filters, sortOption);
  const upload = useAssetUpload();
  const aiIntake = useAIIntake();
  const mutations = useAssetMutations();
  const webflowSync = useWebflowSync();

  const value: AssetsContextValue = {
    assets,
    upload,
    aiIntake,
    mutations,
    webflowSync,
    filters,
    setFilters,
    sortOption,
    setSortOption,
    viewMode,
    setViewMode,
  };

  return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

/**
 * Hook to access AssetsContext
 * Must be used within AssetsProvider
 */
export function useAssetsContext(): AssetsContextValue {
  const context = useContext(AssetsContext);

  if (!context) {
    throw new Error('useAssetsContext must be used within AssetsProvider');
  }

  return context;
}
