import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout-container">
      <header className="navbar">
        <div className="navbar-brand">
          Roomie's Forms
        </div>
        <nav className="navbar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/forms/builder">Form Builder</Link>
          <span>Welcome, {user?.fullName || 'User'}</span>
          <button onClick={handleLogout}>Logout</button>
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
