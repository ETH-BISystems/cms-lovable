/**
 * MOCK Service Ticket service — mirrors the production service's exported
 * names and signatures, backed by an in-memory store with listener fan-out
 * instead of Firestore / Storage / callable Cloud Functions.
 *
 * Production touchpoints, kept for the rewiring pass:
 *   - Firestore: onSnapshot(query(collection(db, 'serviceTickets'), orderBy('createdAt', 'desc')))
 *   - Firestore: onSnapshot(query(collection(db, 'serviceTickets', ticketId, 'comments'), orderBy('createdAt', 'asc')))
 *   - Firestore: onSnapshot(collection(db, 'users')) — assignee picker (disabled filtered client-side)
 *   - Storage: uploadBytes + getDownloadURL at `service-tickets/{ticketId}/{ts}-{safeName}`
 *   - Callables: createServiceTicket, updateServiceTicketStatus, assignServiceTicket,
 *     addServiceTicketComment, attachServiceTicketFile, removeServiceTicketAttachment
 *   - Transition guard mirrored server-side in functions/src/service-tickets/shared.ts
 */

import { delay, mockId } from '@/services/_delay';
import { storageService } from '@/services/storageService';
import type { Unsubscribe } from '@/services/types';
import { authService } from '@/modules/auth';
import type { AuthUser } from '@/services/types';
import type {
  AssignableUser,
  ServiceTicket,
  TicketAttachment,
  TicketComment,
  TicketStatus,
} from '../types';
import { isValidTicketStatusTransition, TICKET_STATUS_META } from '../types';

// ── Callable input/output shapes ─────────────────────────────────────────────

export interface CreateServiceTicketInput {
  title: string;
  description?: string;
  assigneeUid?: string | null;
}

export interface CreateServiceTicketResult {
  ticketId: string;
}

export interface UpdateServiceTicketStatusInput {
  ticketId: string;
  status: TicketStatus;
}

export interface AssignServiceTicketInput {
  ticketId: string;
  assigneeUid: string | null;
}

export interface AddServiceTicketCommentInput {
  ticketId: string;
  text: string;
}

export interface AttachServiceTicketFileInput {
  ticketId: string;
  name: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  size: number;
}

export interface RemoveServiceTicketAttachmentInput {
  ticketId: string;
  storagePath: string;
}

// ── Seed data ────────────────────────────────────────────────────────────────

/**
 * Mock team — mirrors the accounts seeded by `@/services/authService` so
 * tickets, comments and the assignee picker agree on uids/names. In
 * production this is the `users` collection (readable by any authenticated
 * user; disabled accounts filtered client-side).
 */
const MOCK_USERS: Array<AssignableUser & { status: string }> = [
  { uid: 'uid_admin_001', displayName: 'Daynis Olman', email: 'admin@elitetravelhackers.com', status: 'active' },
  { uid: 'uid_editor_002', displayName: 'Sarah Mitchell', email: 'editor@elitetravelhackers.com', status: 'active' },
  { uid: 'uid_writer_003', displayName: 'James Carter', email: 'writer@elitetravelhackers.com', status: 'active' },
  { uid: 'uid_viewer_004', displayName: 'Emma Rodriguez', email: 'viewer@elitetravelhackers.com', status: 'disabled' },
];

const now = Date.now();
const day = 864e5;

function seedTickets(): ServiceTicket[] {
  return [
    {
      id: 'ticket_001',
      title: 'Transfer partner table not syncing on /cards',
      description:
        'The transfer partner matrix on the Amex Platinum card page has not picked up the new Aeroplan ratio since Tuesday. Webflow shows 1:1, CMS shows 1:1.2. Expected the sync to push the corrected ratio within an hour of the scrape.',
      status: 'open',
      assigneeUid: 'uid_admin_001',
      assigneeName: 'Daynis Olman',
      createdByUid: 'uid_editor_002',
      createdByName: 'Sarah Mitchell',
      attachments: [
        {
          name: 'transfer-partner-mismatch.png',
          storagePath: 'service-tickets/ticket_001/seed-transfer-partner-mismatch.png',
          downloadURL: 'https://picsum.photos/seed/transfer-partner/480/320',
          contentType: 'image/png',
          size: 214_582,
          uploadedByUid: 'uid_editor_002',
          uploadedByName: 'Sarah Mitchell',
          uploadedAt: new Date(now - 2 * day + 42e5),
        },
      ],
      commentCount: 2,
      createdAt: new Date(now - 2 * day),
      updatedAt: new Date(now - 1 * day),
    },
    {
      id: 'ticket_002',
      title: 'Add annual-fee reminder emails before card renewal date',
      description:
        'Feature request: email the team 30 days before a tracked card hits its renewal so we can decide keep/cancel before the fee posts. Ideally driven off the card anniversary field we already store.',
      status: 'open',
      assigneeUid: null,
      assigneeName: null,
      createdByUid: 'uid_writer_003',
      createdByName: 'James Carter',
      attachments: [],
      commentCount: 0,
      createdAt: new Date(now - 1 * day),
      updatedAt: new Date(now - 1 * day),
    },
    {
      id: 'ticket_003',
      title: 'Hero image on Amex Platinum review cropped on mobile',
      description:
        'On iPhone-width viewports the hero image on /reviews/amex-platinum is cropped so the card art is cut in half. Desktop looks fine. Suspect the object-position in the Webflow rich-text embed.',
      status: 'in_progress',
      assigneeUid: 'uid_editor_002',
      assigneeName: 'Sarah Mitchell',
      createdByUid: 'uid_viewer_004',
      createdByName: 'Emma Rodriguez',
      attachments: [
        {
          name: 'mobile-hero-crop.jpg',
          storagePath: 'service-tickets/ticket_003/seed-mobile-hero-crop.jpg',
          downloadURL: 'https://picsum.photos/seed/mobile-hero/480/320',
          contentType: 'image/jpeg',
          size: 158_204,
          uploadedByUid: 'uid_viewer_004',
          uploadedByName: 'Emma Rodriguez',
          uploadedAt: new Date(now - 6 * day + 18e5),
        },
      ],
      commentCount: 3,
      createdAt: new Date(now - 6 * day),
      updatedAt: new Date(now - 2 * day),
    },
    {
      id: 'ticket_004',
      title: 'Update Chase Sapphire Preferred signup bonus to 75k',
      description:
        'Content fix: the public offer moved from 60k to 75k UR points ($750 spend threshold unchanged, 3 months). Daily Drop picked it up but the card page still shows the old bonus. Needs a manual override until the scraper catches the new landing page.',
      status: 'in_progress',
      assigneeUid: 'uid_writer_003',
      assigneeName: 'James Carter',
      createdByUid: 'uid_admin_001',
      createdByName: 'Daynis Olman',
      attachments: [],
      commentCount: 1,
      createdAt: new Date(now - 4 * day),
      updatedAt: new Date(now - 3 * day),
    },
    {
      id: 'ticket_005',
      title: 'New card: Capital One Venture X Business write-up',
      description:
        'Draft the full review for the Venture X Business — 75k mile bonus, $395 fee, 2x everywhere, lounge access. Follow the standard card template and queue for humanise once the draft lands.',
      status: 'in_review',
      assigneeUid: 'uid_admin_001',
      assigneeName: 'Daynis Olman',
      createdByUid: 'uid_editor_002',
      createdByName: 'Sarah Mitchell',
      attachments: [],
      commentCount: 2,
      createdAt: new Date(now - 8 * day),
      updatedAt: new Date(now - 1 * day),
    },
    {
      id: 'ticket_006',
      title: 'Fix broken Avios sweet-spot chart embed',
      description:
        'The Avios distance-band chart under /guides/avios-sweet-spots renders as an empty frame. The iframe src 404s — probably a stale embed URL from the old chart tool.',
      status: 'done',
      assigneeUid: 'uid_admin_001',
      assigneeName: 'Daynis Olman',
      createdByUid: 'uid_writer_003',
      createdByName: 'James Carter',
      attachments: [],
      commentCount: 1,
      createdAt: new Date(now - 12 * day),
      updatedAt: new Date(now - 3 * day),
    },
    {
      id: 'ticket_007',
      title: 'Refresh Q4 hotel award pricing in Hilton guide',
      description:
        'Content fix: the Hilton honors redemption table still shows Q3 standard-room pricing. Update rows for Conrad Maldives, Waldorf Astoria Amsterdam and Hilton Tokyo with Q4 rates.',
      status: 'done',
      assigneeUid: 'uid_editor_002',
      assigneeName: 'Sarah Mitchell',
      createdByUid: 'uid_viewer_004',
      createdByName: 'Emma Rodriguez',
      attachments: [],
      commentCount: 0,
      createdAt: new Date(now - 15 * day),
      updatedAt: new Date(now - 5 * day),
    },
    {
      id: 'ticket_008',
      title: 'Remove legacy card-sync banner from dashboard',
      description:
        'Cleanup from the Webflow migration: the amber "card sync paused" banner on the dashboard refers to the old pipeline and confuses new editors. Safe to drop entirely.',
      status: 'archived',
      assigneeUid: null,
      assigneeName: null,
      createdByUid: 'uid_admin_001',
      createdByName: 'Daynis Olman',
      attachments: [],
      commentCount: 0,
      createdAt: new Date(now - 40 * day),
      updatedAt: new Date(now - 30 * day),
    },
  ];
}

function seedComments(): Record<string, TicketComment[]> {
  return {
    ticket_001: [
      {
        id: 'comment_001a',
        text: 'Reproduced — the scraped value is right, the Webflow sync is dropping the decimal. Looking at the sync builder now.',
        authorUid: 'uid_admin_001',
        authorName: 'Daynis Olman',
        createdAt: new Date(now - 2 * day + 36e5),
      },
      {
        id: 'comment_001b',
        text: 'Found it: the ratio is serialized through the legacy field name. Fix is in, re-syncing the affected cards.',
        authorUid: 'uid_admin_001',
        authorName: 'Daynis Olman',
        createdAt: new Date(now - 1 * day),
      },
    ],
    ticket_003: [
      {
        id: 'comment_003a',
        text: 'Confirmed on my phone too — only happens below 480px. I will swap the embed to the self-resizing pattern we use elsewhere.',
        authorUid: 'uid_editor_002',
        authorName: 'Sarah Mitchell',
        createdAt: new Date(now - 5 * day),
      },
      {
        id: 'comment_003b',
        text: 'While you are in there, can you check the caption width as well? It overflows by a few pixels.',
        authorUid: 'uid_viewer_004',
        authorName: 'Emma Rodriguez',
        createdAt: new Date(now - 4 * day),
      },
      {
        id: 'comment_003c',
        text: 'Both fixed on staging. Will close this after the next deploy.',
        authorUid: 'uid_editor_002',
        authorName: 'Sarah Mitchell',
        createdAt: new Date(now - 2 * day),
      },
    ],
    ticket_004: [
      {
        id: 'comment_004a',
        text: 'Override is in (75k, manual). Leaving the ticket open until the scraper confirms the new offer page so we do not regress on the next scrape.',
        authorUid: 'uid_writer_003',
        authorName: 'James Carter',
        createdAt: new Date(now - 3 * day),
      },
    ],
    ticket_005: [
      {
        id: 'comment_005a',
        text: 'First draft is in the pipeline. Lounge-access section needs a second pass — the Priority Pass guesting rules changed this quarter.',
        authorUid: 'uid_editor_002',
        authorName: 'Sarah Mitchell',
        createdAt: new Date(now - 2 * day),
      },
      {
        id: 'comment_005b',
        text: 'Reviewed. Two nits on the fee math, then it is good to publish.',
        authorUid: 'uid_admin_001',
        authorName: 'Daynis Olman',
        createdAt: new Date(now - 1 * day),
      },
    ],
    ticket_006: [
      {
        id: 'comment_006a',
        text: 'Replaced the embed with the self-resizing iframe pattern. Chart renders on desktop and mobile now.',
        authorUid: 'uid_admin_001',
        authorName: 'Daynis Olman',
        createdAt: new Date(now - 3 * day),
      },
    ],
  };
}

let tickets: ServiceTicket[] = seedTickets();
const commentsByTicket: Record<string, TicketComment[]> = seedComments();

// ── Listener fan-out (stands in for onSnapshot) ─────────────────────────────

const ticketListeners = new Set<(tickets: ServiceTicket[]) => void>();
const commentListeners = new Map<string, Set<(comments: TicketComment[]) => void>>();

function sortedTickets(): ServiceTicket[] {
  // production: orderBy('createdAt', 'desc')
  return [...tickets].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

function sortedComments(ticketId: string): TicketComment[] {
  // production: orderBy('createdAt', 'asc')
  return [...(commentsByTicket[ticketId] ?? [])].sort(
    (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
  );
}

function emitTickets(): void {
  const snapshot = sortedTickets();
  ticketListeners.forEach((listener) => listener(snapshot));
}

function emitComments(ticketId: string): void {
  const listeners = commentListeners.get(ticketId);
  if (!listeners) return;
  const snapshot = sortedComments(ticketId);
  listeners.forEach((listener) => listener(snapshot));
}

// ── Current user (the callable's auth context in production) ────────────────

let currentUser: AuthUser | null = null;
authService.subscribeToAuth((user) => {
  currentUser = user;
});

function actor(): { uid: string; name: string } {
  return currentUser
    ? { uid: currentUser.uid, name: currentUser.displayName }
    : { uid: 'uid_admin_001', name: 'Daynis Olman' };
}

function userName(uid: string | null): string | null {
  if (!uid) return null;
  return MOCK_USERS.find((u) => u.uid === uid)?.displayName ?? null;
}

function findTicket(ticketId: string): ServiceTicket {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  return ticket;
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToServiceTickets(
  onData: (tickets: ServiceTicket[]) => void,
  _onError: (error: Error) => void
): Unsubscribe {
  ticketListeners.add(onData);
  const timer = setTimeout(() => onData(sortedTickets()), 120);
  return () => {
    clearTimeout(timer);
    ticketListeners.delete(onData);
  };
}

export function subscribeToTicketComments(
  ticketId: string,
  onData: (comments: TicketComment[]) => void,
  _onError: (error: Error) => void
): Unsubscribe {
  let listeners = commentListeners.get(ticketId);
  if (!listeners) {
    listeners = new Set();
    commentListeners.set(ticketId, listeners);
  }
  listeners.add(onData);
  const timer = setTimeout(() => onData(sortedComments(ticketId)), 120);
  return () => {
    clearTimeout(timer);
    listeners.delete(onData);
  };
}

/**
 * All CMS users for the assignee picker. Mirrors production: the `users`
 * collection is read live and disabled accounts are filtered out client-side,
 * then sorted by display name.
 */
export function subscribeToAssignableUsers(
  onData: (users: AssignableUser[]) => void,
  _onError: (error: Error) => void
): Unsubscribe {
  const timer = setTimeout(() => {
    onData(
      MOCK_USERS.filter((u) => u.status !== 'disabled')
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map(({ uid, displayName, email }) => ({ uid, displayName, email }))
    );
  }, 120);
  return () => clearTimeout(timer);
}

// ── Storage upload (bytes) — established pattern from voiceNoteService ──────
// production: uploadBytes(ref(storage, storagePath), file) then getDownloadURL.
// The mock reads the file into a data URL via the shared storageService so
// attached images render in this browser session.

export async function uploadTicketAttachment(ticketId: string, file: File): Promise<{
  storagePath: string;
  downloadURL: string;
}> {
  const safeName = file.name.replace(/[^\w.\- ()]/g, '_').slice(-120);
  const storagePath = `service-tickets/${ticketId}/${Date.now()}-${safeName}`;
  try {
    const asset = await storageService.uploadFile(file, `service-tickets/${ticketId}`);
    return { storagePath, downloadURL: asset.cdnUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    throw new Error(`Failed to upload ${file.name}: ${message}`);
  }
}

// ── Callable wrappers (production: httpsCallable(functions, '<name>')) ──────

// production: httpsCallable(functions, 'createServiceTicket')
export async function createServiceTicket(
  input: CreateServiceTicketInput
): Promise<CreateServiceTicketResult> {
  await delay(350);
  const { uid, name } = actor();
  const ticket: ServiceTicket = {
    id: mockId('ticket'),
    title: input.title,
    description: input.description ?? '',
    status: 'open',
    assigneeUid: input.assigneeUid ?? null,
    assigneeName: userName(input.assigneeUid ?? null),
    createdByUid: uid,
    createdByName: name,
    attachments: [],
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  tickets = [ticket, ...tickets];
  emitTickets();
  return { ticketId: ticket.id };
}

// production: httpsCallable(functions, 'updateServiceTicketStatus')
export async function updateServiceTicketStatus(
  input: UpdateServiceTicketStatusInput
): Promise<void> {
  await delay(250);
  const ticket = findTicket(input.ticketId);
  if (!isValidTicketStatusTransition(ticket.status, input.status)) {
    throw new Error(
      `Cannot move from "${TICKET_STATUS_META[ticket.status].label}" to "${TICKET_STATUS_META[input.status].label}".`
    );
  }
  ticket.status = input.status;
  ticket.updatedAt = new Date();
  emitTickets();
}

// production: httpsCallable(functions, 'assignServiceTicket')
export async function assignServiceTicket(input: AssignServiceTicketInput): Promise<void> {
  await delay(250);
  const ticket = findTicket(input.ticketId);
  ticket.assigneeUid = input.assigneeUid;
  ticket.assigneeName = userName(input.assigneeUid);
  ticket.updatedAt = new Date();
  emitTickets();
}

// production: httpsCallable(functions, 'addServiceTicketComment')
export async function addServiceTicketComment(input: AddServiceTicketCommentInput): Promise<void> {
  await delay(250);
  const ticket = findTicket(input.ticketId);
  const { uid, name } = actor();
  const comment: TicketComment = {
    id: mockId('comment'),
    text: input.text,
    authorUid: uid,
    authorName: name,
    createdAt: new Date(),
  };
  commentsByTicket[input.ticketId] = [...(commentsByTicket[input.ticketId] ?? []), comment];
  ticket.commentCount += 1;
  ticket.updatedAt = new Date();
  emitComments(input.ticketId);
  emitTickets();
}

// production: httpsCallable(functions, 'attachServiceTicketFile')
export async function attachServiceTicketFile(input: AttachServiceTicketFileInput): Promise<void> {
  await delay(250);
  const ticket = findTicket(input.ticketId);
  const { uid, name } = actor();
  const attachment: TicketAttachment = {
    name: input.name,
    storagePath: input.storagePath,
    downloadURL: input.downloadURL,
    contentType: input.contentType,
    size: input.size,
    uploadedByUid: uid,
    uploadedByName: name,
    uploadedAt: new Date(),
  };
  ticket.attachments = [...ticket.attachments, attachment];
  ticket.updatedAt = new Date();
  emitTickets();
}

// production: httpsCallable(functions, 'removeServiceTicketAttachment')
export async function removeServiceTicketAttachment(
  input: RemoveServiceTicketAttachmentInput
): Promise<void> {
  await delay(250);
  const ticket = findTicket(input.ticketId);
  ticket.attachments = ticket.attachments.filter((a) => a.storagePath !== input.storagePath);
  ticket.updatedAt = new Date();
  emitTickets();
}
