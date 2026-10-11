import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  callCreateArticle,
  callUpdateArticleStatus,
  callUpdateArticle,
  callPublishToWebflow,
  callUnpublishFromWebflow,
  callGenerateArticleDraft,
  callGenerateTopicResearch,
  callGenerateSeoResearch,
  callAddToRefreshQueue,
  callManageTasks,
  callRestoreArticleVersion,
  type UpdateArticleUpdates,
} from '../services/articleService';
import type {
  CreateArticleInput,
  ArticleStatus,
  PublishToWebflowOutput,
  GenerateArticleDraftInput,
  GenerateTopicResearchInput,
  ResearchBrief,
  AddToRefreshQueueInput,
  ManageTasksInput,
  ManageTasksOutput,
} from '../types';

export function useArticleMutations() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, Error | null>>({});

  const withLoading = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setError((prev) => ({ ...prev, [key]: null }));
    try {
      const result = await fn();
      setLoading((prev) => ({ ...prev, [key]: false }));
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError((prev) => ({ ...prev, [key]: e }));
      setLoading((prev) => ({ ...prev, [key]: false }));
      toast.error('Operation failed', { description: e.message });
      throw e;
    }
  }, []);

  const createArticle = useCallback(
    (input: CreateArticleInput) =>
      withLoading('createArticle', () => callCreateArticle(input)),
    [withLoading]
  );

  const updateStatus = useCallback(
    (articleId: string, newStatus: ArticleStatus) =>
      withLoading('updateStatus', () => callUpdateArticleStatus(articleId, newStatus)),
    [withLoading]
  );

  const updateArticle = useCallback(
    (articleId: string, updates: UpdateArticleUpdates) =>
      withLoading('updateArticle', () => callUpdateArticle(articleId, updates)),
    [withLoading]
  );

  const publishToWebflow = useCallback(
    (articleId: string): Promise<PublishToWebflowOutput> =>
      withLoading('publishToWebflow', () => callPublishToWebflow(articleId)),
    [withLoading]
  );

  const unpublishFromWebflow = useCallback(
    (articleId: string): Promise<{ success: boolean }> =>
      withLoading('unpublishFromWebflow', () => callUnpublishFromWebflow(articleId)),
    [withLoading]
  );

  const generateDraft = useCallback(
    (input: GenerateArticleDraftInput) =>
      withLoading('generateDraft', () => callGenerateArticleDraft(input)),
    [withLoading]
  );

  const generateResearch = useCallback(
    (input: GenerateTopicResearchInput): Promise<ResearchBrief> =>
      withLoading('generateResearch', () => callGenerateTopicResearch(input)),
    [withLoading]
  );

  const addToRefreshQueue = useCallback(
    (input: AddToRefreshQueueInput) =>
      withLoading('addToRefreshQueue', () => callAddToRefreshQueue(input)),
    [withLoading]
  );

  const manageTasks = useCallback(
    (input: ManageTasksInput): Promise<ManageTasksOutput> =>
      withLoading('manageTasks', () => callManageTasks(input)),
    [withLoading]
  );

  const restoreVersion = useCallback(
    (articleId: string, versionId: string) =>
      withLoading('restoreVersion', () => callRestoreArticleVersion(articleId, versionId)),
    [withLoading]
  );

  const generateSeoResearch = useCallback(
    (articleId: string, targetKeyword: string) =>
      withLoading('generateSeoResearch', () => callGenerateSeoResearch({ articleId, targetKeyword })),
    [withLoading]
  );

  return {
    createArticle,
    updateStatus,
    updateArticle,
    publishToWebflow,
    unpublishFromWebflow,
    generateDraft,
    generateResearch,
    generateSeoResearch,
    addToRefreshQueue,
    manageTasks,
    restoreVersion,
    loading,
    error,
  };
}
