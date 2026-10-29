export type Respondent = 'student' | 'employer';

export type QuestionType =
  | 'text'
  | 'longText'
  | 'address'
  | 'email'
  | 'phone'
  | 'wNumber'
  | 'number'
  | 'currency'
  | 'date'
  | 'choice'
  | 'multiChoice'
  | 'confirm'
  | 'signature'
  | 'list';

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  reviewRequired?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  minSelected?: number;
  maxSelected?: number;
  statement?: string;
  matchField?: string;
  after?: string;
  domains?: string[];
  pattern?: string;
  patternMessage?: string;
  showWhen?: { field: string; equals: string };
  fields?: FormQuestion[];
  itemLabel?: string;
  addLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  respondent?: Respondent;
  questions: FormQuestion[];
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  department?: string;
  category?: string;
  needs?: string[];
  submitLabel?: string;
  anonymous?: boolean;
  intro?: { title: string; body: string[] };
  employer?: {
    emailField: string;
    nameField?: string;
    mode: 'signoff' | 'complete';
    confidentialFromStudent?: boolean;
    instructions?: string;
  };
  pages: FormPage[];
}

export type Answers = Record<string, unknown>;
export type FieldErrors = Record<string, string>;

export function pagesFor(schema: FormSchema, respondent: Respondent): FormPage[] {
  return schema.pages.filter((p) => (p.respondent ?? 'student') === respondent);
}

export function questionsFor(schema: FormSchema, respondent: Respondent): FormQuestion[] {
  return pagesFor(schema, respondent).flatMap((p) => p.questions);
}

export function isRequired(q: FormQuestion): boolean {
  return q.required !== false;
}

export function isVisible(q: FormQuestion, answers: Answers): boolean {
  if (!q.showWhen) return true;
  return answers[q.showWhen.field] === q.showWhen.equals;
}

export function blankListRow(q: FormQuestion, existingRows: number): Answers {
  const row: Answers = {};
  for (const f of q.fields ?? []) row[f.id] = f.id === 'week' ? String(existingRows + 1) : '';
  return row;
}

export function withStarterRows(schema: FormSchema, respondent: Respondent, answers: Answers): Answers {
  const out = { ...answers };
  for (const q of questionsFor(schema, respondent)) {
    if (q.type === 'list' && !Array.isArray(out[q.id]) && (q.minItems ?? 0) > 0) {
      out[q.id] = [blankListRow(q, 0)];
    }
  }
  return out;
}