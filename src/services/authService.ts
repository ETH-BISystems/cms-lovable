// MOCK auth service — same exported interface as the production
// Firebase-backed service (sign-in/session, users/{uid} profiles, and the
// callable-Cloud-Function user management surface), backed by localStorage +
// in-memory seed data. Any email/password signs in as the seeded admin.

import { Role } from '@/platform/types/roles';
import { delay, mockId } from './_delay';
import type {
  AuthUser,
  CreateUserInput,
  CreateUserResult,
  DeleteUserInput,
  ManagedUser,
  SetUserDisabledInput,
  Unsubscribe,
  UpdateUserRoleInput,
  UserProfile,
} from './types';

const SESSION_KEY = 'eth-mock-session';

interface MockAccount {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  disabled: boolean;
  createdAt: Date;
  lastSignInAt: Date | null;
}

function seedAccounts(): MockAccount[] {
  const now = Date.now();
  return [
    { uid: 'uid_admin_001', email: 'admin@elitetravelhackers.com', displayName: 'Daynis Olman', role: Role.Admin, disabled: false, createdAt: new Date(now - 400 * 864e5), lastSignInAt: new Date(now - 3600e3) },
    { uid: 'uid_editor_002', email: 'editor@elitetravelhackers.com', displayName: 'Sarah Mitchell', role: Role.Editor, disabled: false, createdAt: new Date(now - 300 * 864e5), lastSignInAt: new Date(now - 2 * 864e5) },
    { uid: 'uid_writer_003', email: 'writer@elitetravelhackers.com', displayName: 'James Carter', role: Role.Writer, disabled: false, createdAt: new Date(now - 200 * 864e5), lastSignInAt: new Date(now - 5 * 864e5) },
    { uid: 'uid_viewer_004', email: 'viewer@elitetravelhackers.com', displayName: 'Emma Rodriguez', role: Role.Viewer, disabled: true, createdAt: new Date(now - 100 * 864e5), lastSignInAt: null },
  ];
}

const accounts: MockAccount[] = seedAccounts();
const authListeners = new Set<(user: AuthUser | null) => void>();
let currentUid: string | null = null;

try {
  currentUid = localStorage.getItem(SESSION_KEY);
} catch {
  currentUid = null;
}

function toAuthUser(account: MockAccount): AuthUser {
  return { uid: account.uid, email: account.email, displayName: account.displayName, role: account.role };
}

function toProfile(account: MockAccount): UserProfile {
  return {
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    role: account.role,
    status: account.disabled ? 'disabled' : 'active',
    claimsUpdatedAt: null,
    createdAt: account.createdAt,
    updatedAt: account.lastSignInAt ?? account.createdAt,
  };
}

function currentUser(): AuthUser | null {
  if (!currentUid) return null;
  const account = accounts.find((a) => a.uid === currentUid && !a.disabled);
  return account ? toAuthUser(account) : null;
}

function emit(): void {
  const user = currentUser();
  authListeners.forEach((listener) => listener(user));
}

export const authService = {
  async signIn(email: string, _password: string): Promise<AuthUser> {
    await delay(400);
    const account =
      accounts.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? accounts[0];
    if (account.disabled) {
      const error = new Error('disabled') as Error & { code: string };
      error.code = 'auth/user-disabled';
      throw error;
    }
    account.lastSignInAt = new Date();
    currentUid = account.uid;
    try {
      localStorage.setItem(SESSION_KEY, account.uid);
    } catch {
      // session just won't persist across reloads
    }
    const user = toAuthUser(account);
    emit();
    return user;
  },

  async signOut(): Promise<void> {
    await delay(150);
    currentUid = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // nothing to clear
    }
    emit();
  },

  async refreshToken(): Promise<void> {
    await delay(50);
  },

  async createUser(data: CreateUserInput): Promise<CreateUserResult> {
    await delay(500);
    const account: MockAccount = {
      uid: mockId('uid'),
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      disabled: false,
      createdAt: new Date(),
      lastSignInAt: null,
    };
    accounts.push(account);
    return {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      resetLink: data.password ? null : 'https://example.com/mock-reset-link',
    };
  },

  async updateUserRole(data: UpdateUserRoleInput): Promise<void> {
    await delay(300);
    const account = accounts.find((a) => a.uid === data.uid);
    if (account) account.role = data.role;
    emit();
  },

  async setUserDisabled(data: SetUserDisabledInput): Promise<void> {
    await delay(300);
    const account = accounts.find((a) => a.uid === data.uid);
    if (account) account.disabled = data.disabled;
  },

  async listUsers(): Promise<UserProfile[]> {
    await delay(300);
    return accounts.map(toProfile);
  },

  async listManagedUsers(): Promise<ManagedUser[]> {
    await delay(300);
    return accounts.map((a) => ({
      uid: a.uid,
      email: a.email,
      displayName: a.displayName,
      role: a.role,
      status: a.disabled ? ('disabled' as const) : ('active' as const),
      disabled: a.disabled,
      createdAt: a.createdAt,
      lastSignInAt: a.lastSignInAt,
      profileMissing: false,
      authMissing: false,
    }));
  },

  async deleteUser(data: DeleteUserInput): Promise<void> {
    await delay(400);
    const index = accounts.findIndex((a) => a.uid === data.uid);
    if (index >= 0) accounts.splice(index, 1);
  },

  async sendPasswordReset(_email: string): Promise<void> {
    await delay(300);
  },

  subscribeToAuth(listener: (user: AuthUser | null) => void): Unsubscribe {
    authListeners.add(listener);
    // Fires immediately with the current value, like onAuthStateChanged.
    setTimeout(() => listener(currentUser()), 50);
    return () => authListeners.delete(listener);
  },

  subscribeToProfile(uid: string, listener: (profile: UserProfile | null) => void): Unsubscribe {
    const account = accounts.find((a) => a.uid === uid);
    setTimeout(() => listener(account ? toProfile(account) : null), 50);
    return () => undefined;
  },
};

export type { AuthUser, UserProfile, CreateUserInput, CreateUserResult, UpdateUserRoleInput, SetUserDisabledInput, DeleteUserInput, ManagedUser };
