import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../components/dashboards/StudentDashboard';
import FacultyDashboard from '../components/dashboards/FacultyDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  
  const isFacultyOrHead = user?.roles?.some(role => role === 'Faculty' || role === 'Department Head');

  return isFacultyOrHead ? <FacultyDashboard /> : <StudentDashboard />;
}
