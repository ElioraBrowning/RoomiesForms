import type { ReactNode } from 'react';
import type { Answers, FormPage, FormQuestion } from './types';
import { isVisible } from './types';
import { QuestionField } from './QuestionField';

export function FormLayoutReview({
  pages,
  answers,
  needsCheck,
  stateOf,
  renderControls,
}: {
  pages: FormPage[];
  answers: Answers;
  needsCheck: (q: FormQuestion) => boolean;
  stateOf: (q: FormQuestion) => 'ok' | 'flag' | 'note' | undefined;
  renderControls: (q: FormQuestion) => ReactNode;
}) {
  return (
    <div className="layout-review">
      {pages.map((page) => (
        <section className="layout-review-page" key={page.id}>
          <h3 className="layout-review-title">{page.title}</h3>
          {page.questions
            .filter((q) => isVisible(q, answers))
            .map((q) => {
              const field = (
                <QuestionField question={q} value={answers[q.id]} scope={answers} disabled onChange={() => undefined} />
              );
              if (!needsCheck(q)) return <div key={q.id} className="layout-review-plain">{field}</div>;
              const state = stateOf(q);
              return (
                <div key={q.id} className={`verify-box ${state ? `is-${state}` : ''}`}>
                  <div className="verify-box-controls">{renderControls(q)}</div>
                  {field}
                </div>
              );
            })}
        </section>
      ))}
    </div>
  );
}
