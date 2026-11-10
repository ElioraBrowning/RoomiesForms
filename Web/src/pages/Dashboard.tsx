import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import FacultyDashboard from '../components/dashboards/FacultyDashboard';
import DepartmentHeadDashboard from '../components/dashboards/DepartmentHeadDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Dr. Bonnie Achée / CS Department Head View
  const isDepartmentHead =
    user?.roles?.includes('Department Head') ||
    user?.email?.trim().toLowerCase() === 'bonnie.achee@southeastern.edu' ||
    user?.email?.trim().toLowerCase() === 'bonnie.achee@selu.edu';

  if (isDepartmentHead) {
    return <DepartmentHeadDashboard />;
  }

  // Faculty / GDoc Reviewer View
  const cleanEmail = user?.email?.trim().toLowerCase() || '';
  const isFaculty =
    user?.roles?.some((role) => role === 'Faculty') ||
    cleanEmail === 'alkadi@selu.edu' ||
    cleanEmail === 'galkadi@selu.edu' ||
    cleanEmail === 'ghassan.alkadi@selu.edu' ||
    cleanEmail === 'alkadi@southeastern.edu' ||
    cleanEmail === 'galkadi@southeastern.edu' ||
    cleanEmail === 'ghassan.alkadi@southeastern.edu';
  if (isFaculty) {
    return <FacultyDashboard />;
  }

  // Student Default View
  return <StudentDashboard />;
}
