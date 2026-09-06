import { Outlet, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
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

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

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
          {user?.roles?.some(r => ['Faculty', 'External'].includes(r)) && (
            <Link to="/forms/builder">Form Builder</Link>
          )}
          <div style={{ marginRight: '1rem' }}>
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
              {getInitials(user?.fullName || 'User')}
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
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
