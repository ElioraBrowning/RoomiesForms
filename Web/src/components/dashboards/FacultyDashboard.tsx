import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readApiError } from '../../services/api';
import type { EmployerReview, SubmissionSummary } from '../../types';
import { SkeletonTable } from '../Skeleton';
import { ApprovalProgress } from '../ApprovalProgress';
import { Badge, StatusBadge } from '../StatusBadge';
import { CopyLink } from '../CopyLink';
import { employerLink } from '../../utils/links';

type Tab = 'pending' | 'reviewed' | 'employer';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString();
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** Matches the search box against the student, the form and the employer's email. */
function matches(s: SubmissionSummary, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [s.studentName, s.formTitle, s.formKey, s.employerReview?.employerEmail]
    .filter(Boolean)
    .some((v) => v!.toLowerCase().includes(q));
}

/** Used by both faculty and the department head: the queue shows whatever is waiting on the signed-in role. */
export default function FacultyDashboard() {
  const [queue, setQueue] = useState<SubmissionSummary[]>([]);
  const [reviewed, setReviewed] = useState<SubmissionSummary[]>([]);
  const [withEmployer, setWithEmployer] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('pending');
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<SubmissionSummary[]>('/submissions'),
      api.get<SubmissionSummary[]>('/submissions/reviewed'),
      api.get<SubmissionSummary[]>('/submissions/awaiting-employer'),
    ])
      .then(([q, r, e]) => {
        setQueue(q.data);
        setReviewed(r.data);
        setWithEmployer(e.data);
      })
      .catch((err) => setError(readApiError(err, "Couldn't load the review queue.").message))
      .finally(() => setLoading(false));
  }, []);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pending', label: 'Pending review', count: queue.length },
    { key: 'reviewed', label: 'Previously reviewed' },
    { key: 'employer', label: 'Waiting on employers', count: withEmployer.length },
  ];

  const list = (tab === 'pending' ? queue : tab === 'reviewed' ? reviewed : withEmployer).filter((s) => matches(s, query));

  const replaceEmployerReview = (id: number, review: EmployerReview) =>
    setWithEmployer((items) => items.map((s) => (s.id === id ? { ...s, employerReview: review } : s)));

  return (
    <div className="dashboard">
      <div className="page-head-row dashboard-head">
        <h1 className="dashboard-title">Review queue</h1>
        <div className="button-row">
          <Link to="/assignments" className="btn btn-primary btn-small">Assign forms</Link>
          <Link to="/forms/ExitSurvey/results" className="btn btn-secondary btn-small">Exit survey results</Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="card">
        <div className="card-head">
          <div className="view-tabs" role="tablist" aria-label="Which submissions to show">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`view-tab ${tab === t.key ? 'is-active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {!loading && t.count !== undefined && t.count > 0 && <span className="view-tab-count is-neutral">{t.count}</span>}
              </button>
            ))}
          </div>
          <label className="visually-hidden" htmlFor="queue-search">Search by student, form or employer</label>
          <input
            id="queue-search"
            type="search"
            className="input input-search"
            placeholder="Search students or forms"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <SkeletonTable />
        ) : list.length === 0 ? (
          <p className="empty-state">
            {query
              ? 'Nothing matches that search.'
              : tab === 'pending'
                ? 'Nothing is waiting on you right now.'
                : tab === 'reviewed'
                  ? "You haven't reviewed anything yet."
                  : 'No forms are waiting on an employer.'}
          </p>
        ) : tab === 'pending' ? (
          <PendingTable list={list} />
        ) : tab === 'reviewed' ? (
          <ReviewedTable list={list} />
        ) : (
          <EmployerList list={list} onNewLink={replaceEmployerReview} />
        )}
      </section>
    </div>
  );
}

function PendingTable({ list }: { list: SubmissionSummary[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Form</th>
            <th scope="col">Student</th>
            <th scope="col">Last updated</th>
            <th scope="col">Progress</th>
            <th scope="col"><span className="visually-hidden">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => {
            const waiting = daysSince(s.updatedAt);
            return (
              <tr key={s.id}>
                <td className="table-strong">
                  {s.formTitle}
                  {s.isResubmission && <> <Badge tone="info">Revised</Badge></>}
                </td>
                <td>{s.studentName}</td>
                <td>
                  {shortDate(s.updatedAt)}
                  {waiting >= 7 && <span className="table-sub text-danger">Waiting {waiting} days</span>}
                </td>
                <td className="table-pipeline">
                  <ApprovalProgress steps={s.approvals ?? []} compact />
                </td>
                <td className="table-actions">
                  <Link to={`/submissions/${s.id}`} className="btn btn-primary btn-small">Review</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReviewedTable({ list }: { list: SubmissionSummary[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Form</th>
            <th scope="col">Student</th>
            <th scope="col">You</th>
            <th scope="col">Now</th>
            <th scope="col"><span className="visually-hidden">Action</span></th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td className="table-strong">{s.formTitle}</td>
              <td>{s.studentName}</td>
              <td>
                <StatusBadge
                  status={s.reviewedAction === 'Approved' ? 'Completed' : 'Rejected'}
                  label={s.reviewedAction === 'Approved' ? 'Approved' : 'Sent back'}
                />
                {s.reviewedAt && <span className="table-sub">{shortDate(s.reviewedAt)}</span>}
              </td>
              <td>
                <StatusBadge status={s.status} />
                {s.status === 'Pending' && s.currentStepName && <span className="table-sub">{s.currentStepName}</span>}
              </td>
              <td className="table-actions">
                <Link to={`/submissions/${s.id}`} className="btn btn-secondary btn-small">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployerList({ list, onNewLink }: { list: SubmissionSummary[]; onNewLink: (id: number, review: EmployerReview) => void }) {
  return (
    <>
      <p className="help-text">These reach you after the employer signs or completes their part. Links last 14 days. If one expired or got lost, make a new one.</p>
      <ul className="employer-list">
        {list.map((s) => (
          <EmployerItem key={s.id} submission={s} onNewLink={onNewLink} />
        ))}
      </ul>
    </>
  );
}

function EmployerItem({ submission: s, onNewLink }: { submission: SubmissionSummary; onNewLink: (id: number, review: EmployerReview) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const review = s.employerReview;

  const renew = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.post<EmployerReview>(`/submissions/${s.id}/employer-link`);
      onNewLink(s.id, res.data);
    } catch (err) {
      setError(readApiError(err, "Couldn't make a new link.").message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="employer-item">
      <div>
        <Link to={`/submissions/${s.id}`} className="table-strong">{s.formTitle}</Link>
        <p className="help-text">
          {s.studentName} · {review?.employerEmail} · sent {shortDate(s.updatedAt)}
          {review?.expired && <> · <span className="text-danger">link expired</span></>}
        </p>
        {error && <p className="text-danger">{error}</p>}
      </div>
      {review?.accessToken && !review.expired ? (
        <CopyLink url={employerLink(review.accessToken)} />
      ) : (
        <button type="button" className="btn btn-secondary btn-small" onClick={renew} disabled={busy}>
          {busy ? 'Making a link…' : 'Make a new link'}
        </button>
      )}
    </li>
  );
}
