import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DepartmentHeadDashboard from '../components/dashboards/DepartmentHeadDashboard';
import type { User } from '../types';

/**
 * Validates whether the signed-in user is authorized to access the Computer Science
 * placement and outcomes analytics console:
 * - CS Department Head (Dr. Bonnie Achée or 'Department Head' role)
 * - Designated CS Faculty (Dr. Ghassan Alkadi or user.isDesignated flag)
 */
function canAccessAnalytics(user: User | null): boolean {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  const roles = user.roles || [];

  if (
    roles.includes('Department Head') ||
    email === 'bonnie.achee@southeastern.edu' ||
    email === 'bonnie.achee@selu.edu' ||
    email.includes('achee')
  ) {
    return true;
  }

  if (
    email === 'galkadi@selu.edu' ||
    email === 'alkadi@selu.edu' ||
    email.includes('alkadi') ||
    user.isDesignated
  ) {
    return true;
  }

  return false;
}

export default function Analytics() {
  const { user } = useAuth();

  if (!canAccessAnalytics(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DepartmentHeadDashboard standalone />;
}
