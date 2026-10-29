import type { ReactNode } from 'react';
import type { Answers, FieldErrors, FormPage, FormQuestion } from './types';
import { isVisible } from './types';
import { formatAnswer } from './format';

interface AnswerSummaryProps {
  pages: FormPage[];
  answers: Answers;
  errors?: FieldErrors;
  onEdit?: (pageIndex: number) => void;
  renderExtra?: (q: FormQuestion) => ReactNode;
  answerClassName?: (q: FormQuestion) => string;
  headingLevel?: 'h2' | 'h3';
}

export function AnswerSummary({ pages, answers, errors, onEdit, renderExtra, answerClassName, headingLevel = 'h3' }: AnswerSummaryProps) {
  const Heading = headingLevel;
  return (
    <div className="answer-summary">
      {pages.map((page, pageIndex) => {
        const questions = page.questions.filter((q) => isVisible(q, answers));
        const pageHasError = errors && questions.some((q) => Object.keys(errors).some((k) => k === q.id || k.startsWith(q.id + '.')));
        return (
          <section className={`answer-group ${pageHasError ? 'has-error' : ''}`} key={page.id}>
            <div className="answer-group-head">
              <Heading className="answer-group-title">{page.title}</Heading>
              {onEdit && (
                <button type="button" className="btn-link" onClick={() => onEdit(pageIndex)}>
                  Edit<span className="visually-hidden"> {page.title}</span>
                </button>
              )}
            </div>
            <dl className="answer-list">
              {questions.map((q) => (
                <div className={`answer ${answerClassName?.(q) ?? ''}`} key={q.id}>
                  <dt>{q.label}</dt>
                  <dd>
                    <AnswerValue q={q} value={answers[q.id]} />
                    {errors?.[q.id] && <p className="question-error">{errors[q.id]}</p>}
                    {renderExtra?.(q)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function AnswerValue({ q, value }: { q: FormQuestion; value: unknown }) {
  if (q.type === 'list') {
    const rows = Array.isArray(value) ? (value as Answers[]) : [];
    if (rows.length === 0) return <span className="answer-empty">Not answered</span>;
    return (
      <ol className="answer-rows">
        {rows.map((row, i) => (
          <li key={i}>
            {(q.fields ?? []).map((f) => {
              const text = formatAnswer(f, row[f.id]);
              return (
                <div key={f.id} className="answer-row-field">
                  {(q.fields?.length ?? 0) > 1 && <span className="answer-row-label">{f.label}: </span>}
                  {text || <span className="answer-empty">Not answered</span>}
                </div>
              );
            })}
          </li>
        ))}
      </ol>
    );
  }

  const text = formatAnswer(q, value);
  if (!text) return <span className="answer-empty">Not answered</span>;
  return <span className="answer-text">{text}</span>;
}
