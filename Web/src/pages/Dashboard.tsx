import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import FacultyDashboard from '../components/dashboards/FacultyDashboard';
import DepartmentHeadDashboard from '../components/dashboards/DepartmentHeadDashboard';
import { isDepartmentHeadUser } from '../utils/roles';

export default function Dashboard() {
  const { user } = useAuth();

  if (isDepartmentHeadUser(user)) {
    return <DepartmentHeadDashboard />;
  }

  if (user?.roles?.includes('Faculty')) {
    return <FacultyDashboard />;
  }

  return <StudentDashboard />;
}
