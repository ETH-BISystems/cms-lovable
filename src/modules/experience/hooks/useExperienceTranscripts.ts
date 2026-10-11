import { useState, useEffect, useCallback } from 'react';
import { subscribeToExperienceDocs, type ExperienceDoc } from '../services/experienceService';
import type {
  ExperienceTranscript,
  UseExperienceTranscriptsOptions,
  UseExperienceTranscriptsReturn,
} from '../types';

/**
 * Subscribe to experience transcripts.
 * production: onSnapshot(query(collection(db, 'experience-transcripts'), ...wheres, orderBy('createdAt', 'desc')))
 * Mock: subscribes to the in-memory store and applies the same filters client-side.
 * Returns real-time data ordered by createdAt descending.
 */
export function useExperienceTranscripts(
  options: UseExperienceTranscriptsOptions = {}
): UseExperienceTranscriptsReturn {
  const [transcripts, setTranscripts] = useState<ExperienceTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToExperienceDocs((rawDocs) => {
      try {
        // Client-side equivalents of the production where() constraints
        let docs: ExperienceDoc[] = rawDocs;
        if (options.sourcePlatform) {
          docs = docs.filter((d) => d.sourcePlatform === options.sourcePlatform);
        }
        if (options.contributorUid) {
          docs = docs.filter((d) => d.contributorUid === options.contributorUid);
        }
        if (options.noteType) {
          docs = docs.filter((d) => d.noteType === options.noteType);
        }
        if (options.exportedToNotebookLM !== undefined) {
          docs = docs.filter((d) => d.exportedToNotebookLM === options.exportedToNotebookLM);
        }
        // orderBy('createdAt', 'desc') is applied by the store subscription
        if (options.limit) {
          docs = docs.slice(0, options.limit);
        }

        const mapped: ExperienceTranscript[] = docs.map((data) => ({
          id: data.id,
          sourcePlatform: (data.sourcePlatform || 'dashboard-recording') as ExperienceTranscript['sourcePlatform'],
          sourceUrl: data.sourceUrl,
          embedHtml: data.embedHtml ?? null,
          videoTitle: data.videoTitle,
          publishDate: data.publishDate,
          transcriptText: data.transcriptText || '',
          confidence: data.confidence,
          contributor: data.contributor || '',
          contributorUid: data.contributorUid || '',
          topicTags: data.topicTags || [],
          autoTags: data.autoTags || {
            destinations: [],
            airlines: [],
            hotels: [],
            experienceTypes: [],
            cardKeywords: [],
          },
          attachedArticleIds: data.attachedArticleIds || [],
          exportedToNotebookLM: data.exportedToNotebookLM || false,
          exportedAt: data.exportedAt,
          audioStoragePath: data.audioStoragePath,
          duration: data.duration,
          transcriptionStatus: data.transcriptionStatus,
          taggingStatus: data.taggingStatus,
          noteType: data.noteType,
          title: data.title,
          category: data.category,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }));
        setTranscripts(mapped);
        setLoading(false);
      } catch (err) {
        console.error('[useExperienceTranscripts] Subscription error:', err);
        setError((err as Error).message || 'Failed to load experience transcripts');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [
    options.sourcePlatform,
    options.contributorUid,
    options.noteType,
    options.exportedToNotebookLM,
    options.limit,
    retryCount,
  ]);

  return { transcripts, loading, error, retry };
}
