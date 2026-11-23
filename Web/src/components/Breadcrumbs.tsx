import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasReviewerRole } from '../utils/roles';

interface Crumb {
  label: string;
  path?: string;
}

const FORM_TITLES: Record<string, string> = {
  '1': 'CS 401: Internship Application',
  'CS401': 'CS 401: Internship Application',
  '2': 'CS 402: Internship Employer Agreement',
  'CS402': 'CS 402: Internship Employer Agreement',
  '3': "CS 403: Student's Measurable Learning Objectives",
  'CS403': "CS 403: Student's Measurable Learning Objectives",
  '4': "CS 404: Student's Time & Wage Report",
  'CS404': "CS 404: Student's Time & Wage Report",
  '5': 'CS 405: Computer Science Internship Weekly Activity Log',
  'CS405': 'CS 405: Computer Science Internship Weekly Activity Log',
  '6': "CS 410: Student's Evaluation of Internship Employer",
  'CS410': "CS 410: Student's Evaluation of Internship Employer",
  '7': "CS 420: Employer's Evaluation of the Computer Science Internship Student",
  'CS420': "CS 420: Employer's Evaluation of the Computer Science Internship Student",
  '8': 'Department of Computer Science Exit Survey',
  'ExitSurvey': 'Department of Computer Science Exit Survey',
};

function resolveFormTitle(formId: string): string {
  const direct = FORM_TITLES[formId];
  if (direct) return direct;
  const upper = formId.trim().toUpperCase();
  const entry = Object.entries(FORM_TITLES).find(([k]) => k.toUpperCase() === upper);
  return entry ? entry[1] : `Form #${formId}`;
}

export default function Breadcrumbs() {
  const location = useLocation();
  const { user } = useAuth();
  const pathname = location.pathname;

  const isReviewer = hasReviewerRole(user?.roles);
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

    // Analytics
    if (pathname === '/analytics') {
      return [
        { label: 'Home', path: '/dashboard' },
        { label: dashboardLabel, path: '/dashboard' },
        { label: 'Placement Analytics' },
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
      const formTitle = resolveFormTitle(formId);
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
      const formTitle = resolveFormTitle(formId);
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
