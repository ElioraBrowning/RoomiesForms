import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { readApiError } from '../services/api';
import type { AuditLogEntry, FormDetail, SubmissionDetail, SubmissionSummary } from '../types';
import type { Answers, FieldErrors } from '../forms/types';
import { questionsFor } from '../forms/types';
import { FormRunner } from '../forms/FormRunner';
import { latestSentBack, sentBackLine } from '../forms/feedback';
import { useAuth } from '../context/AuthContext';
import { SkeletonForm } from '../components/Skeleton';
import { CopyLink } from '../components/CopyLink';
import { employerLink } from '../utils/links';
import { submitToGoogleWorkspace } from '../services/googleSheetsService';

type Done =
  | { kind: 'submitted' }
  | { kind: 'anonymous' }
  | { kind: 'employer'; email: string; token: string; mode: 'signoff' | 'complete' };

export default function FormView() {
  const { formId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormDetail | null>(null);
  const [draft, setDraft] = useState<{ responses: Answers; status: string; auditLogs?: AuditLogEntry[] } | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState<SubmissionSummary | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [serverErrors, setServerErrors] = useState<FieldErrors>();
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<FormDetail>(`/forms/${formId}`);
        if (cancelled) return;
        setForm(res.data);

        const [draftRes, subsRes] = await Promise.allSettled([
          api.get(`/submissions/drafts/${res.data.id}`),
          api.get<SubmissionSummary[]>('/submissions'),
        ]);
        if (cancelled) return;
        if (draftRes.status === 'fulfilled' && draftRes.value.data?.responses) {
          setDraft(draftRes.value.data);
        }
        if (subsRes.status === 'fulfilled') {
          const live = subsRes.value.data.find(
            (s) => s.formId === res.data.id && (s.status === 'Pending' || s.status === 'Completed'),
          );
          setAlreadySubmitted(live ?? null);
        }
      } catch (err) {
        const { message, status } = readApiError(err, "Couldn't load this form.");
        if (!cancelled) setLoadError(status === 403 ? "This form hasn't been assigned to you yet." : message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  const schema = form?.schema ?? null;
  const isRevision = draft?.status === 'Rejected';

  const initialAnswers = useMemo<Answers>(() => {
    if (!schema) return {};
    if (draft) {
      const { __progress: _ignored, ...rest } = draft.responses as Answers & { __progress?: unknown };
      return rest;
    }
    if (schema.anonymous) return {};
    // Fill in what we already know about the student, only for questions this form asks.
    const known: Answers = {
      name: user?.fullName,
      studentName: user?.fullName,
      email: user?.email,
      wNumber: user?.wNumber || undefined,
    };
    const ids = new Set(questionsFor(schema, 'student').map((q) => q.id));
    return Object.fromEntries(Object.entries(known).filter(([k, v]) => ids.has(k) && v));
  }, [schema, draft, user]);

  const sentBack = useMemo(
    () => (isRevision && schema ? latestSentBack(draft?.auditLogs, questionsFor(schema, 'student')) : null),
    [isRevision, schema, draft],
  );

  if (loading) return <div className="form-page"><SkeletonForm /></div>;

  if (loadError || !form) {
    return (
      <div className="card page-message">
        <h1>Can't open this form</h1>
        <p>{loadError || 'Form not found.'}</p>
        <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="card page-message">
        <h1>{form.title}</h1>
        <p>This form doesn't have a definition yet, so it can't be filled in online.</p>
        <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }

  if (done) return <DoneScreen done={done} title={form.title} />;

  if (schema.anonymous && form.assignment?.completedOn) {
    return (
      <div className="card page-message">
        <h1>{form.title}</h1>
        <p>You've already submitted this survey. Thank you for the feedback.</p>
        <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="card page-message">
        <h1>{form.title}</h1>
        <p>You've already submitted this form. You can follow its review from the submission page.</p>
        <div className="button-row">
          <Link to={`/submissions/${alreadySubmitted.id}`} className="btn btn-primary">View submission</Link>
          <Link to="/dashboard" className="btn btn-secondary">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const payloadBase = { formId: form.id, formSlug: form.googleFormId };

  const saveDraft = async (answers: Answers, percent: number) => {
    await api.post('/submissions/drafts', { ...payloadBase, responses: { ...answers, __progress: percent } });
  };

  const submit = async (answers: Answers) => {
    try {
      const res = await api.post('/submissions', { ...payloadBase, responses: answers });

      // Append record to Google Sheet via Google Apps Script
      await submitToGoogleWorkspace({
        studentName: user?.fullName || '',
        studentEmail: user?.email || '',
        submissionId: res.data?.id || form.id,
        formId: form.googleFormId,
        summary: isRevision ? 'Resubmission after changes requested' : 'Initial submission',
        responses: answers,
      }).catch((err) => console.error('Google Sheets write notice:', err));

      if (res.data?.anonymous) {
        setDone({ kind: 'anonymous' });
        return;
      }
      const sub = res.data as SubmissionDetail;
      if (sub.employerReview?.accessToken && schema.employer) {
        setDone({ kind: 'employer', email: sub.employerReview.employerEmail, token: sub.employerReview.accessToken, mode: schema.employer.mode });
        return;
      }
      setDone({ kind: 'submitted' });
    } catch (err) {
      const { message, errors } = readApiError(err, "Couldn't submit the form.");
      if (errors) setServerErrors(errors);
      throw new Error(message);
    }
  };

  return (
    <div className="form-page">
      <div className="page-head">
        <p className="page-eyebrow">{schema.anonymous ? 'Anonymous survey' : isRevision ? 'Revising your submission' : 'Form'}</p>
        <h1>{form.title}</h1>
        {schema.description && <p className="page-lede">{schema.description}</p>}
        {form.assignment?.dueDate && (
          <p className="page-meta">Due {new Date(form.assignment.dueDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
        )}
      </div>

      {isRevision && sentBack && (
        <div className="alert alert-danger">
          <h2 className="alert-title">{sentBackLine(sentBack)}</h2>
          <p>
            {Object.keys(sentBack.byQuestion).length > 0
              ? Object.keys(sentBack.byQuestion).length === 1
                ? 'The answer to fix is marked in red below. Use Edit to change it, then submit again.'
                : `The ${Object.keys(sentBack.byQuestion).length} answers to fix are marked in red below. Use Edit to change them, then submit again.`
              : 'Your answers are loaded below. Use Edit to change what the reviewer asked for, then submit again.'}
          </p>
          {sentBack.general && <pre className="alert-quote">{sentBack.general}</pre>}
        </div>
      )}

      <FormRunner
        schema={schema}
        respondent="student"
        initialAnswers={initialAnswers}
        serverErrors={serverErrors}
        onSaveDraft={saveDraft}
        onExit={() => navigate('/dashboard')}
        onSubmit={submit}
        submitLabel={schema.submitLabel}
        startOnReview={isRevision}
        feedback={sentBack?.byQuestion}
      />
    </div>
  );
}

function DoneScreen({ done, title }: { done: Done; title: string }) {
  return (
    <div className="card page-message done-screen">
      {done.kind === 'anonymous' && (
        <>
          <h1>Thank you</h1>
          <p>Your survey was submitted anonymously. Nothing in it is linked to your name.</p>
        </>
      )}
      {done.kind === 'submitted' && (
        <>
          <h1>Submitted</h1>
          <p>{title} is now with the faculty reviewer. You'll see its progress on your dashboard.</p>
        </>
      )}
      {done.kind === 'employer' && (
        <>
          <h1>Now send this to your supervisor</h1>
          <p>
            {done.mode === 'complete'
              ? 'Your supervisor completes the rest of this form.'
              : 'Your supervisor needs to review and sign this form.'}{' '}
            Send this link to <strong>{done.email}</strong>. It works for 14 days and goes to faculty review once they're done.
          </p>
          <CopyLink url={employerLink(done.token)} />
          <p className="help-text">You can find this link again on your dashboard, and get a new one there if it expires.</p>
        </>
      )}
      <Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>
    </div>
  );
}