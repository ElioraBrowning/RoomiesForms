import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Crumb {
  label: string;
  path?: string;
}

const FORM_TITLES: Record<string, string> = {
  '1': 'CS 401: Pre-Internship Agreement',
  '2': 'CS 402: Post-Internship Evaluation',
  '3': 'CS 403: Internship Bi-Weekly Report',
  '4': 'CS 404: Employer Midterm Evaluation',
  '5': 'CS 405: Employer Final Evaluation',
  '6': 'CS 410: Degree Evaluation & Checklist',
  '7': 'CS 420: Senior Capstone Proposal',
  '8': 'CS Exit Survey',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const { user } = useAuth();
  const pathname = location.pathname;

  const isReviewer = user?.roles?.some((r) => ['Faculty', 'Department Head'].includes(r));
  const dashboardLabel = isReviewer ? 'Review Queue' : 'Dashboard';

  const getCrumbs = (): Crumb[] => {
    // 1. Dashboard
    if (pathname === '/dashboard' || pathname === '/') {
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel },
      ];
    }

    // 2. Profile
    if (pathname === '/profile') {
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: 'My Profile' },
      ];
    }

    // 3. Assignments
    if (pathname === '/assignments') {
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: 'Assign Forms' },
      ];
    }

    // 4. Form Builder
    if (pathname === '/forms/builder') {
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: 'Form Builder' },
      ];
    }

    // 5. Form Results
    const resultsMatch = pathname.match(/^\/forms\/([^/]+)\/results$/);
    if (resultsMatch) {
      const formId = resultsMatch[1];
      const formTitle = FORM_TITLES[formId] || `Form #${formId}`;
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: formTitle, path: `/forms/${formId}` },
        { label: 'Survey Results' },
      ];
    }

    // 6. Form View
    const formMatch = pathname.match(/^\/forms\/([^/]+)$/);
    if (formMatch) {
      const formId = formMatch[1];
      const formTitle = FORM_TITLES[formId] || `Form #${formId}`;
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: formTitle },
      ];
    }

    // 7. Submissions Review
    const subMatch = pathname.match(/^\/submissions\/([^/]+)$/);
    if (subMatch) {
      const subId = subMatch[1];
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: `Submission #${subId}` },
      ];
    }

    // Fallback: Generic dynamic path generator
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: Crumb[] = [
      { label: 'Home', path: '/dashboard' },
      { label: dashboardLabel, path: '/dashboard' },
    ];

    let currentPath = '';
    segments.forEach((seg, idx) => {
      currentPath += `/${seg}`;
      const isLast = idx === segments.length - 1;
      const formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/[-_]/g, ' ');
      crumbs.push({
        label: formatted,
        path: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  };

  const crumbs = getCrumbs();

  return (
    <nav className="breadcrumbs-bar" aria-label="Breadcrumb Navigation">
      <div className="breadcrumbs-container">
        <ol className="breadcrumbs-list">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${idx}`} className="breadcrumbs-item">
                {idx > 0 && (
                  <span className="breadcrumbs-arrow" aria-hidden="true">
                    <svg
                      width="7"
                      height="11"
                      viewBox="0 0 7 11"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M1 1.5L5.5 5.5L1 9.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
                {crumb.path && !isLast ? (
                  <Link to={crumb.path} className="breadcrumbs-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="breadcrumbs-current" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
