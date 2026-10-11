/**
 * MOCK my-tasks service — in-memory replacement for the production Firestore
 * subscriptions and callable functions used by the My Tasks module.
 *
 * Production touchpoints mirrored here (kept as comments for the rewiring pass):
 *  - onSnapshot(query(collection(db, 'article-tasks')))                        → subscribeToTaskDocs
 *  - onSnapshot(query(collection(db, 'articles')))                             → subscribeToArticleDocs
 *  - onSnapshot(query(collection(db, 'task-types')))                           → subscribeToTaskTypeDocs
 *  - onSnapshot(query(collection(db, 'article-tasks', id, 'comments'),
 *      orderBy('createdAt', 'asc')))                                           → subscribeToTaskComments
 *  - onSnapshot(doc(db, 'article-tasks', id))                                  → subscribeToTaskDoc
 *  - onSnapshot(query(collection(db, 'users')))                                → subscribeToTeamMembers
 *  - httpsCallable(functions, 'manageTasks')                                   → manageTasks
 *  - httpsCallable(functions, 'manageTaskTypes')                               → manageTaskTypes
 */

import { delay, mockId } from '@/services/_delay';
import { Timestamp } from '@/services/timestamp';
import type { TaskStatus } from '@/modules/pipeline';

// ── Raw doc shapes (mirror the Firestore documents) ──────────────────────────

export type TaskDocData = Record<string, unknown>;
export type ArticleDocData = Record<string, unknown>;

export interface TaskTypeDoc {
  source: string;
  name: string;
}

export interface TaskCommentDoc {
  id: string;
  text: string;
  author: string;
  authorUid: string;
  createdAt: Timestamp;
}

export interface TeamMemberDoc {
  id: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
}

// ── Seed: articles (titles joined onto tasks by useAllTasks) ─────────────────
// production: `articles` collection — only `title` is read by this module.
// Article ids/titles here mirror the pipeline module's seeded content where
// possible; standalone tasks use the literal id 'standalone' (same convention
// as the production New Task modal).

const articleDocs: Record<string, ArticleDocData> = {
  'art-chase-sapphire-preferred-review': { title: 'Chase Sapphire Preferred Review: 75k Points Welcome Offer' },
  'art-amex-platinum-vs-chase-sapphire': { title: 'Amex Platinum vs Chase Sapphire Reserve: 2026 Showdown' },
  'art-transfer-partner-sweet-spots': { title: 'Transfer Partner Sweet Spots: Maximize Your Points' },
  'art-best-travel-cards-october': { title: 'Best Travel Credit Cards for October 2026' },
  'art-qantas-status-run-guide': { title: 'Qantas Status Run Guide: Double Status Credits 2026' },
  'art-european-lounge-access': { title: 'European Lounge Access: Complete Priority Pass Guide' },
  'art-weekly-debrief-41': { title: 'Weekly Debrief #41: Award Space to Tokyo Opens Up' },
  'art-hyatt-vs-marriott-free-night': { title: 'Hyatt vs Marriott: Which Free Night Certificates Win?' },
};

// ── Seed: article-tasks ──────────────────────────────────────────────────────

const DAY = 864e5;
const now = Date.now();
const ts = (offsetDays: number) => Timestamp.fromMillis(now + offsetDays * DAY);

const taskDocs: Record<string, TaskDocData> = {
  'task_001': {
    articleId: 'art-chase-sapphire-preferred-review',
    name: 'SEO review — Chase Sapphire Preferred review',
    icon: '🔍',
    taskType: 'SEO Review',
    status: 'In Progress' as TaskStatus,
    priority: 'High',
    assignee: 'Sarah Mitchell',
    avatar: '–',
    dueDate: ts(0),
    startDate: ts(-2),
    comments: 2,
    source: 'Blog Engine',
    description: 'Full on-page SEO pass: title tag, meta description, internal links and schema markup before republish.',
    autoAssigned: true,
  },
  'task_002': {
    articleId: 'art-amex-platinum-vs-chase-sapphire',
    name: 'Source hero + comparison card images',
    icon: '🖼️',
    taskType: 'Image Sourcing & Optimization',
    status: 'Pending' as TaskStatus,
    priority: 'Medium',
    assignee: 'James Carter',
    avatar: '–',
    dueDate: ts(3),
    comments: 0,
    source: 'Blog Engine',
    description: 'Hero image plus side-by-side card art for both cards. Compress to WebP, alt text required.',
  },
  'task_003': {
    articleId: 'art-transfer-partner-sweet-spots',
    name: 'Write draft — transfer partner sweet spots',
    icon: '✍️',
    taskType: 'Write Draft',
    status: 'In Progress' as TaskStatus,
    priority: 'High',
    assignee: 'Emma Rodriguez',
    avatar: '–',
    dueDate: ts(-1),
    startDate: ts(-5),
    comments: 1,
    source: 'Blog Engine',
    description: '1,800–2,200 words. Cover airline transfer ratios, hotel exceptions and the three highest-value redemptions.',
    autoAssigned: true,
  },
  'task_004': {
    articleId: 'art-best-travel-cards-october',
    name: 'Refresh stale offer terms — October rankings',
    icon: '🔄',
    taskType: 'Update Stale Content',
    status: 'Blocked' as TaskStatus,
    priority: 'High',
    assignee: 'Daynis Olman',
    avatar: '–',
    dueDate: ts(-3),
    startDate: ts(-7),
    comments: 3,
    source: 'Blog Engine',
    blockReason: 'Waiting on updated welcome-offer terms from the issuer',
    blocksAdvancement: true,
    description: 'Three cards changed welcome offers this month. Update the rankings table,Pros/cons and the verdict section.',
    notes: 'Affiliate contact: partnerships@cardcomms.example — follow up Tue.',
  },
  'task_005': {
    articleId: 'art-qantas-status-run-guide',
    name: 'Compliance review — Qantas status run guide',
    icon: '✅',
    taskType: 'Compliance Review',
    status: 'Pending' as TaskStatus,
    priority: 'Medium',
    assignee: 'Daynis Olman',
    avatar: '–',
    dueDate: ts(5),
    comments: 0,
    source: 'Blog Engine',
    description: 'Check affiliate disclosure placement and ensure fare-class claims match current Qantas T&Cs.',
  },
  'task_006': {
    articleId: 'art-european-lounge-access',
    name: 'Verify backlinks — European lounge guide',
    icon: '🔗',
    taskType: 'Add/Verify Backlinks',
    status: 'Complete' as TaskStatus,
    priority: 'Low',
    assignee: 'James Carter',
    avatar: '–',
    dueDate: ts(-2),
    comments: 0,
    source: 'Blog Engine',
  },
  'task_007': {
    articleId: 'standalone',
    name: 'Verify card terms accuracy — Q4 audit',
    icon: '💳',
    taskType: 'Verify Card Terms Accuracy',
    status: 'Pending' as TaskStatus,
    priority: 'High',
    assignee: 'Daynis Olman',
    avatar: '–',
    dueDate: ts(1),
    comments: 0,
    source: 'Card Data',
    description: 'Quarterly spot-check of annual fees and earn rates against issuer pages for the top 12 cards.',
  },
  'task_008': {
    articleId: 'art-weekly-debrief-41',
    name: 'Proofread & approve Weekly Debrief #41',
    icon: '📧',
    taskType: 'Proofread & Approve',
    status: 'In Progress' as TaskStatus,
    priority: 'Medium',
    assignee: 'Sarah Mitchell',
    avatar: '–',
    dueDate: ts(2),
    startDate: ts(-1),
    comments: 1,
    source: 'Newsletter',
    description: 'Final pass before Beehiiv sync — check lead story links and the card-offer block.',
  },
  'task_009': {
    articleId: 'art-hyatt-vs-marriott-free-night',
    name: 'AI polish — Hyatt vs Marriott free nights',
    icon: '✨',
    taskType: 'AI Polish',
    status: 'Pending' as TaskStatus,
    priority: 'Low',
    assignee: 'Emma Rodriguez',
    avatar: '–',
    dueDate: ts(10),
    comments: 0,
    source: 'Blog Engine',
    description: 'Run the humanise pass and review flagged sentences before scheduling.',
  },
  'task_010': {
    articleId: 'standalone',
    name: 'Schedule October social posts',
    icon: '📅',
    taskType: 'Schedule Post',
    status: 'Complete' as TaskStatus,
    priority: 'Low',
    assignee: 'James Carter',
    avatar: '–',
    dueDate: ts(-4),
    comments: 0,
    source: 'Content Creation',
  },
};

// ── Seed: task-types (custom types created via the New Task modal) ───────────
// production: `task-types` collection written by the manageTaskTypes callable.

const taskTypeDocs: TaskTypeDoc[] = [
  { source: 'Blog Engine', name: 'AI Polish' },
  { source: 'Newsletter', name: 'Sponsor Slot Review' },
];

// ── Seed: comments subcollections ────────────────────────────────────────────
// production: article-tasks/{taskId}/comments

const commentDocs: Record<string, TaskCommentDoc[]> = {
  'task_001': [
    { id: 'cmt_001a', text: '@Daynis Olman meta description updated, ready for review', author: 'Sarah Mitchell', authorUid: 'uid_editor_002', createdAt: ts(-1) },
    { id: 'cmt_001b', text: 'LGTM — ship it after the image compression pass', author: 'Daynis Olman', authorUid: 'uid_admin_001', createdAt: ts(0) },
  ],
  'task_003': [
    { id: 'cmt_003a', text: 'Draft at 1,800 words — need the transfer partner fee table from @James Carter', author: 'Emma Rodriguez', authorUid: 'uid_viewer_004', createdAt: ts(-2) },
  ],
  'task_004': [
    { id: 'cmt_004a', text: 'Chase changed the welcome-offer terms again — rankings table is stale', author: 'Daynis Olman', authorUid: 'uid_admin_001', createdAt: ts(-4) },
    { id: 'cmt_004b', text: 'Can we get issuer confirmation before the refresh goes out?', author: 'Sarah Mitchell', authorUid: 'uid_editor_002', createdAt: ts(-3) },
    { id: 'cmt_004c', text: 'Blocked until the affiliate team confirms the new terms', author: 'Daynis Olman', authorUid: 'uid_admin_001', createdAt: ts(-3) },
  ],
  'task_008': [
    { id: 'cmt_008a', text: 'Second pass done — Beehiiv sync pending final approval', author: 'Sarah Mitchell', authorUid: 'uid_editor_002', createdAt: ts(-1) },
  ],
};

// ── Seed: users (assignee picker) ────────────────────────────────────────────
// production: `users` collection. Mirrors the four accounts seeded by the mock
// authService (@/services/authService).

const teamMemberDocs: TeamMemberDoc[] = [
  { id: 'uid_admin_001', displayName: 'Daynis Olman', email: 'admin@elitetravelhackers.com', role: 'Admin' },
  { id: 'uid_editor_002', displayName: 'Sarah Mitchell', email: 'editor@elitetravelhackers.com', role: 'Editor' },
  { id: 'uid_writer_003', displayName: 'James Carter', email: 'writer@elitetravelhackers.com', role: 'Writer' },
  { id: 'uid_viewer_004', displayName: 'Emma Rodriguez', email: 'viewer@elitetravelhackers.com', role: 'Viewer' },
];

// ── Listener registry ────────────────────────────────────────────────────────

type TasksListener = (docs: Record<string, TaskDocData>) => void;
type ArticlesListener = (docs: Record<string, ArticleDocData>) => void;
type TaskTypesListener = (docs: TaskTypeDoc[]) => void;
type CommentsListener = (docs: TaskCommentDoc[]) => void;
type TaskDocListener = (doc: TaskDocData | null) => void;
type TeamListener = (docs: TeamMemberDoc[]) => void;

const tasksListeners = new Set<TasksListener>();
const taskTypeListeners = new Set<TaskTypesListener>();
const commentsListeners = new Map<string, Set<CommentsListener>>();
const taskDocListeners = new Map<string, Set<TaskDocListener>>();

function snapshotTasks(): Record<string, TaskDocData> {
  const out: Record<string, TaskDocData> = {};
  for (const [id, doc] of Object.entries(taskDocs)) out[id] = { ...doc };
  return out;
}

function emitTasks() {
  const snap = snapshotTasks();
  tasksListeners.forEach((l) => l(snap));
}

function emitTaskTypes() {
  const snap = taskTypeDocs.map((d) => ({ ...d }));
  taskTypeListeners.forEach((l) => l(snap));
}

function emitComments(taskId: string) {
  const listeners = commentsListeners.get(taskId);
  if (!listeners) return;
  const rows = (commentDocs[taskId] ?? [])
    .slice()
    .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  listeners.forEach((l) => l(rows));
}

function emitTaskDoc(taskId: string) {
  const listeners = taskDocListeners.get(taskId);
  if (!listeners) return;
  const doc = taskDocs[taskId] ? { ...taskDocs[taskId] } : null;
  listeners.forEach((l) => l(doc));
}

// ── Subscriptions (mock onSnapshot — emit once, re-emit after mutations) ─────

export function subscribeToTaskDocs(listener: TasksListener): () => void {
  tasksListeners.add(listener);
  const t = setTimeout(() => listener(snapshotTasks()), 250);
  return () => {
    clearTimeout(t);
    tasksListeners.delete(listener);
  };
}

export function subscribeToArticleDocs(listener: ArticlesListener): () => void {
  const t = setTimeout(() => listener({ ...articleDocs }), 250);
  return () => clearTimeout(t);
}

export function subscribeToTaskTypeDocs(listener: TaskTypesListener): () => void {
  taskTypeListeners.add(listener);
  const t = setTimeout(() => listener(taskTypeDocs.map((d) => ({ ...d }))), 250);
  return () => {
    clearTimeout(t);
    taskTypeListeners.delete(listener);
  };
}

export function subscribeToTaskComments(taskId: string, listener: CommentsListener): () => void {
  let set = commentsListeners.get(taskId);
  if (!set) {
    set = new Set();
    commentsListeners.set(taskId, set);
  }
  set.add(listener);
  const t = setTimeout(() => emitComments(taskId), 250);
  return () => {
    clearTimeout(t);
    set.delete(listener);
  };
}

export function subscribeToTaskDoc(taskId: string, listener: TaskDocListener): () => void {
  let set = taskDocListeners.get(taskId);
  if (!set) {
    set = new Set();
    taskDocListeners.set(taskId, set);
  }
  set.add(listener);
  const t = setTimeout(() => emitTaskDoc(taskId), 250);
  return () => {
    clearTimeout(t);
    set.delete(listener);
  };
}

export function subscribeToTeamMembers(listener: TeamListener): () => void {
  const t = setTimeout(() => listener(teamMemberDocs.map((d) => ({ ...d }))), 250);
  return () => clearTimeout(t);
}

// ── Callable mocks ───────────────────────────────────────────────────────────

/**
 * production: httpsCallable(functions, 'manageTasks')
 * Actions used by the module: create / update / complete / block / unblock / comment.
 */
export async function manageTasks(payload: Record<string, unknown>): Promise<{ success: boolean; taskId?: string }> {
  await delay(300);
  const action = payload.action as string;
  const taskId = payload.taskId as string | undefined;

  switch (action) {
    case 'create': {
      const id = mockId('task');
      taskDocs[id] = {
        articleId: typeof payload.articleId === 'string' ? payload.articleId : 'standalone',
        name: typeof payload.name === 'string' ? payload.name : 'Task',
        icon: '📝',
        taskType: typeof payload.taskType === 'string' ? payload.taskType : '',
        status: (payload.status as TaskStatus) ?? 'Pending',
        priority: typeof payload.priority === 'string' ? payload.priority : 'Medium',
        assignee: typeof payload.assignee === 'string' ? payload.assignee : 'Unassigned',
        avatar: '–',
        dueDate: typeof payload.dueDate === 'string' && payload.dueDate
          ? Timestamp.fromMillis(new Date(payload.dueDate).getTime())
          : null,
        comments: 0,
        source: typeof payload.source === 'string' ? payload.source : 'Blog Engine',
        description: typeof payload.description === 'string' ? payload.description : undefined,
      };
      emitTasks();
      return { success: true, taskId: id };
    }

    case 'update': {
      const doc = taskId ? taskDocs[taskId] : undefined;
      if (!doc) throw new Error(`manageTasks: task not found (${taskId})`);
      for (const field of ['name', 'status', 'priority', 'assignee', 'taskType', 'description', 'notes', 'source'] as const) {
        if (typeof payload[field] === 'string') doc[field] = payload[field];
      }
      for (const field of ['dueDate', 'startDate'] as const) {
        if (field in payload) {
          const v = payload[field];
          doc[field] = typeof v === 'string' && v ? Timestamp.fromMillis(new Date(v).getTime()) : null;
        }
      }
      emitTasks();
      if (taskId) emitTaskDoc(taskId);
      return { success: true };
    }

    case 'complete': {
      const doc = taskId ? taskDocs[taskId] : undefined;
      if (!doc) throw new Error(`manageTasks: task not found (${taskId})`);
      doc.status = 'Complete';
      emitTasks();
      return { success: true };
    }

    case 'block': {
      const doc = taskId ? taskDocs[taskId] : undefined;
      if (!doc) throw new Error(`manageTasks: task not found (${taskId})`);
      doc.status = 'Blocked';
      if (typeof payload.blockReason === 'string') doc.blockReason = payload.blockReason;
      emitTasks();
      return { success: true };
    }

    case 'unblock': {
      const doc = taskId ? taskDocs[taskId] : undefined;
      if (!doc) throw new Error(`manageTasks: task not found (${taskId})`);
      doc.status = 'In Progress';
      delete doc.blockReason;
      emitTasks();
      return { success: true };
    }

    case 'comment': {
      const doc = taskId ? taskDocs[taskId] : undefined;
      if (!doc || !taskId) throw new Error(`manageTasks: task not found (${taskId})`);
      const rows = commentDocs[taskId] ?? (commentDocs[taskId] = []);
      rows.push({
        id: mockId('cmt'),
        text: typeof payload.commentText === 'string' ? payload.commentText : '',
        author: typeof payload.commentAuthor === 'string' ? payload.commentAuthor : 'Unknown',
        authorUid: 'uid_admin_001',
        createdAt: Timestamp.now(),
      });
      doc.comments = (typeof doc.comments === 'number' ? doc.comments : 0) + 1;
      emitComments(taskId);
      emitTasks();
      return { success: true };
    }

    default:
      throw new Error(`manageTasks: unsupported action "${action}"`);
  }
}

/**
 * production: httpsCallable(functions, 'manageTaskTypes')
 * Action used by the module: create.
 */
export async function manageTaskTypes(payload: Record<string, unknown>): Promise<{ success: boolean }> {
  await delay(250);
  if (payload.action !== 'create') {
    throw new Error(`manageTaskTypes: unsupported action "${String(payload.action)}"`);
  }
  const source = typeof payload.source === 'string' ? payload.source : '';
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (source && name) {
    const exists = taskTypeDocs.some(
      (d) => d.source === source && d.name.toLowerCase() === name.toLowerCase(),
    );
    if (!exists) {
      taskTypeDocs.push({ source, name });
      emitTaskTypes();
    }
  }
  return { success: true };
}
