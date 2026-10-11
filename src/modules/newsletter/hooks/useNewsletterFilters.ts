import { useState, useCallback, useMemo } from 'react';
import type {
  EditionFilters,
  CompetitorFilters,
  NewsletterEdition,
  CompetitorNewsletter,
  EditionStatus,
  EditionType,
} from '../types/index';

const DEFAULT_EDITION_FILTERS: EditionFilters = {
  status: 'All',
  search: '',
  editionType: 'All',
};

const DEFAULT_COMPETITOR_FILTERS: CompetitorFilters = {
  competitor: '',
  dateRange: '30d',
  topic: '',
};

/**
 * Manage filter/search state for Past Editions and Competitor Intel tabs.
 * Provides client-side filtering logic for editions and competitor newsletters.
 *
 * Requirements: 8.1, 8.2, 5.7
 */
export function useNewsletterFilters() {
  const [editionFilters, setEditionFiltersState] =
    useState<EditionFilters>(DEFAULT_EDITION_FILTERS);
  const [competitorFilters, setCompetitorFiltersState] =
    useState<CompetitorFilters>(DEFAULT_COMPETITOR_FILTERS);

  const setEditionFilter = useCallback(
    <K extends keyof EditionFilters>(key: K, value: EditionFilters[K]) => {
      setEditionFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setCompetitorFilter = useCallback(
    <K extends keyof CompetitorFilters>(key: K, value: CompetitorFilters[K]) => {
      setCompetitorFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setEditionFiltersState(DEFAULT_EDITION_FILTERS);
    setCompetitorFiltersState(DEFAULT_COMPETITOR_FILTERS);
  }, []);

  /**
   * Client-side filter for editions.
   * Matches status (if not "All") and search text (case-insensitive)
   * against subject line or edition number.
   */
  const filterEditions = useCallback(
    (editions: NewsletterEdition[]): NewsletterEdition[] => {
      return editions.filter((edition) => {
        // Status filter
        if (
          editionFilters.status !== 'All' &&
          edition.status !== (editionFilters.status as EditionStatus)
        ) {
          return false;
        }

        // Edition type filter
        if (
          editionFilters.editionType !== 'All' &&
          edition.editionType !== (editionFilters.editionType as EditionType)
        ) {
          return false;
        }

        // Search text filter
        if (editionFilters.search.trim() !== '') {
          const searchLower = editionFilters.search.toLowerCase();
          const matchesSubject = edition.subject
            .toLowerCase()
            .includes(searchLower);
          const matchesNumber = String(edition.number)
            .toLowerCase()
            .includes(searchLower);
          if (!matchesSubject && !matchesNumber) {
            return false;
          }
        }

        return true;
      });
    },
    [editionFilters],
  );

  /**
   * Client-side filter for competitor newsletters.
   * Matches competitor name, date range, and topic.
   */
  const filterCompetitors = useCallback(
    (newsletters: CompetitorNewsletter[]): CompetitorNewsletter[] => {
      return newsletters.filter((nl) => {
        // Competitor name filter
        if (
          competitorFilters.competitor !== '' &&
          nl.competitor !== competitorFilters.competitor
        ) {
          return false;
        }

        // Date range filter
        if (competitorFilters.dateRange !== 'all') {
          const now = new Date();
          const daysBack =
            competitorFilters.dateRange === '7d' ? 7 : 30;
          const cutoff = new Date(
            now.getTime() - daysBack * 24 * 60 * 60 * 1000,
          );
          if (nl.receivedAt < cutoff) {
            return false;
          }
        }

        // Topic filter
        if (competitorFilters.topic !== '') {
          const topicLower = competitorFilters.topic.toLowerCase();
          const hasMatchingTopic = nl.topics.some((t) =>
            t.toLowerCase().includes(topicLower),
          );
          if (!hasMatchingTopic) {
            return false;
          }
        }

        return true;
      });
    },
    [competitorFilters],
  );

  return {
    editionFilters,
    competitorFilters,
    setEditionFilter,
    setCompetitorFilter,
    clearFilters,
    filterEditions,
    filterCompetitors,
  };
}
