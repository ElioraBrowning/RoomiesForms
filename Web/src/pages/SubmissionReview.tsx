import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { readApiError } from '../services/api';
import type { FormDetail, SubmissionDetail } from '../types';
import type { FormPage, FormQuestion, FormSchema } from '../forms/types';
import { AnswerSummary } from '../forms/AnswerSummary';
import { FormLayoutReview } from '../forms/FormLayoutReview';
import { formatAnswer } from '../forms/format';
import { useAuth } from '../context/AuthContext';
import { ApprovalProgress } from '../components/ApprovalProgress';
import { StatusBadge } from '../components/StatusBadge';
import { CopyLink } from '../components/CopyLink';
import { SkeletonForm } from '../components/Skeleton';
import { employerLink } from '../utils/links';

type Mark = 'ok' | 'flag' | 'note';
interface QuestionReview {
  mark?: Mark;
  comment: string;
}
type View = 'check' | 'all' | 'layout';

const REVIEWER_ROLES = ['Faculty', 'Department Head'];

/** Feedback lines look like "[Changes Needed] Label: what to fix". */
function parseQuestionFeedback(comments?: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of (comments ?? '').split('\n')) {
    const m = line.match(/^\[(Changes Needed|Note)\]\s*([^:]+):\s*(.+)$/i);
    if (m) map[m[2].trim().toLowerCase()] = m[3].trim();
  }
  return map;
}

function generalComment(comments?: string | null): string {
  return (comments ?? '')
    .split('\n')
    .filter((l) => !/^\[(Changes Needed|Note)\]/i.test(l) && !/^question feedback:/i.test(l))
    .join('\n')
    .trim();
}

/** Keeps only the questions that pass `keep`, and drops pages left empty. */
function filterPages(pages: FormPage[], keep: (q: FormQuestion) => boolean): FormPage[] {
  return pages
    .map((p) => ({ ...p, questions: p.questions.filter(keep) }))
    .filter((p) => p.questions.length > 0);
}

export default function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reviews, setReviews] = useState<Record<string, QuestionReview>>({});
  const [view, setView] = useState<View>('check');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isReviewer = Boolean(user?.roles?.some((r) => REVIEWER_ROLES.includes(r)));

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<SubmissionDetail>(`/submissions/${id}`);
        setSubmission(res.data);
        const formKey = res.data.form?.googleFormId;
        if (formKey) {
          const formRes = await api.get<FormDetail>(`/forms/${formKey}`).catch(() => null);
          setSchema(formRes?.data.schema ?? null);
        }
      } catch (err) {
        setLoadError(readApiError(err, "Couldn't load this submission.").message);
      }
    })();
  }, [id]);

  const requiredRole = submission?.currentStep?.requiredRole?.name;
  const isMyTurn = Boolean(isReviewer && submission?.status === 'Pending' && requiredRole && user?.roles?.includes(requiredRole));
  const isWithEmployer = submission?.status === 'Pending' && requiredRole === 'Employer';

  const latestFeedback = useMemo(() => {
    const logs = submission?.auditLogs ?? [];
    return [...logs].reverse().find((l) => l.action === 'Rejected' && l.comments);
  }, [submission]);
  const studentFeedback = useMemo(() => parseQuestionFeedback(latestFeedback?.comments), [latestFeedback]);

  // The student's pages, plus the employer's once they have answers in them.
  const pages: FormPage[] = useMemo(() => {
    if (!schema || !submission) return [];
    const answers = submission.responses ?? {};
    return schema.pages.filter(
      (p) => (p.respondent ?? 'student') === 'student' || p.questions.some((q) => answers[q.id] !== undefined),
    );
  }, [schema, submission]);

  const hasCheckList = pages.some((p) => p.questions.some((q) => q.reviewRequired));

  if (loadError) {
    return (
      <div className="card page-message">
        <h1>Can't open this submission</h1>
        <p>{loadError}</p>
        <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }
  if (!submission) return <div className="review-page"><SkeletonForm /></div>;

  const answers = submission.responses ?? {};
  const allQuestions = pages.flatMap((p) => p.questions);
  const toCheck = allQuestions.filter((q) => q.reviewRequired);
  const flagged = allQuestions.filter((q) => reviews[q.id]?.mark === 'flag');
  const noted = allQuestions.filter((q) => reviews[q.id]?.comment.trim() && reviews[q.id]?.mark !== 'flag');
  const checkedCount = toCheck.filter((q) => reviews[q.id]?.mark).length;
  const unmarked = toCheck.filter((q) => !reviews[q.id]?.mark);
  const approvedCount = allQuestions.filter((q) => reviews[q.id]?.mark === 'ok').length;
  const flagsWithoutComment = flagged.filter((q) => !reviews[q.id]?.comment.trim());

  // Sending back needs every checked answer decided, a reason on each "needs changes",
  // and something for the student to act on.
  const sendBackBlocker =
    unmarked.length > 0
      ? `Approve or flag the ${unmarked.length} remaining answer${unmarked.length === 1 ? '' : 's'} first.`
      : flagsWithoutComment.length > 0
        ? `Say what to fix on ${flagsWithoutComment.length === 1 ? '"' + flagsWithoutComment[0].label + '"' : flagsWithoutComment.length + ' flagged answers'}.`
        : flagged.length === 0 && noted.length === 0 && !remarks.trim()
          ? 'Flag an answer or write a remark so the student knows what to fix.'
          : '';

  const approveAllRemaining = () =>
    setReviews((prev) => {
      const next = { ...prev };
      for (const q of unmarked) next[q.id] = { ...(next[q.id] ?? { comment: '' }), mark: 'ok' };
      return next;
    });

  // "Needs review" shows the questions marked reviewRequired, plus anything already flagged.
  const activeView: View = view === 'check' && !hasCheckList ? 'all' : view;
  const shownPages =
    activeView === 'check' ? filterPages(pages, (q) => Boolean(q.reviewRequired) || Boolean(reviews[q.id]?.mark)) : pages;

  const setMark = (qid: string, mark: Mark) =>
    setReviews((prev) => {
      const current = prev[qid] ?? { comment: '' };
      return { ...prev, [qid]: { ...current, mark: current.mark === mark ? undefined : mark } };
    });
  const setComment = (qid: string, comment: string) =>
    setReviews((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? {}), comment } }));

  const approve = async () => {
    if (flagged.length > 0 && !window.confirm(`${flagged.length} answer(s) are marked as needing changes. Approve anyway?`)) return;
    setError('');
    setBusy('approve');
    try {
      await api.post(`/submissions/${id}/approve`, { comments: remarks.trim() || null });
      setNotice('Approved. Returning to the dashboard…');
      window.setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(readApiError(err, "Couldn't approve this submission.").message);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    const items = [...flagged, ...noted];
    if (sendBackBlocker) {
      setError(sendBackBlocker);
      return;
    }
    const lines = items.map((q) => {
      const r = reviews[q.id];
      const tag = r.mark === 'flag' ? '[Changes Needed]' : '[Note]';
      return `${tag} ${q.label}: ${r.comment.trim() || 'Please check this answer.'}`;
    });
    const comments = [remarks.trim(), lines.length ? `Question feedback:\n${lines.join('\n')}` : ''].filter(Boolean).join('\n\n');

    setError('');
    setBusy('reject');
    try {
      await api.post(`/submissions/${id}/reject`, { comments });
      setNotice('Sent back to the student. Returning to the dashboard…');
      window.setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(readApiError(err, "Couldn't send this back.").message);
    } finally {
      setBusy(null);
    }
  };

  const status = submission.status;
  const controls = (q: FormQuestion) => (
    <ReviewControls review={reviews[q.id]} onMark={(m) => setMark(q.id, m)} onComment={(c) => setComment(q.id, c)} />
  );

  return (
    <div className={`review-page ${isMyTurn ? 'has-decision-bar' : ''}`}>
      <div className="page-head">
        <p className="page-eyebrow">{isReviewer ? `Submission #${submission.id}` : 'Your submission'}</p>
        <h1>{submission.form?.title}</h1>
        {isReviewer && (
          <p className="page-meta">
            {submission.student?.fullName}
            {submission.student?.wNumber ? ` · ${submission.student.wNumber}` : ''}
            {submission.student?.email ? ` · ${submission.student.email}` : ''}
            {submission.updatedAt ? ` · submitted ${new Date(submission.updatedAt).toLocaleDateString()}` : ''}
          </p>
        )}
      </div>

      <section className="card card-tight">
        <ApprovalProgress steps={submission.approvals ?? []} />
        {isWithEmployer && submission.employerReview && (
          <div className="employer-wait">
            <p>
              Waiting on <strong>{submission.employerReview.employerEmail}</strong>.{' '}
              {isReviewer ? 'Send them this link if they need it again:' : 'If they lost the link, send it again:'}
            </p>
            {submission.employerReview.accessToken && <CopyLink url={employerLink(submission.employerReview.accessToken)} />}
          </div>
        )}
      </section>

      {/* ---------------- Student view: status and only what needs fixing ---------------- */}
      {!isReviewer && status === 'Rejected' && (
        <section className="card fix-card">
          <h2 className="card-title">What to fix</h2>
          {latestFeedback && (
            <p className="help-text">
              Requested by {latestFeedback.reviewer?.fullName ?? 'a reviewer'} on{' '}
              {new Date(latestFeedback.actionTimestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.
            </p>
          )}
          {generalComment(latestFeedback?.comments) && (
            <pre className="alert-quote">{generalComment(latestFeedback?.comments)}</pre>
          )}
          <ul className="fix-list">
            {allQuestions
              .filter((q) => studentFeedback[q.label.toLowerCase()])
              .map((q) => (
                <li key={q.id}>
                  <span className="fix-label">{q.label}</span>
                  <span className="fix-answer">You answered: {formatAnswer(q, answers[q.id]) || 'nothing'}</span>
                  <span className="fix-note">{studentFeedback[q.label.toLowerCase()]}</span>
                </li>
              ))}
          </ul>
          <Link to={`/forms/${submission.form?.id}`} className="btn btn-primary">Edit and resubmit</Link>
        </section>
      )}
      {!isReviewer && status === 'Pending' && !isWithEmployer && (
        <p className="alert alert-warning">{submission.currentStep?.actionName ?? 'A reviewer'} has your submission. You'll get a notification when it moves.</p>
      )}
      {!isReviewer && status === 'Completed' && <p className="alert alert-success">This form has been through every review step.</p>}

      {/* ---------------- Reviewer view ---------------- */}
      {isReviewer && (
        <section className="card">
          <div className="card-head">
            <div className="view-tabs" role="tablist" aria-label="How to show the answers">
              {hasCheckList && (
                <button type="button" role="tab" aria-selected={activeView === 'check'} className={`view-tab ${activeView === 'check' ? 'is-active' : ''}`} onClick={() => setView('check')}>
                  Needs review <span className="view-tab-count">{toCheck.length}</span>
                </button>
              )}
              <button type="button" role="tab" aria-selected={activeView === 'all'} className={`view-tab ${activeView === 'all' ? 'is-active' : ''}`} onClick={() => setView('all')}>
                All answers
              </button>
              <button type="button" role="tab" aria-selected={activeView === 'layout'} className={`view-tab ${activeView === 'layout' ? 'is-active' : ''}`} onClick={() => setView('layout')}>
                Form layout
              </button>
            </div>
          </div>

          {!schema ? (
            <p className="help-text">This form's definition couldn't be loaded.</p>
          ) : activeView === 'layout' ? (
            <FormLayoutReview
              pages={pages}
              answers={answers}
              needsCheck={(q) => Boolean(q.reviewRequired)}
              stateOf={(q) => reviews[q.id]?.mark}
              renderControls={(q) => (isMyTurn ? controls(q) : <span className="verify-box-tag">Verify</span>)}
            />
          ) : (
            <AnswerSummary
              pages={shownPages}
              answers={answers}
              answerClassName={(q) => (reviews[q.id]?.mark ? `is-${reviews[q.id]!.mark}` : q.reviewRequired && activeView === 'all' ? 'is-required' : '')}
              renderExtra={(q) => (isMyTurn && (activeView === 'check' || q.reviewRequired || reviews[q.id]) ? controls(q) : null)}
            />
          )}

          {isMyTurn && unmarked.length > 0 && (
            <div className="review-bottom">
              <span className="help-inline">
                {checkedCount} of {toCheck.length} checked
              </span>
              <button type="button" className="btn btn-secondary btn-small" onClick={approveAllRemaining}>
                Approve the {unmarked.length} remaining
              </button>
            </div>
          )}
        </section>
      )}

      {/* Everything this reviewer has said so far, in one place, before they decide. */}
      {isMyTurn && (approvedCount > 0 || flagged.length > 0 || noted.length > 0) && (
        <section className="card card-tight feedback-summary">
          <h2 className="card-title">Your feedback so far</h2>
          <p className="review-tally">
            <span className="badge badge-success">{approvedCount} approved</span>
            <span className="badge badge-danger">{flagged.length} need changes</span>
            <span className="badge badge-warning">{noted.length} notes</span>
            {unmarked.length > 0 && <span className="badge badge-neutral">{unmarked.length} not checked</span>}
          </p>
          {flagged.length + noted.length > 0 && (
            <ul className="fix-list">
              {[...flagged, ...noted].map((q) => (
                <li key={q.id} className={reviews[q.id]?.mark === 'flag' ? '' : 'is-note'}>
                  <span className="fix-label">{q.label}</span>
                  <span className="fix-note">
                    {reviews[q.id]?.comment.trim() || (reviews[q.id]?.mark === 'flag' ? 'No reason given yet.' : '')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {submission.auditLogs && submission.auditLogs.length > 0 && (
        <section className="card">
          <h2 className="card-title">History</h2>
          <ol className="timeline">
            {[...submission.auditLogs]
              .sort((a, b) => a.actionTimestamp.localeCompare(b.actionTimestamp))
              .map((log) => (
                <li key={log.id} className="timeline-item">
                  <div className="timeline-head">
                    <StatusBadge
                      status={log.action === 'Approved' ? 'Completed' : log.action === 'Rejected' ? 'Rejected' : 'Draft'}
                      label={log.action === 'Rejected' ? 'Sent back' : log.action}
                    />
                    <span className="timeline-who">{log.reviewer?.fullName ?? 'Reviewer'}</span>
                    <span className="timeline-when">{new Date(log.actionTimestamp).toLocaleString()}</span>
                  </div>
                  {log.comments && <pre className="timeline-comments">{log.comments}</pre>}
                </li>
              ))}
          </ol>
        </section>
      )}

      {isReviewer && !isMyTurn && (
        <p className="help-text">
          {status === 'Completed' && 'This submission is fully approved.'}
          {status === 'Rejected' && 'This submission is back with the student for changes.'}
          {status === 'Pending' && (isWithEmployer ? 'This submission is waiting on the employer.' : `Waiting on: ${submission.currentStep?.actionName ?? 'another reviewer'}.`)}
        </p>
      )}

      <div className="button-row">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to dashboard
        </button>
      </div>

      {/* Decision bar stays at the bottom of the screen while you scroll through answers. */}
      {isMyTurn && (
        <div className="decision-bar" role="region" aria-label="Your decision">
          <div className="decision-bar-inner">
            <div className="decision-bar-summary">
              <strong>{submission.currentStep?.actionName}</strong>
              <span className="help-inline">
                {hasCheckList ? `${checkedCount} of ${toCheck.length} checked` : 'Nothing to check'}
                {flagged.length > 0 ? `, ${flagged.length} need changes` : ''}
              </span>
            </div>
            <label className="visually-hidden" htmlFor="remarks">Remarks for the student (optional)</label>
            <input
              id="remarks"
              className="input decision-bar-remarks"
              placeholder="Remarks for the student (optional)"
              maxLength={2000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
            <div className="decision-bar-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={reject}
                disabled={busy !== null || Boolean(sendBackBlocker)}
                title={sendBackBlocker || undefined}
              >
                {busy === 'reject' ? 'Sending…' : 'Send back'}
              </button>
              <button type="button" className="btn btn-primary" onClick={approve} disabled={busy !== null}>
                {busy === 'approve' ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
          {(error || notice) ? (
            <p className={`decision-bar-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>
              {error || notice}
            </p>
          ) : sendBackBlocker && (flagged.length > 0 || noted.length > 0 || unmarked.length < toCheck.length) ? (
            <p className="decision-bar-message is-hint">To send it back: {sendBackBlocker.charAt(0).toLowerCase() + sendBackBlocker.slice(1)}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReviewControls({
  review,
  onMark,
  onComment,
}: {
  review?: QuestionReview;
  onMark: (m: Mark) => void;
  onComment: (c: string) => void;
}) {
  const mark = review?.mark;
  const showComment = mark === 'flag' || mark === 'note' || Boolean(review?.comment);
  return (
    <div className="review-controls">
      <div className="review-buttons" role="group" aria-label="Review this answer">
        <button type="button" className={`review-btn review-btn-ok ${mark === 'ok' ? 'is-on' : ''}`} aria-pressed={mark === 'ok'} onClick={() => onMark('ok')}>
          Approve
        </button>
        <button type="button" className={`review-btn review-btn-flag ${mark === 'flag' ? 'is-on' : ''}`} aria-pressed={mark === 'flag'} onClick={() => onMark('flag')}>
          Needs changes
        </button>
        <button type="button" className={`review-btn review-btn-note ${mark === 'note' ? 'is-on' : ''}`} aria-pressed={mark === 'note'} onClick={() => onMark('note')}>
          Note
        </button>
      </div>
      {showComment && (
        <textarea
          className="input input-textarea review-comment"
          rows={2}
          maxLength={1000}
          placeholder={mark === 'flag' ? 'What does the student need to fix?' : 'Note for the student'}
          value={review?.comment ?? ''}
          onChange={(e) => onComment(e.target.value)}
        />
      )}
    </div>
  );
}
