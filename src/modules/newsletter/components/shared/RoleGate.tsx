import type { ReactNode } from 'react';
import type { Role } from '../../types/index';
import { hasMinimumRole } from '../../services/statusMachine';
import { useNewsletterContext } from '../../context/NewsletterContext';

interface RoleGateProps {
  minimumRole: Role;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on the current user's role.
 * Uses hasMinimumRole from the status machine to check access.
 * Renders nothing (or optional fallback) when role is insufficient.
 *
 * Requirements: 12.2, 12.3, 12.4
 */
export function RoleGate({ minimumRole, children, fallback = null }: RoleGateProps) {
  const { userRole } = useNewsletterContext();

  if (!hasMinimumRole(userRole, minimumRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
