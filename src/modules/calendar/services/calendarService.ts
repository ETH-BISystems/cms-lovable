/**
 * MOCK calendar mutation service — mirrors the production
 * services/calendarService.ts callable client with in-memory mutations
 * against mockCalendarStore (subscribers re-emit after each write).
 *
 * Production callables (kept for reference):
 *   createCalendarEvent        → httpsCallable(functions, 'createCalendarEvent')
 *   updateCalendarEvent        → httpsCallable(functions, 'updateCalendarEvent')
 *   deleteCalendarEvent        → httpsCallable(functions, 'deleteCalendarEvent')
 *   syncCalendarWithPipeline   → httpsCallable(functions, 'syncCalendarWithPipeline')
 *   autoScheduleArticles       → httpsCallable(functions, 'autoScheduleArticles')
 *   undoAutoSchedule           → httpsCallable(functions, 'undoAutoSchedule')
 */

import { delay, mockId } from '@/services/_delay';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  CreateCalendarEventOutput,
  UpdateCalendarEventInput,
  UpdateCalendarEventOutput,
  DeleteCalendarEventInput,
  DeleteCalendarEventOutput,
  SyncCalendarInput,
  SyncCalendarOutput,
  AutoScheduleInput,
  AutoScheduleOutput,
  UndoAutoScheduleInput,
  UndoAutoScheduleOutput,
} from '../types';
import {
  deriveTimeSlot,
  deriveTentative,
  findEvent,
  insertEvent,
  patchEvent,
  removeEvent,
} from './mockCalendarStore';

// --- createCalendarEvent ----------------------------------------------------

export async function callCreateCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CreateCalendarEventOutput> {
  await delay(400);
  const now = new Date();
  // Production: the function derives status from the linked pipeline article;
  // newly scheduled approved articles land as 'Approved' (not tentative).
  const status: CalendarEvent['status'] = 'Approved';
  const event: CalendarEvent = {
    id: mockId('cal-evt'),
    title: input.title,
    type: input.type,
    status,
    date: new Date(input.date),
    publishTime: input.publishTime ?? null,
    timeSlot: deriveTimeSlot(input.publishTime ?? null),
    assignee: input.assignee,
    priority: input.priority,
    hasExperience: input.hasExperience ?? false,
    targetKeyword: input.targetKeyword ?? null,
    revenuePotential: input.revenuePotential ?? null,
    topicCluster: input.topicCluster ?? null,
    tentative: deriveTentative(status),
    newsletterNumber: input.newsletterNumber ?? null,
    newsletterEditionId: null,
    dealExpiration: input.dealExpiration ? new Date(input.dealExpiration) : null,
    tasksRemaining: null,
    awaitingExperience: false,
    pipelineArticleId: input.pipelineArticleId ?? null,
    publishedUrl: null,
    createdBy: 'uid_admin_001',
    createdAt: now,
    updatedAt: now,
  };
  insertEvent(event);
  return { eventId: event.id };
}

// --- updateCalendarEvent ----------------------------------------------------

export async function callUpdateCalendarEvent(
  input: UpdateCalendarEventInput
): Promise<UpdateCalendarEventOutput> {
  await delay(350);
  const existing = findEvent(input.eventId);
  if (!existing) throw new Error(`Calendar event not found: ${input.eventId}`);

  const patch: Partial<CalendarEvent> = {};
  if (input.date !== undefined) patch.date = new Date(input.date);
  if (input.publishTime !== undefined) {
    patch.publishTime = input.publishTime;
    patch.timeSlot = deriveTimeSlot(input.publishTime);
  }
  if (input.assignee !== undefined) patch.assignee = input.assignee;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.type !== undefined) patch.type = input.type;
  if (input.topicCluster !== undefined) patch.topicCluster = input.topicCluster;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.tentative = deriveTentative(input.status);
    // Production: publishedUrl is written by the Webflow publish flow; the
    // mock fabricates one so the Publishing Queue "View Live" action appears.
    if (input.status === 'Published' && !existing.publishedUrl) {
      const slug = existing.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);
      patch.publishedUrl = `https://elitetravelhackers.com/${slug}`;
    }
  }

  patchEvent(input.eventId, patch);
  return { success: true };
}

// --- deleteCalendarEvent ----------------------------------------------------

export async function callDeleteCalendarEvent(
  input: DeleteCalendarEventInput
): Promise<DeleteCalendarEventOutput> {
  await delay(350);
  const removed = removeEvent(input.eventId);
  if (!removed) throw new Error(`Calendar event not found: ${input.eventId}`);
  return { success: true };
}

// --- syncCalendarWithPipeline ------------------------------------------------

export async function callSyncCalendarWithPipeline(
  _input: SyncCalendarInput
): Promise<SyncCalendarOutput> {
  await delay(600);
  // Production reconciles pipeline articles + newsletter editions into
  // calendar-events. The mock store is already in sync, so a no-op result.
  return { created: 0, updated: 0, removed: 0 };
}

// --- autoScheduleArticles ------------------------------------------------------

/** Deterministic title pool for pipeline article IDs unknown to the mock. */
const AUTO_SCHEDULE_TITLES = [
  'Velocity Frequent Flyer: Complete Earning Guide',
  'Best Business Class Redemptions to Europe Right Now',
  'Hotel Elite Status: Which Program Is Worth It in 2026',
  'Stopover Rules Explained: Two Trips for One Award',
  'Amex Platinum vs Westpac Altitude Black: Full Comparison',
  'How to Book Round-the-World Awards with Points',
  'Lounge Access Hacks for Domestic Australian Flights',
  'The Complete Guide to Airline Alliance Partners',
];

const AUTO_SCHEDULE_REASONS = [
  'Topic spacing',
  'Velocity balancing',
  'Team workload',
  'Weekend avoidance',
  'Seasonal timing',
  'Competitor timing',
];

const AUTO_SCHEDULE_TIMES = ['9:00 AM', '1:00 PM', '6:00 PM'];
const AUTO_SCHEDULE_ASSIGNEES = [
  { name: 'Sarah Mitchell', avatar: 'SM' },
  { name: 'James Carter', avatar: 'JC' },
  { name: 'Daynis Olman', avatar: 'DO' },
  { name: 'Emma Rodriguez', avatar: 'ER' },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Next weekday (Mon–Fri) at least `minDaysOut` days from now. */
function nextWeekday(minDaysOut: number): Date {
  const d = new Date(Date.now() + minDaysOut * 864e5);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

interface AutoSchedulePlanEntry {
  articleId: string;
  title: string;
  date: Date;
  publishTime: string;
  reason: string;
}

function buildAutoSchedulePlan(articleIds: string[]): AutoSchedulePlanEntry[] {
  return articleIds.map((articleId, index) => {
    const hash = hashString(articleId);
    return {
      articleId,
      title: AUTO_SCHEDULE_TITLES[hash % AUTO_SCHEDULE_TITLES.length],
      // 2-day minimum gap between placements, starting tomorrow.
      date: nextWeekday(1 + index * 2),
      publishTime: AUTO_SCHEDULE_TIMES[hash % AUTO_SCHEDULE_TIMES.length],
      reason: AUTO_SCHEDULE_REASONS[hash % AUTO_SCHEDULE_REASONS.length],
    };
  });
}

/** Server-side undo tokens (production: 30-second undo window). */
const undoTokens = new Map<string, { eventIds: string[]; expiresAt: number }>();

export async function callAutoScheduleArticles(
  input: AutoScheduleInput
): Promise<AutoScheduleOutput> {
  await delay(input.preview ? 700 : 900);
  const plan = buildAutoSchedulePlan(input.articleIds);

  if (input.preview) {
    return {
      scheduled: plan.map((p) => ({
        articleId: p.articleId,
        title: p.title,
        date: p.date.toISOString(),
        publishTime: p.publishTime,
        reason: p.reason,
      })),
      undoToken: null,
    };
  }

  const now = new Date();
  const eventIds: string[] = [];
  plan.forEach((p, index) => {
    const status: CalendarEvent['status'] = 'Approved';
    const event: CalendarEvent = {
      id: mockId('cal-evt-auto'),
      title: p.title,
      type: 'article',
      status,
      date: p.date,
      publishTime: p.publishTime,
      timeSlot: deriveTimeSlot(p.publishTime),
      assignee: AUTO_SCHEDULE_ASSIGNEES[index % AUTO_SCHEDULE_ASSIGNEES.length],
      priority: 'Medium',
      hasExperience: false,
      targetKeyword: null,
      revenuePotential: null,
      topicCluster: null,
      tentative: deriveTentative(status),
      newsletterNumber: null,
      newsletterEditionId: null,
      dealExpiration: null,
      tasksRemaining: null,
      awaitingExperience: false,
      pipelineArticleId: p.articleId,
      publishedUrl: null,
      createdBy: 'uid_admin_001',
      createdAt: now,
      updatedAt: now,
    };
    insertEvent(event);
    eventIds.push(event.id);
  });

  const undoToken = mockId('undo');
  undoTokens.set(undoToken, {
    eventIds,
    expiresAt: Date.now() + 30_000,
  });

  return {
    scheduled: plan.map((p) => ({
      articleId: p.articleId,
      title: p.title,
      date: p.date.toISOString(),
      publishTime: p.publishTime,
      reason: p.reason,
    })),
    undoToken,
  };
}

// --- undoAutoSchedule --------------------------------------------------------

export async function callUndoAutoSchedule(
  input: UndoAutoScheduleInput
): Promise<UndoAutoScheduleOutput> {
  await delay(400);
  const entry = undoTokens.get(input.undoToken);
  if (!entry || entry.expiresAt < Date.now()) {
    undoTokens.delete(input.undoToken);
    throw new Error('Undo window has expired');
  }
  let reverted = 0;
  for (const eventId of entry.eventIds) {
    if (removeEvent(eventId)) reverted += 1;
  }
  undoTokens.delete(input.undoToken);
  return { reverted };
}
