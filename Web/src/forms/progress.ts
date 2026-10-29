import type { Answers, FormSchema, Respondent } from './types';
import { isRequired, isVisible, questionsFor } from './types';
import { validateQuestion, validateQuestions } from './validation';

export function computeProgress(schema: FormSchema, respondent: Respondent, answers: Answers) {
  const required = questionsFor(schema, respondent).filter((q) => isRequired(q) && isVisible(q, answers));
  if (required.length === 0) return { answered: 0, total: 0, percent: 100 };

  let answered = 0;
  for (const q of required) {
    const value = answers[q.id];
    if (validateQuestion(q, value, answers) !== null) continue;
    if (q.type === 'list' && Object.keys(validateQuestions([q], answers)).length > 0) continue;
    answered++;
  }

  return {
    answered,
    total: required.length,
    percent: Math.round((answered / required.length) * 100),
  };
}
