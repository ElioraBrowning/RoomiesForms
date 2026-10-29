import { Outlet, Link, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { getInitials } from '../utils/user';
import { useTheme } from '../hooks/useTheme';
import { BrandImage } from './BrandImage';
import { brand } from '../brand';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isReviewer = user?.roles?.some(r => ['Faculty', 'Department Head'].includes(r));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <Link to="/dashboard" className="navbar-brand-link" aria-label="Roomie's Forms home">
            <BrandImage
              className="navbar-seal"
              light={brand.universityLogoOnGreen}
              dark={brand.universityLogoOnGreen}
              alt="Southeastern Louisiana University"
              width={900}
              height={218}
            />
            <span className="navbar-brand-divider" aria-hidden="true" />
            <span className="navbar-app-name">Roomie&rsquo;s Forms</span>
          </Link>
        </div>

        <nav className="navbar-nav">
          {/* Students only have one page, which the logo already links to, so they get no tabs. */}
          {isReviewer && (
            <div className="navbar-links">
              <NavLink to="/dashboard" className="navbar-link">Review queue</NavLink>
              <NavLink to="/assignments" className="navbar-link">Assign forms</NavLink>
              <NavLink to="/forms/builder" className="navbar-link">Form builder</NavLink>
            </div>
          )}
          <div className="navbar-actions">
            <NotificationBell />
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
      <div className="stripes" />
      <main className="main-content">
        <Outlet />
      </main>
      <div className="stripe stripe-thin" />
    </div>
  );
}
