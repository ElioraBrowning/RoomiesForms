import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import FacultyDashboard from '../components/dashboards/FacultyDashboard';
import DeanDashboard from '../components/dashboards/DeanDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Dr. Bonnie Achée / Dean / Department Head View
  const isDean =
    user?.roles?.includes('Dean') ||
    user?.roles?.includes('Department Head') ||
    user?.email?.trim().toLowerCase() === 'bonnie.achee@southeastern.edu';

  if (isDean) {
    return <DeanDashboard />;
  }

  // Faculty / GDoc Reviewer View
  const isFaculty = user?.roles?.some((role) => role === 'Faculty');
  if (isFaculty) {
    return <FacultyDashboard />;
  }

  // Student Default View
  return <StudentDashboard />;
}
