/**
 * MOCK AI Final Processing service — mirrors the production callable client
 * (aiFinalProcessingStatus / updateSettings / runNow / cardProseProcessRun /
 * retryArticle / articleHumaniseRun / testZeroGpt) with in-memory state so
 * the dashboard widget, settings tab and pipeline blocks behave realistically.
 */

import { delay } from '@/services/_delay';
import type {
  AiFinalProcessingSettings,
  AiFinalProcessingStatusResponse,
  CardQueueRunResponse,
  RunNowResponse,
  UpdateSettingsResponse,
  ZeroGptTestResponse,
} from '../types';

const settings: AiFinalProcessingSettings = {
  enabled: true,
  cadence: 'twice_daily',
  timezone: 'Australia/Sydney',
  aiScoreThreshold: 40,
  zeroGptMaxRetries: 3,
  gemmaMaxRetries: 2,
  batchLimit: 10,
};

let queued = 3;
let cardsQueued = 2;

function statusResponse(): AiFinalProcessingStatusResponse {
  return {
    settings: { ...settings },
    queued,
    cardsQueued,
    telemetry: {
      runsLast30Days: 52,
      articlesProcessedLast30Days: 486,
      avgDurationSeconds: 712,
      avgArticlesPerRun: 9.3,
      avgGemmaSecondsPerArticle: 64,
      estimatedGpuHoursPerMonth: 18.4,
    },
    scheduler: { exists: true, schedule: '0 8,20 * * *', timezone: settings.timezone, paused: settings.cadence === 'paused' },
    scheduleTimes: ['08:00', '20:00'],
    nextRuns: [
      new Date(Date.now() + 3 * 3600e3).toISOString(),
      new Date(Date.now() + 15 * 3600e3).toISOString(),
    ],
    recentExecutions: [
      { id: 'exec_1042', mode: 'batch', status: 'succeeded', processed: 9, succeeded: 8, failed: 1, durationSeconds: 640, startedAt: new Date(Date.now() - 10 * 3600e3).toISOString() },
      { id: 'exec_1041', mode: 'batch', status: 'succeeded', processed: 11, succeeded: 11, failed: 0, durationSeconds: 755, startedAt: new Date(Date.now() - 22 * 3600e3).toISOString() },
      { id: 'exec_1040', mode: 'single', status: 'failed', processed: 1, succeeded: 0, failed: 1, durationSeconds: 98, startedAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
    ],
  };
}

export async function getStatus(): Promise<AiFinalProcessingStatusResponse> {
  await delay(350);
  return statusResponse();
}

export async function updateSettings(
  patch: Partial<AiFinalProcessingSettings>,
): Promise<UpdateSettingsResponse> {
  await delay(400);
  Object.assign(settings, patch);
  return { success: true, settings: { ...settings }, schedulerActions: ['schedule updated'], schedulerError: null };
}

export async function runNow(): Promise<RunNowResponse> {
  await delay(500);
  const processed = queued;
  queued = 0;
  return {
    success: true,
    started: true,
    queued: processed,
    message: processed > 0 ? `Mock run started for ${processed} article(s).` : 'Queue is empty — nothing to run.',
    executionId: processed > 0 ? 'exec_mock_now' : undefined,
  };
}

export async function runCardQueueNow(): Promise<CardQueueRunResponse> {
  await delay(500);
  const started = cardsQueued > 0;
  cardsQueued = 0;
  return {
    success: true,
    started,
    executionId: started ? 'exec_mock_cards' : null,
    message: started ? 'Mock card prose queue run started.' : 'Card queue is empty.',
  };
}

export async function retryArticle(_articleId: string): Promise<{ success: boolean; executionId: string | null }> {
  await delay(400);
  queued += 1;
  return { success: true, executionId: 'exec_mock_retry' };
}

export async function runHumanise(_articleId: string): Promise<{ success: boolean; queued: boolean; executionId: string | null }> {
  await delay(400);
  return { success: true, queued: true, executionId: 'exec_mock_humanise' };
}

export async function testZeroGpt(): Promise<ZeroGptTestResponse> {
  await delay(600);
  return { status: 'connected', message: 'ZeroGPT mock connection OK (credits: 1,240).', details: { mock: true } };
}

// ── Live queue-count subscriptions ───────────────────────────────────────────
// Production reads these from onSnapshot queries on the articles collection.
// Wired to the pipeline module's in-memory article store so counts stay live
// as articles move through stages and processing states.

import { subscribeToArticles } from '@/modules/pipeline/services/firestoreSubscriptions';
import type { PipelineArticle } from '@/modules/pipeline/types';

const ACTIVE_STATUSES = ['queued', 'zerogpt_processing', 'gemma_processing', 'validating'];
const IN_FLIGHT = ['zerogpt_processing', 'gemma_processing', 'validating'];
/** The watermark-removal phase: the dedicated stage plus legacy rows parked
 * in Publish from before the stage existed (the server sweep covers both). */
const WATERMARK_PHASE_STAGES = ['Watermark Removal', 'Publish'];

type ArticleProcessingFields = Pick<PipelineArticle, 'stage'> & {
  finalProcessing?: { status?: string } | null;
};

export function subscribeToQueueCounts(listener: (counts: Record<string, number>) => void): () => void {
  return subscribeToArticles((articles) => {
    const counts: Record<string, number> = {};
    for (const article of articles as ArticleProcessingFields[]) {
      const status = article.finalProcessing?.status;
      if (status && ACTIVE_STATUSES.includes(status)) {
        counts[status] = (counts[status] ?? 0) + 1;
      }
    }
    listener(counts);
  });
}

export function subscribeToWatermarkPhaseCounts(listener: (pending: number, inFlight: number) => void): () => void {
  return subscribeToArticles((articles) => {
    let pending = 0;
    let inFlight = 0;
    for (const article of articles as ArticleProcessingFields[]) {
      if (!WATERMARK_PHASE_STAGES.includes(article.stage)) continue;
      const status = article.finalProcessing?.status;
      if (!status || status === 'queued') pending += 1;
      else if (IN_FLIGHT.includes(status)) inFlight += 1;
    }
    listener(pending, inFlight);
  });
}
