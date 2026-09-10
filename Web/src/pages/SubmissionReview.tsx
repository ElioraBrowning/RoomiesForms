import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { SubmissionDetail } from '../types';
import { labelFor } from '../components/forms/useValidatedForm';
import '../index.css';

import CS401 from '../components/forms/CS401';
import CS402 from '../components/forms/CS402';
import CS403 from '../components/forms/CS403';
import CS404 from '../components/forms/CS404';
import CS405 from '../components/forms/CS405';
import CS410 from '../components/forms/CS410';
import CS420 from '../components/forms/CS420';
import ExitSurvey from '../components/forms/ExitSurvey';

type Flag = { note: string };

export default function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [comments, setComments] = useState('');
  const [flags, setFlags] = useState<Record<string, Flag>>({});
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/submissions/${id}`);
        setSubmission(res.data);
      } catch (err) {
        console.error(err);
        setError('Could not load this submission.');
      }
    };
    fetchSubmission();
  }, [id]);

  // Every answered field on the form, so the reviewer can flag any of them
  // without the eight form components needing to know about flagging.
  const answered = useMemo(() => {
    const r = (submission?.responses ?? {}) as Record<string, unknown>;
    return Object.entries(r)
      .filter(([k, v]) => k !== '__progress' && v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => ({
        field: k,
        value: Array.isArray(v) ? `${v.length} item(s)` : String(v),
      }));
  }, [submission]);

  const flaggedCount = Object.keys(flags).length;
  const isClosed = submission?.status === 'Completed' || submission?.status === 'Rejected';

  const toggleFlag = (field: string) => {
    setFlags((prev) => {
      const next = { ...prev };
      if (next[field]) delete next[field];
      else next[field] = { note: '' };
      return next;
    });
  };

  const setFlagNote = (field: string, note: string) => {
    setFlags((prev) => ({ ...prev, [field]: { note } }));
  };

  const describeFailure = (err: unknown, action: string) => {
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 405) {
      return `The ${action} endpoint does not exist on the backend yet.`;
    }
    if (status === 403) return 'Your account is not allowed to review this submission.';
    return `Could not ${action} this submission. Check that the backend is running.`;
  };

  const handleApprove = async () => {
    setError('');
    setBusy('approve');
    try {
      await api.post(`/submissions/${id}/approve`, { comments: comments.trim() || null });
      setNotice('Approved. Returning to the dashboard.');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error(err);
      setError(describeFailure(err, 'approve'));
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!comments.trim() && flaggedCount === 0) {
      setError('Add a comment or flag at least one question so the student knows what to fix.');
      return;
    }
    setError('');
    setBusy('reject');
    try {
      await api.post(`/submissions/${id}/reject`, {
        comments: comments.trim() || null,
        flags: Object.entries(flags).map(([field, f]) => ({ field, note: f.note })),
      });
      setNotice('Sent back to the student. Returning to the dashboard.');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error(err);
      setError(describeFailure(err, 'reject'));
    } finally {
      setBusy(null);
    }
  };

  if (error && !submission) return <div className="card"><p>{error}</p></div>;
  if (!submission) return <div className="card"><p className="empty-state">Loading submission...</p></div>;

  const formId = submission.form?.googleFormId;
  const formProps = { onSubmit: () => {}, defaultValues: submission.responses, isReadonly: true };
  const renderForm = () => {
    switch (formId) {
      case 'CS401': return <CS401 {...formProps} />;
      case 'CS402': return <CS402 {...formProps} />;
      case 'CS403': return <CS403 {...formProps} />;
      case 'CS404': return <CS404 {...formProps} />;
      case 'CS405': return <CS405 {...formProps} />;
      case 'CS410': return <CS410 {...formProps} />;
      case 'CS420': return <CS420 {...formProps} />;
      case 'ExitSurvey': return <ExitSurvey {...formProps} />;
      default: return <pre>{JSON.stringify(submission.responses, null, 2)}</pre>;
    }
  };

  return (
    <div>
      <div className="review-head">
        <div>
          <h1>Review submission #{submission.id}</h1>
          <p className="review-meta">
            {submission.form?.title} &middot; {submission.student?.fullName}{' '}
            ({submission.student?.wNumber})
          </p>
        </div>
        <span
          className={
            submission.status === 'Completed'
              ? 'status status-approved'
              : submission.status === 'Rejected'
                ? 'status status-rejected'
                : 'status status-pending'
          }
        >
          {submission.status}
        </span>
      </div>

      <div className="card">
        <h2>Responses</h2>
        <div className="review-form">{renderForm()}</div>
      </div>

      <div className="card">
        <h2>Your review</h2>

        <div className="form-group">
          <label htmlFor="review-comments">Comments for the student</label>
          <textarea
            id="review-comments"
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Explain what needs changing, or leave a note with your approval."
            disabled={isClosed}
          />
          <span className="help-text">
            Required when sending back for changes. Optional when approving.
          </span>
        </div>

        <h3 className="flag-title">
          Flag specific questions
          {flaggedCount > 0 && <span className="flag-count">{flaggedCount} flagged</span>}
        </h3>
        <p className="help-text flag-hint">
          Tick any answer that needs correcting. The student sees your note next to that question.
        </p>

        {answered.length === 0 ? (
          <p className="empty-state">This submission has no answers to flag.</p>
        ) : (
          <ul className="flag-list">
            {answered.map(({ field, value }) => {
              const on = Boolean(flags[field]);
              return (
                <li key={field} className={on ? 'flag-item flag-item-on' : 'flag-item'}>
                  <label className="flag-check">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleFlag(field)}
                      disabled={isClosed}
                    />
                    <span className="flag-field">{labelFor(field)}</span>
                  </label>
                  <p className="flag-value">{value}</p>
                  {on && (
                    <input
                      className="flag-note"
                      type="text"
                      value={flags[field].note}
                      onChange={(e) => setFlagNote(field, e.target.value)}
                      placeholder="What is wrong with this answer?"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        {notice && <p className="review-notice" role="status">{notice}</p>}

        <div className="review-actions">
          <button
            onClick={handleApprove}
            className="btn"
            disabled={isClosed || busy !== null}
          >
            {busy === 'approve' ? 'Approving...' : 'Approve step'}
          </button>
          <button
            onClick={handleReject}
            className="btn btn-danger"
            disabled={isClosed || busy !== null}
          >
            {busy === 'reject' ? 'Sending...' : 'Request changes'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back
          </button>
        </div>

        {isClosed && (
          <p className="help-text">
            This submission is {submission.status.toLowerCase()} and can no longer be actioned.
          </p>
        )}
      </div>
    </div>
  );
}