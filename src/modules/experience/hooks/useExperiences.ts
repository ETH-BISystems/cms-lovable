import { useState, useEffect, useCallback, useMemo } from 'react';
import { subscribeToExperienceDocs } from '../services/experienceService';
import type { ExperienceItem, UseExperiencesOptions, UseExperiencesReturn } from '../types';

const PAGE_SIZE = 50;

function convertFirestoreDoc(doc: Record<string, unknown>): ExperienceItem {
  const data = doc;
  return {
    id: (data.id as string) || '',
    source: (data.sourcePlatform as ExperienceItem['source']) || (data.source as ExperienceItem['source']) || 'voice-note',
    noteType: (data.noteType as ExperienceItem['noteType']) || 'personal',
    contributor: {
      name: (data.contributor as string) || 'Unknown',
      uid: (data.contributorUid as string) || '',
      avatar: ((data.contributor as string) || 'U').slice(0, 2).toUpperCase(),
    },
    accountHandle: data.accountHandle as string | undefined,
    sourceHandle: data.sourceHandle as string | undefined,
    brand: (data.brand as ExperienceItem['brand']) || 'EPM',
    title: data.title as string | undefined,
    transcript: (data.transcriptText as string) || (data.transcript as string) || '',
    duration: data.duration as number | undefined,
    sourceUrl: data.sourceUrl as string | undefined,
    embedHtml: (data.embedHtml as string | null | undefined) ?? undefined,
    audioStoragePath: data.audioStoragePath as string | undefined,
    taxonomy: {
      airline: (data.autoTags as Record<string, unknown>)?.airlines?.[0] as string | undefined,
      hotel: (data.autoTags as Record<string, unknown>)?.hotels?.[0] as string | undefined,
      tags: (data.topicTags as string[]) || [],
    },
    attachedArticles: ((data.attachedArticleIds as string[]) || []).map(id => ({ id, title: '' })),
    embeddedInCount: 0,
    eeatSourceCount: 0,
    aiConfidence: (data.aiConfidence as ExperienceItem['aiConfidence']) ??
      (typeof data.confidence === 'string'
        ? (((data.confidence as string).charAt(0).toUpperCase() + (data.confidence as string).slice(1)) as ExperienceItem['aiConfidence'])
        : undefined),
    transcriptionStatus: (data.transcriptionStatus as ExperienceItem['transcriptionStatus']) || 'completed',
    taggingStatus: (data.taggingStatus as ExperienceItem['taggingStatus']) || 'completed',
    engagementMetrics: (data.engagementMetrics ?? data.engagement) as ExperienceItem['engagementMetrics'],
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    thumbnailAspect: data.thumbnailAspect as ExperienceItem['thumbnailAspect'],
    threadCount: data.threadCount as number | undefined,
    caption: (data.caption as string | undefined) ?? undefined,
    category: data.category as ExperienceItem['category'],
    exportedToNotebookLM: (data.exportedToNotebookLM as boolean) || false,
    createdAt: data.createdAt && typeof (data.createdAt as { toDate?: () => Date }).toDate === 'function'
      ? (data.createdAt as { toDate: () => Date }).toDate()
      : new Date(),
    updatedAt: data.updatedAt && typeof (data.updatedAt as { toDate?: () => Date }).toDate === 'function'
      ? (data.updatedAt as { toDate: () => Date }).toDate()
      : new Date(),
  };
}

export function useExperiences(options?: UseExperiencesOptions): UseExperiencesReturn {
  const [allItems, setAllItems] = useState<ExperienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemLimit, setItemLimit] = useState(PAGE_SIZE);

  const subscribe = useCallback(() => {
    setLoading(true);
    setError(null);

    // production: onSnapshot(query(collection(db, 'experience-transcripts'),
    //   orderBy('createdAt', 'desc'), limit(200))) — the mock store emits the
    //   same raw doc shape, pre-sorted, and re-emits after every mutation.
    const unsubscribe = subscribeToExperienceDocs((docs) => {
      try {
        const items = docs.slice(0, 200).map(doc => convertFirestoreDoc(doc));
        setAllItems(items);
        setLoading(false);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe();
    return () => unsubscribe();
  }, [subscribe]);

  // Apply client-side filters
  const filteredItems = useMemo(() => {
    let items = [...allItems];

    if (options?.source) {
      items = items.filter(i => i.source === options.source);
    }
    if (options?.brand) {
      items = items.filter(i => i.brand === options.brand);
    }
    if (options?.noteType) {
      items = items.filter(i => i.noteType === options.noteType);
    }
    if (options?.contributorUid) {
      items = items.filter(i => i.contributor.uid === options.contributorUid);
    }
    if (options?.accountHandle) {
      items = items.filter(i => i.accountHandle === options.accountHandle);
    }
    if (options?.usageStatus && options.usageStatus !== 'all') {
      if (options.usageStatus === 'attached') items = items.filter(i => i.attachedArticles.length > 0);
      if (options.usageStatus === 'unattached') items = items.filter(i => i.attachedArticles.length === 0);
    }
    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      items = items.filter(i =>
        i.transcript.toLowerCase().includes(q) ||
        (i.title || '').toLowerCase().includes(q) ||
        (i.caption || '').toLowerCase().includes(q) ||
        i.taxonomy.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (options?.taxonomyFilters) {
      for (const [dim, val] of Object.entries(options.taxonomyFilters)) {
        if (val) {
          items = items.filter(i => {
            const taxVal = (i.taxonomy as unknown as Record<string, unknown>)[dim];
            return taxVal === val || i.taxonomy.tags.includes(val);
          });
        }
      }
    }

    return items;
  }, [allItems, options?.source, options?.brand, options?.noteType, options?.contributorUid, options?.accountHandle, options?.usageStatus, options?.searchQuery, options?.taxonomyFilters]);

  const paginatedItems = useMemo(() => filteredItems.slice(0, itemLimit), [filteredItems, itemLimit]);

  // Distinct handles across every loaded item (not just the filtered page),
  // so the handle filter pills stay complete while a filter is active.
  const accountHandles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of allItems) {
      if (item.accountHandle) counts.set(item.accountHandle, (counts.get(item.accountHandle) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([handle, count]) => ({ handle, count }))
      .sort((a, b) => b.count - a.count);
  }, [allItems]);

  const loadMore = useCallback(() => {
    setItemLimit(prev => prev + PAGE_SIZE);
  }, []);

  return {
    items: paginatedItems,
    totalCount: allItems.length,
    filteredCount: filteredItems.length,
    accountHandles,
    allItems,
    loading,
    error,
    retry: subscribe,
    loadMore,
    hasMore: itemLimit < filteredItems.length,
  };
}
