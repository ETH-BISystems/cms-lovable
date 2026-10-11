// Auth types now live in the shared service layer (@/services/types) so the
// backend implementation can evolve without breaking module boundaries.
// This file re-exports them plus a couple of auth-only view models.

export type {
  AuthUser,
  UserProfile,
  CreateUserInput,
  CreateUserResult,
  UpdateUserRoleInput,
  SetUserDisabledInput,
} from '@/services/types';

import type { AuthUser, UserProfile } from '@/services/types';
import type { Role } from '@/platform/types/roles';

export interface AuthState {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  role: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

export interface LoginFormData {
  email: string;
  password: string;
}
