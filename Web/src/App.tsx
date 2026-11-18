import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormView from './pages/FormView';
import SubmissionReview from './pages/SubmissionReview';
import Profile from './pages/Profile';
import Assignments from './pages/Assignments.tsx';
import SurveyResults from './pages/SurveyResults';
import EmployerReview from './pages/EmployerReview';
import Analytics from './pages/Analytics';

const REVIEWER_ROLES = ['Faculty', 'Department Head'];
const EXIT_SURVEY_ROLE = 'Exit Survey Reviewer';

const isExitSurveyOnly = (roles?: string[]) =>
  Boolean(roles?.includes(EXIT_SURVEY_ROLE) && !roles?.some((r) => REVIEWER_ROLES.includes(r)));

const ReviewerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (isExitSurveyOnly(user?.roles)) {
    return <Navigate to="/exit-survey-results" replace />;
  }
  if (!user?.roles?.some((r) => REVIEWER_ROLES.includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const ExitSurveyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const allowed =
    user?.roles?.includes(EXIT_SURVEY_ROLE) ||
    user?.roles?.some((r) => REVIEWER_ROLES.includes(r));

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (isExitSurveyOnly(user?.roles)) {
    return <Navigate to="/exit-survey-results" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const DashboardGate = () => {
  const { user } = useAuth();
  if (isExitSurveyOnly(user?.roles)) {
    return <Navigate to="/exit-survey-results" replace />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          {/* Employers open this from a link; they don't have accounts. */}
          <Route path="/employer/:token" element={<EmployerReview />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="dashboard" element={<DashboardGate />} />
            <Route path="profile" element={<Profile />} />
            <Route path="exit-survey-results" element={<ExitSurveyRoute><SurveyResults /></ExitSurveyRoute>} />
            <Route path="analytics" element={<ReviewerRoute><Analytics /></ReviewerRoute>} />
            <Route path="assignments" element={<ReviewerRoute><Assignments /></ReviewerRoute>} />
            <Route path="forms/builder" element={<ReviewerRoute><FormBuilder /></ReviewerRoute>} />
            <Route path="forms/:formId/results" element={<ExitSurveyRoute><SurveyResults /></ExitSurveyRoute>} />
            <Route path="forms/:formId" element={<FormView />} />
            <Route path="submissions/:id" element={<SubmissionReview />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;