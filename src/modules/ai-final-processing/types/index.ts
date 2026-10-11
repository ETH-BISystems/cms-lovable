/**
 * AI Final Processing — shared frontend types.
 * Mirrors functions/src/ai-final-processing/types.ts.
 */

/** Per-article processing status (articles/{id}.finalProcessing.status). */
export type FinalProcessingStatus =
  | 'queued'
  | 'zerogpt_processing'
  | 'gemma_processing'
  | 'validating'
  | 'ready_to_publish'
  | 'processing_failed';

export type ProcessingCadence =
  | 'twice_daily'
  | 'three_times_daily'
  | 'per_article'
  | 'paused';

export interface AiFinalProcessingSettings {
  enabled: boolean;
  cadence: ProcessingCadence;
  timezone: string;
  aiScoreThreshold: number;
  zeroGptMaxRetries: number;
  gemmaMaxRetries: number;
  batchLimit: number;
}

/** articles/{id}.finalProcessing sub-object. */
export interface ArticleFinalProcessing {
  status: FinalProcessingStatus;
  executionId?: string | null;
  attempts: number;
  initialAiScore?: number | null;
  postHumanizeAiScore?: number | null;
  finalAiScore?: number | null;
  zeroGptAttempts: number;
  gemmaAttempts: number;
  keywordsTotal: number;
  keywordsPreserved: number;
  urlsVerified: boolean;
  failureReason?: string | null;
  failureStage?: string | null;
  rewrittenContent?: string | null;
  reviewRequired?: boolean;
  completedAt?: unknown;
}

/**
 * CMS-131: the Humanise pipeline stage (Write Article → Humanise → Review &
 * Edit) — same detect → Gemma rewrite → re-detect loop as AI Final
 * Processing, run right after the draft lands. Stored at
 * articles/{id}.humanise; terminal statuses passed/failed.
 */
export type HumaniseStatus =
  | 'queued'
  | 'zerogpt_processing'
  | 'gemma_processing'
  | 'validating'
  | 'passed'
  | 'failed';

/** articles/{id}.humanise sub-object. */
export interface ArticleHumanise {
  status: HumaniseStatus;
  executionId?: string | null;
  attempts: number;
  /** ZeroGPT fakePercentage on the Claude-written draft (0-100). */
  initialAiScore?: number | null;
  /** ZeroGPT score after the Gemma humanise pass. */
  finalAiScore?: number | null;
  zeroGptAttempts: number;
  gemmaAttempts: number;
  keywordsTotal: number;
  keywordsPreserved: number;
  urlsVerified: boolean;
  failureReason?: string | null;
  failureStage?: string | null;
  rewrittenContent?: string | null;
  reviewRequired?: boolean;
  completedAt?: unknown;
}

export interface ExecutionTelemetry {
  runsLast30Days: number;
  articlesProcessedLast30Days: number;
  avgDurationSeconds: number | null;
  avgArticlesPerRun: number | null;
  avgGemmaSecondsPerArticle: number | null;
  estimatedGpuHoursPerMonth: number | null;
}

export interface RecentExecution {
  id: string;
  mode: 'batch' | 'single';
  status: string;
  processed: number;
  succeeded: number;
  failed: number;
  durationSeconds: number | null;
  startedAt: string | null;
}

export interface AiFinalProcessingStatusResponse {
  settings: AiFinalProcessingSettings;
  queued: number;
  /** Cards waiting in the prose humanise queue (card_data.proseProcessing). */
  cardsQueued: number;
  telemetry: ExecutionTelemetry;
  scheduler: { exists: boolean; schedule?: string; timezone?: string; paused?: boolean; error?: string | null };
  scheduleTimes: string[];
  nextRuns: string[];
  recentExecutions: RecentExecution[];
}

export interface RunNowResponse {
  success: boolean;
  started: boolean;
  queued: number;
  message: string;
  executionId?: string;
}

/** cardProseProcessRun response (card prose humanise queue). */
export interface CardQueueRunResponse {
  success: boolean;
  started: boolean;
  executionId: string | null;
  message: string;
}

export interface UpdateSettingsResponse {
  success: boolean;
  settings: AiFinalProcessingSettings;
  schedulerActions: string[];
  schedulerError: string | null;
}

export interface ZeroGptTestResponse {
  status: 'connected' | 'not_connected' | 'error';
  message: string;
  details: Record<string, unknown>;
}

export const CADENCE_META: Record<ProcessingCadence, { label: string; hint: string; badge?: string }> = {
  twice_daily: { label: 'Twice daily', hint: 'Recommended for ~50 articles/day. Gemma starts about 2 times/day (08:00 + 20:00).', badge: 'Recommended' },
  three_times_daily: { label: 'Three times daily', hint: 'Fresher processing, about 3 GPU starts/day (08:00, 14:00, 20:00).' },
  per_article: { label: 'Per article / Immediate', hint: 'Highest cost option — each approved article may start the GPU model separately.', badge: 'Higher GPU usage' },
  paused: { label: 'Paused', hint: 'No automatic processing. Queued articles stay queued; Run Now still works.' },
};
