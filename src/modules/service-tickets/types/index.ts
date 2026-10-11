/**
 * Service Tickets — shared types and status-transition rules.
 *
 * The transition validator is mirrored server-side in
 * `functions/src/service-tickets/shared.ts` (Cloud Functions cannot import
 * from the client source tree). Keep the two in sync.
 */

export const TICKET_STATUSES = ['open', 'in_progress', 'in_review', 'done', 'archived'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Board column order + display metadata, keyed by status. */
export const TICKET_STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: '#0093A7' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  in_review: { label: 'In Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#22c55e' },
  archived: { label: 'Archived', color: '#6b7280' },
};

export function isValidTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

/**
 * Trello-style free movement with two guards:
 * - no-op transitions are rejected
 * - an archived ticket can only be restored to `open`
 */
export function isValidTicketStatusTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  if (from === 'archived') return to === 'open';
  return true;
}

export interface TicketAttachment {
  name: string;
  storagePath: string;
  downloadURL: string;
  contentType: string;
  size: number;
  uploadedByUid: string;
  uploadedByName: string;
  uploadedAt: Date | null;
}

export interface ServiceTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  assigneeUid: string | null;
  assigneeName: string | null;
  createdByUid: string;
  createdByName: string;
  attachments: TicketAttachment[];
  commentCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface TicketComment {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  createdAt: Date | null;
}

/** Minimal user shape for the assignee picker (from the `users` collection). */
export interface AssignableUser {
  uid: string;
  displayName: string;
  email: string;
}

/** Client-side guards mirrored in attachServiceTicketFile. */
export const MAX_TICKET_ATTACHMENTS = 20;
export const MAX_TICKET_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_TICKET_TITLE_LENGTH = 200;
export const MAX_TICKET_DESCRIPTION_LENGTH = 10_000;
export const MAX_TICKET_COMMENT_LENGTH = 5_000;
