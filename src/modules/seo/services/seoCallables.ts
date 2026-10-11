/**
 * MOCK SEO callables — replaces httpsCallable invocations of the production
 * Cloud Functions (names kept in comments above each mock) with in-memory
 * store mutations so the UI exercises loading states, toasts and
 * re-subscription flows exactly as it will in production.
 */

import { delay } from '@/services/_delay';
import type {
  RunSiteHealthCrawlInput,
  RunSiteHealthCrawlOutput,
  TrackPositionsInput,
  TrackPositionsOutput,
  AuditPageInput,
  AuditPageOutput,
  RunSiteAuditInput,
  RunSiteAuditOutput,
  TrackAIOverviewsInput,
  TrackAIOverviewsOutput,
  SubmitForIndexingInput,
  SubmitForIndexingOutput,
  CreateRedirectInput,
  CreateRedirectOutput,
  UpdateRedirectInput,
  UpdateRedirectOutput,
  DeleteRedirectInput,
  DeleteRedirectOutput,
  TestRedirectInput,
  TestRedirectOutput,
  UpdateAuditScheduleInput,
  UpdateAuditScheduleOutput,
} from '../types';
import { store } from './_mockData';

/** Mock indexing-submit daily quota (production enforces 200/day via GSC). */
let indexingQuota = 200;

export async function callRunSiteHealthCrawl(
  input: RunSiteHealthCrawlInput
): Promise<RunSiteHealthCrawlOutput> {
  // production: httpsCallable(functions, 'seoRunSiteHealthCrawl')
  await delay(600);
  store.touchSiteHealth(input.siteId);
  return { success: true };
}

export async function callTrackPositions(
  input: TrackPositionsInput
): Promise<TrackPositionsOutput> {
  // production: httpsCallable(functions, 'seoTrackPositions')
  await delay(900);
  const keywordsUpdated = store.jitterPositions(input.siteId);
  return { keywordsUpdated };
}

export async function callAuditPage(
  input: AuditPageInput
): Promise<AuditPageOutput> {
  // production: httpsCallable(functions, 'seoAuditPage')
  await delay(700);
  const audit = store.applyPageAudit(input.siteId, input.articleId);
  return { seoScore: audit.seoScore, components: audit.components };
}

export async function callRunSiteAudit(
  input: RunSiteAuditInput
): Promise<RunSiteAuditOutput> {
  // production: httpsCallable(functions, 'seoRunSiteAudit')
  await delay(800);
  const run = store.insertAuditRun(input.siteId, 'Manual', 'admin@elitetravelhackers.com');
  return { runId: run.runId };
}

export async function callTrackAIOverviews(
  input: TrackAIOverviewsInput
): Promise<TrackAIOverviewsOutput> {
  // production: httpsCallable(functions, 'seoTrackAIOverviews')
  await delay(900);
  const keywordsChecked = store.touchAIOverviews(input.siteId);
  return { keywordsChecked };
}

export async function callSubmitForIndexing(
  input: SubmitForIndexingInput
): Promise<SubmitForIndexingOutput> {
  // production: httpsCallable(functions, 'seoSubmitForIndexing')
  await delay(600);
  const submitted = store.markSubmittedForIndexing(input.siteId, input.urls);
  indexingQuota = Math.max(0, indexingQuota - submitted);
  return { submitted, quotaRemaining: indexingQuota };
}

export async function callCreateRedirect(
  input: CreateRedirectInput
): Promise<CreateRedirectOutput> {
  // production: httpsCallable(functions, 'seoCreateRedirect')
  await delay(500);
  const redirect = store.addRedirect(input);
  return { redirectId: redirect.id };
}

export async function callUpdateRedirect(
  input: UpdateRedirectInput
): Promise<UpdateRedirectOutput> {
  // production: httpsCallable(functions, 'seoUpdateRedirect')
  await delay(400);
  store.updateRedirect(input.siteId, input.redirectId, {
    destinationUrl: input.destinationUrl,
    statusCode: input.statusCode,
  });
  return { success: true };
}

export async function callDeleteRedirect(
  input: DeleteRedirectInput
): Promise<DeleteRedirectOutput> {
  // production: httpsCallable(functions, 'seoDeleteRedirect')
  await delay(400);
  store.deleteRedirect(input.siteId, input.redirectId);
  return { success: true };
}

export async function callTestRedirect(
  input: TestRedirectInput
): Promise<TestRedirectOutput> {
  // production: httpsCallable(functions, 'seoTestRedirect')
  await delay(650);
  const redirect = store.getRedirect(input.siteId, input.redirectId);
  if (!redirect) {
    return { working: false, finalUrl: '', hops: 0, details: 'Redirect not found' };
  }
  const working = redirect.status === 'Active';
  const details = working
    ? undefined
    : redirect.status === 'Loop'
      ? 'Redirect loop detected — chain returns to the source URL'
      : 'Destination returned 404 during the last check';
  return {
    working,
    finalUrl: redirect.finalDestination ?? redirect.destinationUrl,
    hops: redirect.chainLength,
    ...(details !== undefined ? { details } : {}),
  };
}

export async function callUpdateAuditSchedule(
  input: UpdateAuditScheduleInput
): Promise<UpdateAuditScheduleOutput> {
  // production: httpsCallable(functions, 'seoUpdateAuditSchedule')
  await delay(500);
  const { siteId, ...config } = input;
  store.saveAuditConfig(siteId, config);
  return { success: true };
}
