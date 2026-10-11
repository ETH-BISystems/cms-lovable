import { useState, useCallback, useMemo } from 'react';
import type {
  ExperienceTab,
  ExperienceSource,
  Brand,
  SocialPlatform,
  UsageStatus,
  TaxonomyDimension,
  ExperienceFilterState,
} from '../types';

const DEFAULT_FILTERS: ExperienceFilterState = {
  activeTab: 'all',
  searchQuery: '',
  activeSource: null,
  brandFilter: null,
  teamMemberFilter: null,
  usageStatusFilter: 'all',
  socialPlatformFilter: null,
  accountHandleFilter: null,
  taxonomyFilters: {},
};

export function useExperienceFilters() {
  const [filters, setFilters] = useState<ExperienceFilterState>(DEFAULT_FILTERS);

  const setActiveTab = useCallback((tab: ExperienceTab) => {
    setFilters(prev => ({ ...prev, activeTab: tab, socialPlatformFilter: tab === 'social-posts' ? prev.socialPlatformFilter : null }));
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setFilters(prev => ({ ...prev, searchQuery: q }));
  }, []);

  const setActiveSource = useCallback((s: ExperienceSource | null) => {
    setFilters(prev => ({ ...prev, activeSource: s }));
  }, []);

  const setBrandFilter = useCallback((b: Brand | null) => {
    setFilters(prev => ({ ...prev, brandFilter: b }));
  }, []);

  const setTeamMemberFilter = useCallback((uid: string | null) => {
    setFilters(prev => ({ ...prev, teamMemberFilter: uid }));
  }, []);

  const setUsageStatusFilter = useCallback((s: UsageStatus) => {
    setFilters(prev => ({ ...prev, usageStatusFilter: s }));
  }, []);

  const setSocialPlatformFilter = useCallback((p: SocialPlatform | null) => {
    setFilters(prev => ({ ...prev, socialPlatformFilter: p }));
  }, []);

  const setAccountHandleFilter = useCallback((h: string | null) => {
    setFilters(prev => ({ ...prev, accountHandleFilter: h }));
  }, []);

  const setTaxonomyFilter = useCallback((dimension: TaxonomyDimension, value: string | null) => {
    setFilters(prev => {
      const next = { ...prev.taxonomyFilters };
      if (value) next[dimension] = value;
      else delete next[dimension];
      return { ...prev, taxonomyFilters: next };
    });
  }, []);

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery !== '' ||
      filters.activeSource !== null ||
      filters.brandFilter !== null ||
      filters.teamMemberFilter !== null ||
      filters.usageStatusFilter !== 'all' ||
      filters.socialPlatformFilter !== null ||
      filters.accountHandleFilter !== null ||
      Object.keys(filters.taxonomyFilters).length > 0
    );
  }, [filters]);

  return {
    ...filters,
    setActiveTab,
    setSearchQuery,
    setActiveSource,
    setBrandFilter,
    setTeamMemberFilter,
    setUsageStatusFilter,
    setSocialPlatformFilter,
    setAccountHandleFilter,
    setTaxonomyFilter,
    clearAll,
    hasActiveFilters,
  };
}
