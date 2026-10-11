import type { EditionStatus, EditionType, ContentBlockType, Role } from '../types/index';
import { ROLE_HIERARCHY } from '../types/index';

// ─── Edition Status Transitions ──────────────────────────────────────────────

/**
 * Valid status transitions for newsletter editions.
 * Terminal states (Sent, Cancelled) have no outgoing transitions.
 */
export const VALID_TRANSITIONS: Record<EditionStatus, EditionStatus[]> = {
  'Curating': ['Writing', 'Draft', 'Cancelled'],
  'Writing': ['In Review', 'Draft', 'Cancelled'],
  'In Review': ['Approved', 'Writing', 'Draft', 'Cancelled'],
  'Approved': ['Ready', 'In Review', 'Draft', 'Cancelled'],
  'Ready': ['Scheduled', 'Approved', 'Draft', 'Cancelled'],
  'Scheduled': ['Sent', 'Ready', 'Draft', 'Cancelled'],
  'Sent': [],
  'Draft': ['Curating', 'Cancelled'],
  'Cancelled': [],
  'Send Failed': ['Ready', 'Cancelled'],
};

/**
 * Returns whether transitioning from one status to another is valid.
 */
export function isValidTransition(from: EditionStatus, to: EditionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the list of valid next statuses for a given current status.
 */
export function getValidNextStatuses(currentStatus: EditionStatus): EditionStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

// ─── Default Block Templates ─────────────────────────────────────────────────

/**
 * Default content block structure for each edition type.
 */
export const DEFAULT_BLOCK_TEMPLATES: Record<EditionType, ContentBlockType[]> = {
  'Daily': ['Lead Story', 'Quick Hits', 'Card Alert', 'Article Spotlight', 'Transfer Bonus Watch', 'Tip of the Day'],
  'Deal Alert': ['Deal Alert', 'Card Alert'],
  'Transfer Bonus': ['Deal Alert', 'Transfer Bonus'],
  'Special': ['Lead Story', 'Article Spotlight', 'Personal Note'],
  'Win-Back': ['Lead Story', 'Deal Alert', 'Personal Note'],
  'Membership Conversion': ['Lead Story', 'Card Alert', 'Personal Note'],
};

/**
 * Returns the default block template for a given edition type.
 */
export function getDefaultBlockTemplate(editionType: EditionType): ContentBlockType[] {
  return DEFAULT_BLOCK_TEMPLATES[editionType] ?? [];
}

// ─── Role-Based Access Control ───────────────────────────────────────────────

/**
 * Action → minimum role mapping for newsletter operations.
 */
export const ACTION_ROLES: Record<string, Role> = {
  'view': 'Viewer',
  'create_edition': 'Writer',
  'edit_blocks': 'Writer',
  'change_status': 'Writer',
  'send_edition': 'Editor',
  'schedule_edition': 'Editor',
  'sync_subscribers': 'Editor',
  'view_subscriber_emails': 'Editor',
  'manage_tasks': 'Writer',
  'ai_generate': 'Writer',
  'configuration': 'Admin',
};

/**
 * Returns whether a user's role meets or exceeds the required role level.
 */
export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Returns whether a user with the given role can perform the specified action.
 * Returns false for unknown actions.
 */
export function canPerformAction(userRole: Role, action: string): boolean {
  const requiredRole = ACTION_ROLES[action];
  if (!requiredRole) return false;
  return hasMinimumRole(userRole, requiredRole);
}
