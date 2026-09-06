import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormView from './pages/FormView';
import SubmissionReview from './pages/SubmissionReview';
import Profile from './pages/Profile';

const ProtectedBuilderRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user?.roles?.some(r => ['Faculty', 'External', 'Department Head'].includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="forms/builder" element={<ProtectedBuilderRoute><FormBuilder /></ProtectedBuilderRoute>} />
            <Route path="forms/:formId" element={<FormView />} />
            <Route path="submissions/:id" element={<SubmissionReview />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
