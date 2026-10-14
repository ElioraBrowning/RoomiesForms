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
          <Link to="/dashboard">Dashboard</Link>
          {user?.roles?.some(r => ['Faculty', 'External', 'Department Head'].includes(r)) && (
            <Link to="/forms/builder">Form Builder</Link>
          )}
          <div className="navbar-theme-toggle">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
          
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--slu-gold)', color: '#000', 
                border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', padding: 0
              }}
              title="User Profile"
            >
              {getInitials(user?.fullName, user?.email)}
            </button>
            
            {dropdownOpen && (
              <div style={{
                position: 'absolute', top: '120%', right: 0, backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-card)', borderRadius: '8px', padding: '0.5rem', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '150px', zIndex: 10
              }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-card)', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  {user?.fullName || 'User'}
                </div>
                <div style={{ padding: '0 0.5rem 0.5rem', borderBottom: '1px solid var(--border-card)', color: 'var(--text-help)', fontSize: '0.8rem' }}>
                  {user?.email}
                </div>
                
                <Link 
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', marginTop: '0.5rem', 
                  backgroundColor: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', borderRadius: '4px', textDecoration: 'none' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-body)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  My Profile
                </Link>

                <button 
                  onClick={handleLogout} 
                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem', marginTop: '0.25rem', 
                  backgroundColor: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-body)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Logout
                </button>
              </div>
            )}
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