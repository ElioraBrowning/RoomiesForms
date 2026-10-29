import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormView from './pages/FormView';
import SubmissionReview from './pages/SubmissionReview';
import Profile from './pages/Profile';
import Assignments from './pages/Assignments.tsx';
import SurveyResults from './pages/SurveyResults';
import EmployerReview from './pages/EmployerReview';

const REVIEWER_ROLES = ['Faculty', 'Department Head'];

const ReviewerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user?.roles?.some((r) => REVIEWER_ROLES.includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Employers open this from a link; they don't have accounts. */}
          <Route path="/employer/:token" element={<EmployerReview />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="assignments" element={<ReviewerRoute><Assignments /></ReviewerRoute>} />
            <Route path="forms/builder" element={<ReviewerRoute><FormBuilder /></ReviewerRoute>} />
            <Route path="forms/:formId/results" element={<ReviewerRoute><SurveyResults /></ReviewerRoute>} />
            <Route path="forms/:formId" element={<FormView />} />
            <Route path="submissions/:id" element={<SubmissionReview />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;