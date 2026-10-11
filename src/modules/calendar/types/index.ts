// Calendar Module — Type Definitions

import type { ArticleStatus, Priority, RevenuePotential } from '@/modules/pipeline';

// ---------------------------------------------------------------------------
// Content Type & Time Slot
// ---------------------------------------------------------------------------

/** The three content categories displayed on the calendar. */
export type ContentType = 'article' | 'newsletter' | 'deal';

/** Time-of-day slot used in Week View rows. */
export type TimeSlot = 'morning' | 'afternoon' | 'evening';

/** Canonical topic cluster list (filter dropdown + Change Cluster menu). */
export const TOPIC_CLUSTERS = [
  'Credit Cards',
  'Points & Miles',
  'Travel Hacking',
  'Hotel Loyalty',
  'Airline Loyalty',
  'Trip Reports',
  'Deals & Alerts',
  'Beginner Guides',
  'Advanced Strategies',
  'News & Updates',
] as const;

/** Cluster-filter value that matches events without a topic cluster. */
export const UNCATEGORISED_CLUSTER = 'Uncategorised';

// ---------------------------------------------------------------------------
// Calendar Event (Firestore: `calendar-events` collection)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  /** Firestore document ID. */
  id: string;
  /** Display title shown on the Content Pill. */
  title: string;
  /** Content type — article, newsletter, or deal. */
  type: ContentType;
  /** Current article status (from Pipeline module). */
  status: ArticleStatus;
  /** Scheduled publish date. */
  date: Date;
  /** Formatted publish time, e.g. '9:00 AM', '1:30 PM'. Null if unset. */
  publishTime: string | null;
  /** Derived time slot from publishTime. Null if publishTime is null. */
  timeSlot: TimeSlot | null;
  /** Assigned team member. */
  assignee: {
    name: string;
    avatar: string;
  };
  /** Article priority level. */
  priority: Priority;
  /** E-E-A-T indicator — true when first-hand experience is sourced. */
  hasExperience: boolean;
  /** SEO target keyword. */
  targetKeyword: string | null;
  /** Revenue potential classification. */
  revenuePotential: RevenuePotential | null;
  /** Topic cluster for collision detection and filtering. */
  topicCluster: string | null;
  /** True when status is not Approved or Published (dashed border). */
  tentative: boolean;
  /** Newsletter edition number (newsletter type only). */
  newsletterNumber: number | null;
  /** Link to the corresponding newsletter edition document (newsletter type only). */
  newsletterEditionId?: string | null;
  /** Deal expiration date (deal type only). */
  dealExpiration: Date | null;
  /** Count of incomplete tasks. */
  tasksRemaining: number | null;
  /** True when article is blocked on experience input. */
  awaitingExperience: boolean;
  /** Link to the corresponding Pipeline article document. */
  pipelineArticleId: string | null;
  /** Live URL after the article is published. */
  publishedUrl: string | null;
  /** UID of the user who created this event. */
  createdBy: string;
  /** Timestamp when the event was created. */
  createdAt: Date;
  /** Timestamp when the event was last updated. */
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface CalendarFilters {
  /** Content type filter — 'all' shows every type. */
  type: 'all' | ContentType;
  /** Topic cluster filter — 'All Clusters' shows every cluster. */
  cluster: string;
}

// ---------------------------------------------------------------------------
// Topic Collision Detection
// ---------------------------------------------------------------------------

export interface TopicCollision {
  id: string;
  type: 'topic_overlap' | 'competitor_timing';
  message: string;
  /** The two conflicting articles. */
  articles: [
    { id: string; title: string; date: Date },
    { id: string; title: string; date: Date },
  ];
}

// ---------------------------------------------------------------------------
// Capacity Planning
// ---------------------------------------------------------------------------

export interface CapacityMetrics {
  weeklyTarget: number;
  monthlyTarget: number;
  weeklyScheduled: number;
  monthlyScheduled: number;
  weeklyPercentage: number;
  monthlyPercentage: number;
}

// ---------------------------------------------------------------------------
// Content Velocity
// ---------------------------------------------------------------------------

export interface DailyVelocity {
  /** Abbreviated day name, e.g. 'Mon', 'Tue'. */
  day: string;
  /** Calendar date for this day. */
  date: Date;
  /** Number of articles published on this day. */
  count: number;
}

export interface VelocityMetrics {
  dailyCounts: DailyVelocity[];
  weeklyTotal: number;
  weeklyTarget: number;
  dailyTarget: number;
  onPace: boolean;
  deficit: number;
}

// ---------------------------------------------------------------------------
// Cloud Function Input / Output Types
// ---------------------------------------------------------------------------

// --- createCalendarEvent ---

export interface CreateCalendarEventInput {
  title: string;
  type: ContentType;
  /** ISO date string. */
  date: string;
  /** Formatted time string, e.g. '9:00 AM'. */
  publishTime: string | null;
  assignee: { name: string; avatar: string };
  priority: Priority;
  hasExperience?: boolean;
  targetKeyword?: string;
  revenuePotential?: RevenuePotential;
  topicCluster?: string;
  newsletterNumber?: number;
  /** ISO date string for deal expiration. */
  dealExpiration?: string;
  pipelineArticleId?: string;
}

export interface CreateCalendarEventOutput {
  eventId: string;
}

// --- updateCalendarEvent ---

export interface UpdateCalendarEventInput {
  eventId: string;
  /** ISO date string. */
  date?: string;
  publishTime?: string;
  assignee?: { name: string; avatar: string };
  priority?: Priority;
  status?: ArticleStatus;
  /** Content type — lets a posting be re-filed under a different filter category. */
  type?: ContentType;
  /** Topic cluster — null clears it (event becomes Uncategorised). */
  topicCluster?: string | null;
}

export interface UpdateCalendarEventOutput {
  success: boolean;
}

// --- deleteCalendarEvent ---

export interface DeleteCalendarEventInput {
  eventId: string;
}

export interface DeleteCalendarEventOutput {
  success: boolean;
}

// --- syncCalendarWithPipeline ---

export interface SyncCalendarInput {
  /** When true, forces a full reconciliation. */
  force?: boolean;
}

export interface SyncCalendarOutput {
  created: number;
  updated: number;
  removed: number;
}

// --- autoScheduleArticles ---

export interface AutoScheduleInput {
  /** Pipeline article IDs to schedule. */
  articleIds: string[];
  /** When true, returns proposed placements without writing anything. */
  preview?: boolean;
}

export interface AutoScheduleOutput {
  scheduled: Array<{
    articleId: string;
    title: string;
    /** ISO date string. */
    date: string;
    publishTime: string;
    reason: string;
  }>;
  /** Token to undo the auto-schedule within 30 seconds. Null in preview mode. */
  undoToken: string | null;
}

// --- undoAutoSchedule ---

export interface UndoAutoScheduleInput {
  undoToken: string;
}

export interface UndoAutoScheduleOutput {
  reverted: number;
}

// --- KPI targets (settings/kpiTargets doc, written by the Settings module) ---

export interface CalendarKpiTargets {
  weeklyTarget: number;
  monthlyTarget: number;
}
