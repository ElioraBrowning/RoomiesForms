import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DepartmentHeadDashboard from '../components/dashboards/DepartmentHeadDashboard';
import { canAccessAnalytics } from '../utils/roles';

export default function Analytics() {
  const { user } = useAuth();

  if (!canAccessAnalytics(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <DepartmentHeadDashboard standalone />;
}
