import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import { getInitials } from '../utils/user';
import '../index.css';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <div className="stripes" />
      <header className="navbar">
        <div className="navbar-brand">
          <Link to="/dashboard" className="navbar-brand-link" aria-label="Roomie's Forms — go to dashboard">
            <img
              className="navbar-seal"
              src="/brand/selu-logo-white.png"
              alt="Southeastern Louisiana University"
              width={900}
              height={218}
            />
            <span className="navbar-brand-divider" aria-hidden="true" />
            <span className="navbar-app-name">Roomie&rsquo;s Forms</span>
          </Link>
        </div>

        <nav className="navbar-nav">
          <div className="navbar-links">
            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
            {user?.roles?.some(r => ['Faculty', 'External', 'Department Head'].includes(r)) && (
              <Link to="/forms/builder" className="navbar-link">Form Builder</Link>
            )}
          </div>
          <div className="navbar-actions">
            <div className="navbar-theme-toggle">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
            
            <div className="navbar-profile-container" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="navbar-avatar-btn"
                title="User Profile"
                aria-label="User Profile Menu"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {getInitials(user?.fullName, user?.email)}
              </button>
              
              {dropdownOpen && (
                <div className="navbar-dropdown" role="menu">
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-name">
                      {user?.fullName || 'User'}
                    </div>
                    <div className="navbar-dropdown-email">
                      {user?.email}
                    </div>
                  </div>
                  
                  <Link 
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="navbar-dropdown-item"
                    role="menuitem"
                  >
                    My Profile
                  </Link>

                  <button 
                    onClick={handleLogout} 
                    className="navbar-dropdown-item navbar-dropdown-logout"
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>
      <div className="stripe" />
      <main className="main-content">
        <Outlet />
      </main>
      <div className="stripe" />
    </div>
  );
}