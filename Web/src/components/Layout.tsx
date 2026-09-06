import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import ThemeToggle from './ThemeToggle';
import '../index.css';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo.png" alt="Roomie's Forms" style={{ height: '40px', width: 'auto' }} />
          </Link>
        </div>
        <nav className="navbar-nav">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/forms/builder">Form Builder</Link>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
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
