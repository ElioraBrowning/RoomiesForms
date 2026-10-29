import { Outlet, Link, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { getInitials } from '../utils/user';
import { useTheme } from '../hooks/useTheme';
import { BrandImage } from './BrandImage';
import { brand } from '../brand';
import Breadcrumbs from './Breadcrumbs';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isReviewer = user?.roles?.some((r) => ['Faculty', 'Department Head'].includes(r));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const primaryRole = user?.roles?.[0] || 'Student';

  return (
    <div className="layout-container">
      {/* Modern Southeastern Floating Capsule Header & Divider */}
      <div className="navbar-floating-wrapper">
        <header className="navbar-floating" role="banner">
          {/* Left Pill (Green Oval) - University Seal & App Branding */}
          <div className="navbar-pill navbar-pill-brand">
          <Link to="/dashboard" className="navbar-brand-link" aria-label="Roomie's Forms — Home">
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

        {/* Right Pill (Green Oval) - Navigation, Notification Bell, Theme Toggle & Account */}
        <div className="navbar-pill navbar-pill-actions">
          {/* Desktop Reviewer Navigation Links */}
          {isReviewer && (
            <nav className="navbar-links navbar-links-desktop" aria-label="Faculty Navigation">
              <NavLink to="/dashboard" className="navbar-link">
                Review Queue
              </NavLink>
              <NavLink to="/assignments" className="navbar-link">
                Assign Forms
              </NavLink>
              <NavLink to="/forms/builder" className="navbar-link">
                Form Builder
              </NavLink>
            </nav>
          )}

          {/* Polished Notification Bell */}
          <div className="navbar-bell-wrapper">
            <NotificationBell />
          </div>

          {/* Light / Dark Mode Toggle */}
          <div className="navbar-theme-wrapper">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          {/* Account Profile & View Switcher */}
          <div className="navbar-profile-container" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="navbar-avatar-btn"
              title="Account Menu"
              aria-label="User Account and Options"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <span className="navbar-avatar-circle">
                {getInitials(user?.fullName, user?.email)}
              </span>
              <span className={`navbar-avatar-caret ${dropdownOpen ? 'is-open' : ''}`} aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            {dropdownOpen && (
              <div className="navbar-dropdown" role="menu">
                <div className="navbar-dropdown-header">
                  <div className="navbar-dropdown-name">{user?.fullName || 'User'}</div>
                  <div className="navbar-dropdown-email">{user?.email}</div>
                  <div className="navbar-dropdown-role-tag">{primaryRole}</div>
                </div>

                {/* Mobile-visible navigation links for reviewer views */}
                {isReviewer && (
                  <div className="navbar-dropdown-mobile-links">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      📋 Review Queue
                    </Link>
                    <Link
                      to="/assignments"
                      onClick={() => setDropdownOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      ✍️ Assign Forms
                    </Link>
                    <Link
                      to="/forms/builder"
                      onClick={() => setDropdownOpen(false)}
                      className="navbar-dropdown-item"
                      role="menuitem"
                    >
                      🛠️ Form Builder
                    </Link>
                    <div className="navbar-dropdown-divider" />
                  </div>
                )}

                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="navbar-dropdown-item"
                  role="menuitem"
                >
                  👤 My Profile
                </Link>

                <div className="navbar-dropdown-divider" />

                <button
                  onClick={handleLogout}
                  className="navbar-dropdown-item navbar-dropdown-logout"
                  role="menuitem"
                >
                  🚪 Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

        {/* Thin subtle grey line separating the top hotbar from page content */}
        <div className="navbar-divider" />
      </div>

      {/* Southeastern Page Breadcrumb Trail with Navigation Arrows */}
      <Breadcrumbs />

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
