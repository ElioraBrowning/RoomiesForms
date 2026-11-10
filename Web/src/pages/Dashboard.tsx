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
  const isFaculty = user?.roles?.some((role) => role === 'Faculty');
  if (isFaculty) {
    return <FacultyDashboard />;
  }

  // Student Default View
  return <StudentDashboard />;
}
