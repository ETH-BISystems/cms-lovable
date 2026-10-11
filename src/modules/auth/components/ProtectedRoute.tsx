import type { ReactNode } from 'react';
import { Navigate, Outlet } from '@/lib/router-compat';
import { useAuth } from '../hooks/useAuth';
import { Role } from '@/platform/types/roles';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  /** Mock adaptation: when children are given they render instead of <Outlet/>. */
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <AuthLoadingScreen />;
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <AccessDenied userRole={role} requiredRoles={allowedRoles} />;
  }
  return children ? <>{children}</> : <Outlet />;
}
