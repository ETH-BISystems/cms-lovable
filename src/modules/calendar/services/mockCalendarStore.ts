/**
 * MOCK-ONLY shared in-memory store for the calendar module — safe to delete
 * when the real backend replaces src/services/*.
 *
 * Production state lives in the Firestore `calendar-events` collection
 * (onSnapshot subscription) and mutations go through the Cloud Functions
 * createCalendarEvent / updateCalendarEvent / deleteCalendarEvent /
 * syncCalendarWithPipeline / autoScheduleArticles / undoAutoSchedule.
 * This store backs the two mock services (firestoreSubscriptions.ts for
 * reads, calendarService.ts for writes) so both share one source of truth
 * and subscribers re-emit after every mutation, like the real onSnapshot.
 */

import type {
  CalendarEvent,
  ContentType,
  TimeSlot,
} from '../types';
import type { ArticleStatus, Priority, RevenuePotential } from '@/modules/pipeline';

// ---------------------------------------------------------------------------
// Helpers (mirror the server-side derivations in the production functions)
// ---------------------------------------------------------------------------

/** Derive the Week View time slot from a formatted publish time ('9:00 AM'). */
export function deriveTimeSlot(publishTime: string | null): TimeSlot | null {
  if (!publishTime) return null;
  const match = publishTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Tentative = anything not yet Approved/Published (dashed border). */
export function deriveTentative(status: ArticleStatus): boolean {
  return status !== 'Approved' && status !== 'Published';
}

function daysFromNow(days: number, hour = 9, minute = 0): Date {
  const d = new Date(Date.now() + days * 864e5);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Seed data — 15 events across last month / this month / next month.
// Assignees reuse the mock auth users (Sarah Mitchell, James Carter,
// Daynis Olman, Emma Rodriguez).
// ---------------------------------------------------------------------------

const SARAH = { name: 'Sarah Mitchell', avatar: 'SM' };
const JAMES = { name: 'James Carter', avatar: 'JC' };
const DAYNIS = { name: 'Daynis Olman', avatar: 'DO' };
const EMMA = { name: 'Emma Rodriguez', avatar: 'ER' };

interface SeedSpec {
  id: string;
  title: string;
  type: ContentType;
  status: ArticleStatus;
  date: Date;
  publishTime: string | null;
  assignee: { name: string; avatar: string };
  priority: Priority;
  hasExperience: boolean;
  targetKeyword: string | null;
  revenuePotential: RevenuePotential | null;
  topicCluster: string | null;
  newsletterNumber: number | null;
  newsletterEditionId?: string | null;
  dealExpiration: Date | null;
  tasksRemaining: number | null;
  awaitingExperience: boolean;
  pipelineArticleId: string | null;
  publishedUrl: string | null;
  createdAt: Date;
}

const SEED_SPECS: SeedSpec[] = [
  // --- Last month -----------------------------------------------------------
  {
    id: 'cal-evt-krisflyer-deval',
    title: 'Krisflyer Devaluation: What Changed and What to Do Now',
    type: 'article',
    status: 'Published',
    date: daysFromNow(-12, 9),
    publishTime: '9:00 AM',
    assignee: SARAH,
    priority: 'High',
    hasExperience: true,
    targetKeyword: 'krisflyer devaluation 2026',
    revenuePotential: 'high',
    topicCluster: 'News & Updates',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-krisflyer-deval',
    publishedUrl: 'https://elitetravelhackers.com/krisflyer-devaluation-2026',
    createdAt: daysFromNow(-20),
  },
  // --- Earlier this month / overdue -----------------------------------------
  {
    id: 'cal-evt-priority-pass-asia',
    title: 'The Best Priority Pass Lounges in Asia-Pacific (2026 Update)',
    type: 'article',
    status: 'Approved',
    date: daysFromNow(-1, 13),
    publishTime: '1:00 PM',
    assignee: JAMES,
    priority: 'Medium',
    hasExperience: true,
    targetKeyword: 'best priority pass lounges asia pacific',
    revenuePotential: 'medium',
    topicCluster: 'Travel Hacking',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-priority-pass-asia',
    publishedUrl: null,
    createdAt: daysFromNow(-8),
  },
  {
    id: 'cal-evt-deal-avios-expired',
    title: 'Expired: 40% Avios Transfer Bonus from Amex MR',
    type: 'deal',
    status: 'Published',
    date: daysFromNow(-2, 6),
    publishTime: '6:00 AM',
    assignee: DAYNIS,
    priority: 'Medium',
    hasExperience: false,
    targetKeyword: null,
    revenuePotential: 'high',
    topicCluster: 'Deals & Alerts',
    newsletterNumber: null,
    dealExpiration: daysFromNow(-1, 23, 59),
    tasksRemaining: null,
    awaitingExperience: false,
    pipelineArticleId: null,
    publishedUrl: 'https://elitetravelhackers.com/deals/amex-avios-40-bonus',
    createdAt: daysFromNow(-4),
  },
  {
    id: 'cal-evt-qsuites-guide',
    title: 'Qatar Qsuites Business Class: The Complete Booking Guide',
    type: 'article',
    status: 'Published',
    date: daysFromNow(-3, 9),
    publishTime: '9:00 AM',
    assignee: SARAH,
    priority: 'High',
    hasExperience: true,
    targetKeyword: 'qatar qsuites booking guide',
    revenuePotential: 'high',
    topicCluster: 'Airline Loyalty',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-qsuites-guide',
    publishedUrl: 'https://elitetravelhackers.com/qatar-qsuites-booking-guide',
    createdAt: daysFromNow(-10),
  },
  // --- This week --------------------------------------------------------------
  {
    id: 'cal-evt-amex-transfer-oct',
    title: 'Amex Membership Rewards Transfer Bonuses — October Roundup',
    type: 'article',
    status: 'Published',
    date: daysFromNow(0, 9),
    publishTime: '9:00 AM',
    assignee: DAYNIS,
    priority: 'High',
    hasExperience: true,
    targetKeyword: 'amex transfer bonus october 2026',
    revenuePotential: 'high',
    topicCluster: 'Points & Miles',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-amex-transfer-oct',
    publishedUrl: 'https://elitetravelhackers.com/amex-transfer-bonuses-october-2026',
    createdAt: daysFromNow(-6),
  },
  {
    id: 'cal-evt-centurion-syd',
    title: 'Amex Centurion Lounge Sydney: First Look Review',
    type: 'article',
    status: 'Approved',
    date: daysFromNow(1, 9),
    publishTime: '9:00 AM',
    assignee: SARAH,
    priority: 'High',
    hasExperience: true,
    targetKeyword: 'centurion lounge sydney review',
    revenuePotential: 'medium',
    topicCluster: 'Credit Cards',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-centurion-syd',
    publishedUrl: null,
    createdAt: daysFromNow(-5),
  },
  {
    id: 'cal-evt-deal-sq-europe',
    title: 'Singapore Airlines Business Sale — MEL/SYD to Europe from $4,899',
    type: 'deal',
    status: 'Approved',
    date: daysFromNow(1, 6),
    publishTime: '6:00 AM',
    assignee: DAYNIS,
    priority: 'High',
    hasExperience: false,
    targetKeyword: null,
    revenuePotential: 'high',
    topicCluster: 'Deals & Alerts',
    newsletterNumber: null,
    dealExpiration: daysFromNow(5, 23, 59),
    tasksRemaining: null,
    awaitingExperience: false,
    pipelineArticleId: null,
    publishedUrl: null,
    createdAt: daysFromNow(-2),
  },
  {
    id: 'cal-evt-chase-524',
    title: "Chase 5/24 Rule Explained: What Counts and What Doesn't",
    type: 'article',
    status: 'In Review',
    date: daysFromNow(2, 13),
    publishTime: '1:00 PM',
    assignee: JAMES,
    priority: 'Medium',
    hasExperience: true,
    targetKeyword: 'chase 5/24 rule',
    revenuePotential: 'medium',
    topicCluster: 'Credit Cards',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 1,
    awaitingExperience: false,
    pipelineArticleId: 'pl-chase-524',
    publishedUrl: null,
    createdAt: daysFromNow(-9),
  },
  {
    id: 'cal-evt-newsletter-87',
    title: 'Weekly Points Digest',
    type: 'newsletter',
    status: 'Approved',
    date: daysFromNow(2, 8),
    publishTime: null,
    assignee: EMMA,
    priority: 'Medium',
    hasExperience: false,
    targetKeyword: null,
    revenuePotential: null,
    topicCluster: null,
    newsletterNumber: 87,
    newsletterEditionId: 'nl-edition-87',
    dealExpiration: null,
    tasksRemaining: null,
    awaitingExperience: false,
    pipelineArticleId: null,
    publishedUrl: null,
    createdAt: daysFromNow(-3),
  },
  {
    id: 'cal-evt-hilton-status',
    title: 'Hilton Honors Status Match: Fast-Track to Diamond in 2026',
    type: 'article',
    status: 'Approved',
    date: daysFromNow(3, 13),
    publishTime: '1:00 PM',
    assignee: EMMA,
    priority: 'Medium',
    hasExperience: false,
    targetKeyword: 'hilton status match diamond',
    revenuePotential: 'high',
    topicCluster: 'Hotel Loyalty',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 2,
    awaitingExperience: false,
    pipelineArticleId: 'pl-hilton-status',
    publishedUrl: null,
    createdAt: daysFromNow(-7),
  },
  {
    id: 'cal-evt-ana-first',
    title: 'Flying ANA First Class to Tokyo with Virgin Australia Points',
    type: 'article',
    status: 'Writing',
    date: daysFromNow(6, 18),
    publishTime: '6:00 PM',
    assignee: JAMES,
    priority: 'High',
    hasExperience: false,
    targetKeyword: 'ana first class points virgin australia',
    revenuePotential: 'high',
    topicCluster: 'Trip Reports',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 4,
    awaitingExperience: true,
    pipelineArticleId: 'pl-ana-first',
    publishedUrl: null,
    createdAt: daysFromNow(-6),
  },
  // --- Later this month --------------------------------------------------------
  {
    id: 'cal-evt-beginner-101',
    title: 'Points & Miles 101: Your First Redemption in 30 Days',
    type: 'article',
    status: 'Approved',
    date: daysFromNow(8, 9),
    publishTime: '9:00 AM',
    assignee: EMMA,
    priority: 'Medium',
    hasExperience: true,
    targetKeyword: 'points and miles for beginners',
    revenuePotential: 'medium',
    topicCluster: 'Beginner Guides',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 0,
    awaitingExperience: false,
    pipelineArticleId: 'pl-beginner-101',
    publishedUrl: null,
    createdAt: daysFromNow(-4),
  },
  {
    id: 'cal-evt-newsletter-88',
    title: 'Weekly Points Digest',
    type: 'newsletter',
    status: 'Approved',
    date: daysFromNow(9, 8),
    publishTime: null,
    assignee: EMMA,
    priority: 'Medium',
    hasExperience: false,
    targetKeyword: null,
    revenuePotential: null,
    topicCluster: null,
    newsletterNumber: 88,
    newsletterEditionId: 'nl-edition-88',
    dealExpiration: null,
    tasksRemaining: null,
    awaitingExperience: false,
    pipelineArticleId: null,
    publishedUrl: null,
    createdAt: daysFromNow(-1),
  },
  {
    id: 'cal-evt-award-sweet-spots',
    title: '7 Award Sweet Spots from Australia You Can Still Book',
    type: 'article',
    status: 'Researching',
    date: daysFromNow(10, 18),
    publishTime: '6:00 PM',
    assignee: JAMES,
    priority: 'Low',
    hasExperience: false,
    targetKeyword: 'award sweet spots australia',
    revenuePotential: 'medium',
    topicCluster: 'Advanced Strategies',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 3,
    awaitingExperience: true,
    pipelineArticleId: 'pl-award-sweet-spots',
    publishedUrl: null,
    createdAt: daysFromNow(-9),
  },
  // --- Next month ---------------------------------------------------------------
  {
    id: 'cal-evt-2027-card-strategy',
    title: "2027 Credit Card Strategy: The Cards We're Keeping",
    type: 'article',
    status: 'Writing',
    date: daysFromNow(25, 9),
    publishTime: '9:00 AM',
    assignee: SARAH,
    priority: 'Medium',
    hasExperience: false,
    targetKeyword: 'best travel credit cards 2027',
    revenuePotential: 'high',
    topicCluster: 'Credit Cards',
    newsletterNumber: null,
    dealExpiration: null,
    tasksRemaining: 5,
    awaitingExperience: false,
    pipelineArticleId: 'pl-2027-card-strategy',
    publishedUrl: null,
    createdAt: daysFromNow(-2),
  },
];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let events: CalendarEvent[] = SEED_SPECS.map((spec) => ({
  ...spec,
  timeSlot: deriveTimeSlot(spec.publishTime),
  tentative: deriveTentative(spec.status),
  createdBy: 'uid_admin_001',
  updatedAt: spec.createdAt,
}));

type Listener = (events: CalendarEvent[]) => void;
const listeners = new Set<Listener>();

/** Current events sorted by date asc (production: orderBy('date', 'asc')). */
export function getEvents(): CalendarEvent[] {
  return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function addEventListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyListeners(): void {
  const snapshot = getEvents();
  listeners.forEach((listener) => listener(snapshot));
}

export function insertEvent(event: CalendarEvent): void {
  events = [...events, event];
  notifyListeners();
}

export function patchEvent(
  eventId: string,
  patch: Partial<CalendarEvent>
): CalendarEvent | null {
  let updated: CalendarEvent | null = null;
  events = events.map((e) => {
    if (e.id !== eventId) return e;
    updated = { ...e, ...patch, id: e.id, updatedAt: new Date() };
    return updated;
  });
  if (updated) notifyListeners();
  return updated;
}

export function removeEvent(eventId: string): boolean {
  const before = events.length;
  events = events.filter((e) => e.id !== eventId);
  const removed = events.length !== before;
  if (removed) notifyListeners();
  return removed;
}

export function findEvent(eventId: string): CalendarEvent | undefined {
  return events.find((e) => e.id === eventId);
}
