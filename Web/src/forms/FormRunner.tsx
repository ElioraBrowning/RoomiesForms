import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Answers, FieldErrors, FormSchema, Respondent } from './types';
import { pagesFor, withStarterRows } from './types';
import { validateForm, validateQuestions } from './validation';
import { computeProgress } from './progress';
import { QuestionField } from './QuestionField';
import { AnswerSummary } from './AnswerSummary';

type Step = { kind: 'intro' } | { kind: 'page'; index: number } | { kind: 'review' };
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface FormRunnerProps {
  schema: FormSchema;
  respondent: Respondent;
  initialAnswers: Answers;
  serverErrors?: FieldErrors;
  onSaveDraft?: (answers: Answers, percent: number) => Promise<void>;
  onExit?: () => void;
  exitLabel?: string;
  onSubmit: (answers: Answers) => Promise<void>;
  submitLabel?: string;
  startOnReview?: boolean;
  reviewPreface?: ReactNode;
  reviewActions?: ReactNode;
  feedback?: Record<string, string>;
}

export function FormRunner({
  schema,
  respondent,
  initialAnswers,
  serverErrors,
  onSaveDraft,
  onExit,
  exitLabel = 'Save & return to dashboard',
  onSubmit,
  submitLabel,
  startOnReview,
  reviewPreface,
  reviewActions,
  feedback = {},
}: FormRunnerProps) {
  const pages = useMemo(() => pagesFor(schema, respondent), [schema, respondent]);
  const showIntro = Boolean(schema.intro) && respondent === 'student';

  const steps: Step[] = useMemo(
    () => [
      ...(showIntro ? [{ kind: 'intro' } as Step] : []),
      ...pages.map((_, index) => ({ kind: 'page', index }) as Step),
      { kind: 'review' } as Step,
    ],
    [pages, showIntro],
  );

  const [answers, setAnswers] = useState<Answers>(() => withStarterRows(schema, respondent, initialAnswers));
  const [stepIndex, setStepIndex] = useState(startOnReview ? steps.length - 1 : 0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [returnToReview, setReturnToReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const headingRef = useRef<HTMLHeadingElement>(null);
  const dirtyRef = useRef(false);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const step = steps[stepIndex];
  const progress = computeProgress(schema, respondent, answers);

  useEffect(() => {
    if (!serverErrors || Object.keys(serverErrors).length === 0) return;
    setErrors(serverErrors);
    setStepIndex(steps.length - 1);
  }, [serverErrors, steps.length]);

  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  const saveNow = useCallback(async () => {
    if (!onSaveDraft || !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveState('saving');
    try {
      const current = answersRef.current;
      await onSaveDraft(current, computeProgress(schema, respondent, current).percent);
      setSaveState('saved');
    } catch {
      dirtyRef.current = true;
      setSaveState('error');
    }
  }, [onSaveDraft, schema, respondent]);

  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = window.setTimeout(saveNow, 1200);
    return () => window.clearTimeout(t);
  }, [answers, saveNow]);

  const setAnswer = (id: string, value: unknown) => {
    dirtyRef.current = true;
    setAnswers((prev) => ({ ...prev, [id]: value }));
    // Clear an error as soon as the answer becomes valid, but don't nag while typing.
    setErrors((prev) => {
      if (!Object.keys(prev).some((k) => k === id || k.startsWith(id + '.'))) return prev;
      const next = { ...prev };
      for (const k of Object.keys(next)) if (k === id || k.startsWith(id + '.')) delete next[k];
      return next;
    });
  };

  const validatePage = (pageIndex: number) => {
    const page = pages[pageIndex];
    const pageErrors = validateQuestions(page.questions, answers);
    setErrors((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (page.questions.some((q) => k === q.id || k.startsWith(q.id + '.'))) delete next[k];
      }
      return { ...next, ...pageErrors };
    });
    return pageErrors;
  };

  const goTo = (index: number) => {
    void saveNow();
    setStepIndex(Math.max(0, Math.min(steps.length - 1, index)));
  };

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (step.kind === 'page') {
      const pageErrors = validatePage(step.index);
      if (Object.keys(pageErrors).length > 0) {
        focusFirstError();
        return;
      }
    }
    if (returnToReview) {
      setReturnToReview(false);
      goTo(steps.length - 1);
      return;
    }
    goTo(stepIndex + 1);
  };

  const handleBack = () => {
    setReturnToReview(false);
    goTo(stepIndex - 1);
  };

  const editPage = (pageIndex: number) => {
    setReturnToReview(true);
    goTo(steps.findIndex((s) => s.kind === 'page' && s.index === pageIndex));
  };

  const handleSubmit = async () => {
    const allErrors = validateForm(schema, respondent, answers);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setSubmitError('Some answers need attention. Use Edit to fix them.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await onSubmit(answers);
      dirtyRef.current = false;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async () => {
    await saveNow();
    onExit?.();
  };

  const pageNumber = step.kind === 'page' ? step.index + 1 : null;

  return (
    <div className="runner">
      <div className="runner-top">
        <div className="runner-progress" aria-live="polite">
          <div className="runner-progress-text">
            <span>
              {step.kind === 'intro' && 'Before you start'}
              {step.kind === 'page' && `Page ${pageNumber} of ${pages.length}`}
              {step.kind === 'review' && 'Review your answers'}
            </span>
            <span>
              {progress.answered} of {progress.total} required answered
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Required questions answered"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
        {onExit && (
          <div className="runner-exit">
            <SaveIndicator state={saveState} />
            <button type="button" className="btn btn-secondary btn-small" onClick={handleExit}>
              {exitLabel}
            </button>
          </div>
        )}
      </div>

      <div className="card runner-card">
        {step.kind === 'intro' && schema.intro && (
          <form onSubmit={handleNext}>
            <h2 className="runner-title" ref={headingRef} tabIndex={-1}>
              {schema.intro.title}
            </h2>
            <div className="runner-intro">
              {schema.intro.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <RunnerNav onBack={null} nextLabel="I understand, start" />
          </form>
        )}

        {step.kind === 'page' && (
          <form onSubmit={handleNext} noValidate>
            <h2 className="runner-title" ref={headingRef} tabIndex={-1}>
              {pages[step.index].title}
            </h2>
            {pages[step.index].description && (
              <div className="runner-description">
                {pages[step.index].description!.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
            <div className="runner-questions">
              {pages[step.index].questions
                .filter((q) => !q.showWhen || answers[q.showWhen.field] === q.showWhen.equals)
                .map((q) => (
                  <div key={q.id} className={feedback[q.id] ? 'question-sent-back' : undefined}>
                    {feedback[q.id] && (
                      <p className="question-feedback">
                        <strong>Reviewer:</strong> {feedback[q.id]}
                      </p>
                    )}
                    <QuestionField
                      question={q}
                      value={answers[q.id]}
                      scope={answers}
                      error={errors[q.id]}
                      errors={errors}
                      onChange={(v) => setAnswer(q.id, v)}
                    />
                  </div>
                ))}
            </div>
            <RunnerNav
              onBack={stepIndex > 0 ? handleBack : null}
              nextLabel={returnToReview ? 'Back to review' : step.index === pages.length - 1 ? 'Review answers' : 'Next'}
            />
          </form>
        )}

        {step.kind === 'review' && (
          <div>
            <h2 className="runner-title" ref={headingRef} tabIndex={-1}>
              Review your answers
            </h2>
            <p className="runner-description">Check everything below. Nothing is sent until you press {submitLabel ?? 'Submit'}.</p>
            {reviewPreface}
            <AnswerSummary
              pages={pages}
              answers={answers}
              errors={errors}
              onEdit={editPage}
              answerClassName={(q) => (feedback[q.id] ? 'is-flag' : '')}
              renderExtra={(q) => feedback[q.id] && <p className="answer-feedback"><strong>Reviewer:</strong> {feedback[q.id]}</p>}
            />
            {submitError && (
              <p className="alert alert-danger" role="alert">
                {submitError}
              </p>
            )}
            <div className="runner-nav">
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                Back
              </button>
              <div className="runner-nav-right">
                {reviewActions}
                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Sending…' : submitLabel ?? 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RunnerNav({ onBack, nextLabel }: { onBack: (() => void) | null; nextLabel: string }) {
  return (
    <div className="runner-nav">
      {onBack ? (
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button type="submit" className="btn btn-primary">
        {nextLabel}
      </button>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <span className={`save-indicator save-${state}`} role="status">
      {state === 'saving' && 'Saving…'}
      {state === 'saved' && 'Draft saved'}
      {state === 'error' && "Couldn't save your draft"}
    </span>
  );
}

function focusFirstError() {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.runner [aria-invalid="true"]');
    el?.focus();
  }, 0);
}