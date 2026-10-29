import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { readApiError } from '../services/api';
import type { Answers, FieldErrors, FormSchema } from '../forms/types';
import { pagesFor } from '../forms/types';
import { FormRunner } from '../forms/FormRunner';
import { AnswerSummary } from '../forms/AnswerSummary';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../hooks/useTheme';
import { SkeletonForm } from '../components/Skeleton';

interface EmployerView {
  formTitle: string;
  studentName: string;
  status: 'Open' | 'Expired' | 'Approved' | 'ChangesRequested' | 'Superseded' | string;
  expiresAt?: string | null;
  signedAt?: string | null;
  schema: FormSchema;
  responses?: Answers | null;
}

/**
 * What an employer sees when they open the link a student sent them. No account needed.
 * They read the student's answers, then either complete their part and sign, or send the
 * form back with a note.
 */
export default function EmployerReview() {
  const { token } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState<EmployerView | null>(null);
  const [error, setError] = useState('');
  const [serverErrors, setServerErrors] = useState<FieldErrors>();
  const [finished, setFinished] = useState<'approved' | 'returned' | null>(null);
  const [returning, setReturning] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [returnError, setReturnError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get<EmployerView>(`/employer/${token}`)
      .then((res) => setView(res.data))
      .catch((err) => setError(readApiError(err, 'This link is not valid.').message));
  }, [token]);

  const approve = async (answers: Answers) => {
    try {
      await api.post(`/employer/${token}`, { decision: 'approve', responses: answers });
      setFinished('approved');
    } catch (err) {
      const { message, errors } = readApiError(err);
      if (errors) setServerErrors(errors);
      throw new Error(message);
    }
  };

  const sendBack = async () => {
    if (returnNote.trim().length < 5) {
      setReturnError('Tell the student what needs to change.');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/employer/${token}`, { decision: 'requestChanges', comments: returnNote.trim() });
      setFinished('returned');
    } catch (err) {
      setReturnError(readApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="stripe" />
        <div className="public-bar">
          <span className="public-brand">
            Southeastern Louisiana University <span className="public-brand-sub">Computer Science internships</span>
          </span>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="public-main">
        {error && (
          <div className="card page-message">
            <h1>This link doesn't work</h1>
            <p>{error} Ask the student to send you a new one.</p>
          </div>
        )}

        {!error && !view && <SkeletonForm />}

        {view && finished && (
          <div className="card page-message done-screen">
            <h1>Thank you</h1>
            <p>
              {finished === 'approved'
                ? `Your response for ${view.studentName}'s ${view.formTitle} has been recorded and sent to the Computer Science department.`
                : `${view.formTitle} has been sent back to ${view.studentName} with your note. You'll get a new link once they've made the changes.`}
            </p>
            <p className="help-text">You can close this page.</p>
          </div>
        )}

        {view && !finished && view.status !== 'Open' && (
          <div className="card page-message">
            <h1>{view.formTitle}</h1>
            <p>
              {view.status === 'Approved' && `This form was already signed${view.signedAt ? ` on ${new Date(view.signedAt).toLocaleDateString()}` : ''}. Nothing else is needed.`}
              {view.status === 'ChangesRequested' && 'You sent this form back to the student. You will get a new link when they resubmit.'}
              {view.status === 'Superseded' && 'The student has sent a newer version of this form, so this link no longer works. Use the most recent link they sent you.'}
              {view.status === 'Expired' && 'This link has expired. Links work for 14 days. Ask the student to send you a new one.'}
            </p>
          </div>
        )}

        {view && !finished && view.status === 'Open' && view.responses && (
          <>
            <div className="page-head">
              <p className="page-eyebrow">Employer review</p>
              <h1>{view.formTitle}</h1>
              <p className="page-lede">
                For <strong>{view.studentName}</strong>.{' '}
                {view.schema.employer?.instructions}
              </p>
              {view.expiresAt && (
                <p className="page-meta">This link works until {new Date(view.expiresAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.</p>
              )}
            </div>

            <details className="card student-answers" open={view.schema.employer?.mode === 'signoff'}>
              <summary>What the student entered</summary>
              <AnswerSummary pages={pagesFor(view.schema, 'student')} answers={view.responses} />
            </details>
            {!returning && (
              <p className="student-answers-foot">
                Something wrong in the student's details?{' '}
                <button type="button" className="btn-link" onClick={() => setReturning(true)}>
                  Send it back to the student
                </button>
              </p>
            )}

            {returning && (
              <div className="card send-back">
                <h2>Send back to the student</h2>
                <p>Say what's wrong so they can fix it. They'll send you a new link afterward.</p>
                <div className="question">
                  <label className="question-label" htmlFor="return-note">What needs to change?</label>
                  <textarea
                    id="return-note"
                    className="input input-textarea"
                    rows={4}
                    maxLength={2000}
                    value={returnNote}
                    aria-invalid={returnError ? true : undefined}
                    onChange={(e) => {
                      setReturnNote(e.target.value);
                      setReturnError('');
                    }}
                  />
                  {returnError && <p className="question-error" role="alert">{returnError}</p>}
                </div>
                <div className="button-row">
                  <button type="button" className="btn btn-danger" onClick={sendBack} disabled={busy}>
                    {busy ? 'Sending…' : 'Send back'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setReturning(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <FormRunner
              schema={view.schema}
              respondent="employer"
              initialAnswers={{}}
              serverErrors={serverErrors}
              onSubmit={approve}
              submitLabel={view.schema.employer?.mode === 'complete' ? 'Submit evaluation' : 'Sign and approve'}
            />
          </>
        )}
      </main>
    </div>
  );
}