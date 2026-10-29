import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readApiError } from '../../services/api';
import type { Assignment, EmployerReview, SubmissionSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCards } from '../Skeleton';
import { StatusBadge } from '../StatusBadge';
import { ApprovalPopover } from '../ApprovalPopover';
import { CopyLink } from '../CopyLink';
import { employerLink } from '../../utils/links';

type Group = 'fix' | 'todo' | 'review' | 'done';

const GROUPS: { key: Group; label: string; statuses: string[] }[] = [
  { key: 'fix', label: 'Needs changes', statuses: ['Rejected'] },
  { key: 'todo', label: 'To do', statuses: ['Not started', 'Draft'] },
  { key: 'review', label: 'In review', statuses: ['Pending'] },
  { key: 'done', label: 'Done', statuses: ['Completed', 'Submitted'] },
];
const GROUP_ORDER: Group[] = ['fix', 'todo', 'review', 'done'];

/** After this many days at one step, students get a nudge to follow up. */
const FOLLOW_UP_DAYS = 7;

const groupOf = (a: Assignment): Group => GROUPS.find((g) => g.statuses.includes(a.status))?.key ?? 'todo';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

function formatDue(due?: string | null) {
  if (!due) return null;
  const d = new Date(due);
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (days < 0) return { text: `Overdue, was due ${date}`, late: true };
  if (days <= 3) return { text: `Due ${date}`, late: true };
  return { text: `Due ${date}`, late: false };
}

/** Department, then purpose (Internship, Program feedback...), each sorted by what needs doing first. */
function groupByDepartment(list: Assignment[]) {
  const departments = new Map<string, Map<string, Assignment[]>>();
  for (const a of list) {
    const dept = a.department || 'Other';
    const cat = a.category || 'Other';
    if (!departments.has(dept)) departments.set(dept, new Map());
    const cats = departments.get(dept)!;
    cats.set(cat, [...(cats.get(cat) ?? []), a]);
  }
  return [...departments.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dept, cats]) => ({
      dept,
      categories: [...cats.entries()]
        // Internship forms first: they're the ones with deadlines.
        .sort(([a], [b]) => (a === 'Internship' ? -1 : b === 'Internship' ? 1 : a.localeCompare(b)))
        .map(([category, items]) => ({ category, items })),
    }));
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Group | null>(null);

  useEffect(() => {
    Promise.all([api.get<Assignment[]>('/assignments/mine'), api.get<SubmissionSummary[]>('/submissions')])
      .then(([a, s]) => {
        setAssignments(a.data);
        setSubmissions(s.data);
      })
      .catch((err) => setError(readApiError(err, "Couldn't load your forms.").message))
      .finally(() => setLoading(false));
  }, []);

  // Needs-changes first, then by due date (soonest first), then by form number.
  const sorted = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        const g = GROUP_ORDER.indexOf(groupOf(a)) - GROUP_ORDER.indexOf(groupOf(b));
        if (g !== 0) return g;
        const da = a.dueDate ? Date.parse(a.dueDate) : Infinity;
        const db = b.dueDate ? Date.parse(b.dueDate) : Infinity;
        if (da !== db) return da - db;
        return a.formKey.localeCompare(b.formKey);
      }),
    [assignments],
  );

  const counts = Object.fromEntries(GROUPS.map((g) => [g.key, assignments.filter((a) => groupOf(a) === g.key).length])) as Record<Group, number>;
  const shown = filter ? sorted.filter((a) => groupOf(a) === filter) : sorted;
  const departments = groupByDepartment(shown);
  const firstName = user?.fullName?.split(' ')[0];

  const replaceEmployerReview = (submissionId: number, review: EmployerReview) =>
    setSubmissions((list) => list.map((s) => (s.id === submissionId ? { ...s, employerReview: review } : s)));

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">{firstName ? `Hi, ${firstName}` : 'Your forms'}</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && assignments.length > 0 && (
        <div className="summary-strip" role="group" aria-label="Filter forms">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`summary-tile tile-${g.key} ${filter === g.key ? 'is-active' : ''}`}
              aria-pressed={filter === g.key}
              onClick={() => setFilter(filter === g.key ? null : g.key)}
              disabled={counts[g.key] === 0}
            >
              <span className="summary-count">{counts[g.key]}</span>
              <span className="summary-label">{g.label}</span>
            </button>
          ))}
        </div>
      )}

      {loading && <SkeletonCards />}

      {!loading && !error && assignments.length === 0 && (
        <div className="card empty-card">
          <h2>No forms yet</h2>
          <p>When your faculty advisor assigns you a form, it will show up here.</p>
        </div>
      )}

      {filter && (
        <p className="help-text">
          Showing {GROUPS.find((g) => g.key === filter)?.label.toLowerCase()}.{' '}
          <button type="button" className="btn-link" onClick={() => setFilter(null)}>Show all</button>
        </p>
      )}

      {departments.map(({ dept, categories }) => (
        <section key={dept} className="form-department" aria-label={dept}>
          <h2 className="form-department-title">{dept}</h2>
          {categories.map(({ category, items }) => (
            <div key={category} className="form-category">
              <h3 className="form-category-title">{category}</h3>
              <div className="form-cards">
                {items.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    submission={submissions.find((s) => s.formId === a.formId && s.status !== 'Draft')}
                    onNewEmployerLink={replaceEmployerReview}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/** One form: name, summary, where it stands, and one main button. Never grows to match its neighbours. */
function AssignmentCard({
  assignment: a,
  submission,
  onNewEmployerLink,
}: {
  assignment: Assignment;
  submission?: SubmissionSummary;
  onNewEmployerLink: (submissionId: number, review: EmployerReview) => void;
}) {
  const group = groupOf(a);
  const due = group === 'todo' || group === 'fix' ? formatDue(a.dueDate) : null;
  const [showNeeds, setShowNeeds] = useState(false);

  const steps = submission?.approvals ?? [];
  const current = steps.find((s) => s.status === 'Pending Review');
  const sentBack = steps.find((s) => s.status === 'Changes Requested');
  const waitingDays = submission && group === 'review' ? daysSince(submission.updatedAt) : 0;
  const atEmployer = current?.roleName === 'Employer';

  const action =
    a.status === 'Not started'
      ? { to: `/forms/${a.formId}`, label: 'Start', primary: true }
      : a.status === 'Draft'
        ? { to: `/forms/${a.formId}`, label: `Continue${typeof a.progress === 'number' ? ` (${a.progress}%)` : ''}`, primary: true }
        : a.status === 'Rejected'
          ? { to: a.submissionId ? `/submissions/${a.submissionId}` : `/forms/${a.formId}`, label: 'See what to fix', primary: true }
          : a.submissionId
            ? { to: `/submissions/${a.submissionId}`, label: 'View', primary: false }
            : null;

  return (
    <article className={`form-card group-${group}`}>
      <div className="form-card-tab">{a.formKey === 'ExitSurvey' ? 'Survey' : a.formKey.replace('CS', 'CS ')}</div>
      <div className="form-card-head">
        <h4 className="form-card-title">{a.formTitle.replace(/^CS \d+: /, '')}</h4>
        <StatusBadge status={a.status} />
      </div>

      {a.description && <p className="form-card-summary">{a.description}</p>}

      {a.needs && a.needs.length > 0 && group === 'todo' && (
        <div className="form-card-needs">
          <button type="button" className="btn-link" aria-expanded={showNeeds} onClick={() => setShowNeeds(!showNeeds)}>
            {showNeeds ? 'Less info' : 'More info'}
          </button>
          {showNeeds && (
            <>
              <p className="form-card-needs-title">Have these ready:</p>
              <ul className="form-card-needs-list">
                {a.needs.map((n) => <li key={n}>{n}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="form-card-meta">
        {due && <span className={due.late ? 'text-danger' : ''}>{due.text}</span>}
        {a.anonymous && <span className="tag">Anonymous</span>}
        {submission && group !== 'todo' && (
          <span>
            Started {shortDate(submission.createdAt)} · Updated {shortDate(submission.updatedAt)}
          </span>
        )}
      </div>

      {a.status === 'Draft' && typeof a.progress === 'number' && (
        <div className="progress-track" aria-label={`${a.progress}% answered`}>
          <div className="progress-fill" style={{ width: `${a.progress}%` }} />
        </div>
      )}

      {group === 'fix' && sentBack && (
        <p className="form-card-feedback">
          Changes requested by {sentBack.approvedBy ?? sentBack.reviewerName}
          {sentBack.actionDate ? ` on ${shortDate(sentBack.actionDate)}` : ''}.
        </p>
      )}

      {group === 'review' && current && (
        <div className="form-card-status">
          <span>
            With {atEmployer ? 'your supervisor' : current.reviewerName}
            {waitingDays > 0 ? ` for ${waitingDays} day${waitingDays === 1 ? '' : 's'}` : ''}
          </span>
          <ApprovalPopover steps={steps} />
        </div>
      )}

      {group === 'review' && current && waitingDays >= FOLLOW_UP_DAYS && (
        <p className="form-card-nudge">
          {atEmployer
            ? 'It has been over a week. Check in with your supervisor, or send them the link again.'
            : `It has been over a week. Consider emailing ${current.reviewerName} to follow up.`}
        </p>
      )}

      {a.status === 'Submitted' && <p className="form-card-note">Submitted anonymously. Thank you.</p>}

      {submission && atEmployer && submission.employerReview && (
        <EmployerLink submissionId={submission.id} review={submission.employerReview} onNewLink={onNewEmployerLink} />
      )}

      {action && (
        <div className="form-card-actions">
          <Link to={action.to} className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'}`}>
            {action.label}
          </Link>
        </div>
      )}
    </article>
  );
}

/** The supervisor's link: hidden until asked for, with a way to replace an expired or lost one. */
function EmployerLink({
  submissionId,
  review,
  onNewLink,
}: {
  submissionId: number;
  review: EmployerReview;
  onNewLink: (submissionId: number, review: EmployerReview) => void;
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const renew = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post<EmployerReview>(`/submissions/${submissionId}/employer-link`);
      onNewLink(submissionId, res.data);
      setShow(true);
    } catch (err) {
      setError(readApiError(err, "Couldn't make a new link.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-card-employer">
      {review.expired || !review.accessToken ? (
        <p>
          The link for your supervisor has expired.{' '}
          <button type="button" className="btn-link" onClick={renew} disabled={busy}>
            {busy ? 'Making a new link…' : 'Get a new link'}
          </button>
        </p>
      ) : show ? (
        <>
          <CopyLink url={employerLink(review.accessToken)} />
          {review.expiresAt && <p>Works until {shortDate(review.expiresAt)}.</p>}
        </>
      ) : (
        <button type="button" className="btn-link" onClick={() => setShow(true)}>
          Get the link for your supervisor
        </button>
      )}
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
