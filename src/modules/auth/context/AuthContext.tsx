import { createContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { authService } from '@/services/authService';
import type { AuthUser, UserProfile } from '@/services/types';
import { isValidRole, Role } from '@/platform/types/roles';
import type { AuthState } from '../types';

export const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Auth-state subscription (fires immediately with current value). The
  // service resolves the role from the ID token's custom claims and signs
  // out any user whose token has no valid role claim, so a non-null user
  // always carries a valid role.
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setRole(nextUser?.role ?? null);
      if (!nextUser) setUserProfile(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Profile subscription: Firestore users/{uid} listener. Keeps the display
  // profile fresh and picks up role changes made by an admin (the service
  // force-refreshes the token when claimsUpdatedAt changes).
  useEffect(() => {
    if (!user) return;
    const unsubscribe = authService.subscribeToProfile(user.uid, (profile) => {
      setUserProfile(profile);
      if (profile && isValidRole(profile.role)) {
        setRole(profile.role);
      }
    });
    return unsubscribe;
  }, [user]);

  const handleSignOut = useCallback(async () => {
    try {
      await authService.signOut();
      setUser(null);
      setUserProfile(null);
      setRole(null);
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }, [navigate]);

  const value: AuthState = {
    user,
    userProfile,
    role,
    loading,
    isAuthenticated: user !== null && role !== null,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
