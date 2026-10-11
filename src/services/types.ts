// Shared domain types for the service layer.
// Kept intentionally free of any backend SDK imports so that backend changes
// stay services-only and never leak SDK types to consumers.

import { Role } from '@/platform/types/roles';

export { Role };

/**
 * Minimal authenticated user shape consumed by the UI. Mirrors the subset of
 * fields the app actually reads from a Firebase User, plus the role resolved
 * from the ID token's custom claims; the service layer adapts from the SDK
 * so consumers never touch Firebase types.
 */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  /** Role resolved from the ID token's custom claims. */
  role: Role;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  status: 'active' | 'disabled';
  claimsUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  /**
   * Optional. When omitted the account is created invite-style: the callable
   * generates a strong random temporary password server-side and returns a
   * password-reset link so the invitee sets their own password (CMS-160).
   */
  password?: string;
  displayName: string;
  role: Role;
}

export interface CreateUserResult {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  /**
   * Present only for invite-style creation (no password supplied): a Firebase
   * Auth password-reset link the admin can copy/share manually as a fallback
   * when the automatic invite email cannot be delivered.
   */
  resetLink: string | null;
}

export interface UpdateUserRoleInput {
  uid: string;
  role: Role;
}

export interface SetUserDisabledInput {
  uid: string;
  disabled: boolean;
}

export interface DeleteUserInput {
  uid: string;
}

/**
 * Row shape for the admin User Management screen (CMS-160). Merges the
 * Firestore users/{uid} profile with Firebase Auth directory data (disabled
 * state, created / last sign-in timestamps) via the `listUsers` callable —
 * Auth data is only available server-side.
 */
export interface ManagedUser {
  uid: string;
  email: string;
  displayName: string;
  /** Null when the account has no valid role claim (it cannot sign in). */
  role: Role | null;
  status: 'active' | 'disabled';
  disabled: boolean;
  createdAt: Date | null;
  lastSignInAt: Date | null;
  /** True when the Auth account has no Firestore profile doc. */
  profileMissing: boolean;
  /** True when the Firestore profile has no matching Auth account. */
  authMissing: boolean;
}

export type Unsubscribe = () => void;
