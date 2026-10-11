import { useState, useCallback } from 'react';
import {
  callCreateEdition,
  callUpdateEditionStatus,
  callUpdateEditionBlocks,
  callSendEdition,
  callScheduleEdition,
  callTestSendEdition,
  callGenerateSubjectLines,
  callRewriteBlock,
  callAutoCurate,
  callGenerateSocialPosts,
  callSyncSubscribers,
  callManageTasks,
  callSaveCompetitorDebrief,
  callSaveTopic,
} from '../services/newsletterService';
import type {
  CreateEditionInput,
  ContentBlock,
  RewriteBlockInput,
  ManageTasksInput,
  SaveCompetitorDebriefInput,
  SaveTopicInput,
  EditionStatus,
  SocialPost,
} from '../types/index';

type MutationKey =
  | 'createEdition'
  | 'updateStatus'
  | 'updateBlocks'
  | 'sendEdition'
  | 'scheduleEdition'
  | 'testSend'
  | 'generateSubjectLines'
  | 'rewriteBlock'
  | 'autoCurate'
  | 'generateSocialPosts'
  | 'syncSubscribers'
  | 'manageTasks'
  | 'saveDebrief'
  | 'saveTopic';

/**
 * Wraps all Cloud Function calls with loading and error state tracking.
 *
 * Requirements: 1.7, 1.9, 1.10, 1.11, 2.7, 10.1
 */
export function useEditionMutations() {
  const [loading, setLoading] = useState<Record<MutationKey, boolean>>({
    createEdition: false,
    updateStatus: false,
    updateBlocks: false,
    sendEdition: false,
    scheduleEdition: false,
    testSend: false,
    generateSubjectLines: false,
    rewriteBlock: false,
    autoCurate: false,
    generateSocialPosts: false,
    syncSubscribers: false,
    manageTasks: false,
    saveDebrief: false,
    saveTopic: false,
  });

  const [error, setError] = useState<Record<MutationKey, Error | null>>({
    createEdition: null,
    updateStatus: null,
    updateBlocks: null,
    sendEdition: null,
    scheduleEdition: null,
    testSend: null,
    generateSubjectLines: null,
    rewriteBlock: null,
    autoCurate: null,
    generateSocialPosts: null,
    syncSubscribers: null,
    manageTasks: null,
    saveDebrief: null,
    saveTopic: null,
  });

  const withTracking = useCallback(
    async <T>(key: MutationKey, fn: () => Promise<T>): Promise<T> => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      setError((prev) => ({ ...prev, [key]: null }));
      try {
        const result = await fn();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError((prev) => ({ ...prev, [key]: error }));
        throw err;
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [],
  );

  const createEdition = useCallback(
    (input: CreateEditionInput) =>
      withTracking('createEdition', () => callCreateEdition(input)),
    [withTracking],
  );

  const updateStatus = useCallback(
    (editionId: string, status: EditionStatus) =>
      withTracking('updateStatus', () =>
        callUpdateEditionStatus(editionId, status),
      ),
    [withTracking],
  );

  const updateBlocks = useCallback(
    (editionId: string, blocks: ContentBlock[]) =>
      withTracking('updateBlocks', () =>
        callUpdateEditionBlocks(editionId, blocks),
      ),
    [withTracking],
  );

  const sendEdition = useCallback(
    (editionId: string) =>
      withTracking('sendEdition', () => callSendEdition(editionId)),
    [withTracking],
  );

  const scheduleEdition = useCallback(
    (editionId: string, scheduledAt: Date, audience: string) =>
      withTracking('scheduleEdition', () =>
        callScheduleEdition(editionId, scheduledAt, audience),
      ),
    [withTracking],
  );

  const testSend = useCallback(
    (editionId: string, testEmail: string) =>
      withTracking('testSend', () =>
        callTestSendEdition(editionId, testEmail),
      ),
    [withTracking],
  );

  const generateSubjectLines = useCallback(
    (editionId: string) =>
      withTracking('generateSubjectLines', () =>
        callGenerateSubjectLines(editionId),
      ),
    [withTracking],
  );

  const rewriteBlock = useCallback(
    (editionId: string, blockId: string, context: RewriteBlockInput['context']) =>
      withTracking('rewriteBlock', () =>
        callRewriteBlock(editionId, blockId, context),
      ),
    [withTracking],
  );

  const autoCurate = useCallback(
    (editionId: string) =>
      withTracking('autoCurate', () => callAutoCurate(editionId)),
    [withTracking],
  );

  const generateSocialPosts = useCallback(
    (editionId: string, platforms: string[]) =>
      withTracking('generateSocialPosts', () =>
        callGenerateSocialPosts(editionId, platforms),
      ),
    [withTracking],
  );

  const syncSubscribers = useCallback(
    () => withTracking('syncSubscribers', () => callSyncSubscribers()),
    [withTracking],
  );

  const manageTasks = useCallback(
    (input: ManageTasksInput) =>
      withTracking('manageTasks', () => callManageTasks(input)),
    [withTracking],
  );

  const saveDebrief = useCallback(
    (data: SaveCompetitorDebriefInput) =>
      withTracking('saveDebrief', () => callSaveCompetitorDebrief(data)),
    [withTracking],
  );

  const saveTopic = useCallback(
    (data: SaveTopicInput) =>
      withTracking('saveTopic', () => callSaveTopic(data)),
    [withTracking],
  );

  return {
    createEdition,
    updateStatus,
    sendEdition,
    scheduleEdition,
    testSend,
    updateBlocks,
    autoCurate,
    generateSubjectLines,
    rewriteBlock,
    generateSocialPosts,
    syncSubscribers,
    manageTasks,
    saveDebrief,
    saveTopic,
    loading: loading as Record<string, boolean>,
    error: error as Record<string, Error | null>,
  };
}
