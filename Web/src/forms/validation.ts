import type { Answers, FieldErrors, FormQuestion, FormSchema, Respondent } from './types';
import { isRequired, isVisible, questionsFor } from './types';

export const REQUIRED_MESSAGE = 'This question needs an answer.';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARS = /^[\d\s().+-]+$/;
const W_NUMBER = /^[Ww]\d{7,8}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function collapseSpaces(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/^\$/, '').replace(/,/g, '');
    if (cleaned === '') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const d = new Date(value + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : d;
}

export function validateQuestion(q: FormQuestion, value: unknown, scope: Answers): string | null {
  if (isEmpty(value)) {
    if (!isRequired(q)) return null;
    if (q.type === 'confirm') return 'Check the box to confirm.';
    if (q.type === 'signature') return 'Type your full name to sign.';
    return REQUIRED_MESSAGE;
  }

  switch (q.type) {
    case 'text':
    case 'longText':
    case 'address': {
      if (typeof value !== 'string') return 'Enter text.';
      const text = value.trim();
      const max = q.maxLength ?? (q.type === 'text' ? 200 : q.type === 'address' ? 300 : 4000);
      if (q.minLength && text.length < q.minLength) return `Write at least ${q.minLength} characters.`;
      if (text.length > max) return `Keep this under ${max} characters.`;
      if (q.pattern && !new RegExp(q.pattern).test(text)) return q.patternMessage ?? 'Check the format of this answer.';
      return null;
    }
    case 'email': {
      if (typeof value !== 'string') return 'Enter an email address.';
      const email = value.trim();
      if (email.length > 254 || !EMAIL.test(email)) return 'Enter an email address like name@example.com.';
      if (q.domains?.length && !q.domains.some((d) => email.toLowerCase().endsWith('@' + d.toLowerCase()))) {
        return `Use your Southeastern address, ending in @${q.domains[0]}.`;
      }
      return null;
    }
    case 'phone': {
      if (typeof value !== 'string') return 'Enter a phone number.';
      const phone = value.trim();
      const digits = phone.replace(/\D/g, '');
      if (!PHONE_CHARS.test(phone) || !(digits.length === 10 || (digits.length === 11 && digits[0] === '1'))) {
        return 'Enter a 10-digit phone number, like (985) 555-0123.';
      }
      return null;
    }
    case 'wNumber': {
      if (typeof value !== 'string' || !W_NUMBER.test(value.trim())) {
        return 'A W# is a W followed by 7 or 8 digits, like W0123456.';
      }
      return null;
    }
    case 'number':
    case 'currency': {
      const n = toNumber(value);
      if (n === null) return 'Enter a number.';
      if (q.min !== undefined && n < q.min) return `Enter ${fmt(q.min)} or more.`;
      if (q.max !== undefined && n > q.max) return `Enter ${fmt(q.max)} or less.`;
      const step = q.step ?? (q.type === 'currency' ? 0.01 : undefined);
      if (step && step > 0) {
        const steps = (n - (q.min ?? 0)) / step;
        if (Math.abs(steps - Math.round(steps)) > 1e-6) {
          if (step === 1) return 'Enter a whole number.';
          return q.type === 'currency' ? 'Use dollars and cents, like 15.50.' : `Use steps of ${fmt(step)}.`;
        }
      }
      return null;
    }
    case 'date': {
      const d = toDate(value);
      if (!d) return 'Enter a date.';
      const year = d.getUTCFullYear();
      if (year < 2000 || year > 2100) return 'Enter a date between 2000 and 2100.';
      if (q.after) {
        const other = toDate(scope[q.after]);
        if (other && d <= other) return 'This date has to be after the start date.';
      }
      return null;
    }
    case 'choice':
      return typeof value === 'string' && q.options?.includes(value) ? null : 'Pick one of the options.';
    case 'multiChoice': {
      if (!Array.isArray(value)) return 'Pick at least one option.';
      if (value.some((v) => typeof v !== 'string' || !q.options?.includes(v))) return 'Pick from the options shown.';
      const count = new Set(value).size;
      if (q.minSelected && count < q.minSelected) return `Pick at least ${q.minSelected}.`;
      if (q.maxSelected && count > q.maxSelected) return `Pick no more than ${q.maxSelected}.`;
      return null;
    }
    case 'confirm':
      return value === true ? null : 'Check the box to confirm.';
    case 'signature': {
      if (typeof value !== 'string') return 'Type your full name to sign.';
      const signed = collapseSpaces(value);
      if (signed.length < 2 || signed.length > 100 || !/\p{L}/u.test(signed)) return 'Type your full name to sign.';
      const name = q.matchField ? scope[q.matchField] : undefined;
      if (typeof name === 'string' && name.trim() && collapseSpaces(name).toLowerCase() !== signed.toLowerCase()) {
        return `Type your name exactly as you entered it earlier: ${collapseSpaces(name)}.`;
      }
      return null;
    }
    case 'list': {
      if (!Array.isArray(value)) return REQUIRED_MESSAGE;
      const label = (q.itemLabel ?? 'item').toLowerCase();
      if (q.minItems && value.length < q.minItems) {
        return `Add at least ${q.minItems} ${label}${q.minItems === 1 ? '' : 's'}.`;
      }
      if (q.maxItems && value.length > q.maxItems) return `Add no more than ${q.maxItems} ${label}s.`;
      return null;
    }
    default:
      return 'This question has an unknown type.';
  }
}

export function validateQuestions(questions: FormQuestion[], answers: Answers): FieldErrors {
  const errors: FieldErrors = {};
  for (const q of questions) {
    if (!isVisible(q, answers)) continue;
    const value = answers[q.id];
    const message = validateQuestion(q, value, answers);
    if (message) {
      errors[q.id] = message;
      continue;
    }
    if (q.type === 'list' && Array.isArray(value)) {
      value.forEach((item, index) => {
        const row = (item ?? {}) as Answers;
        for (const field of q.fields ?? []) {
          const m = validateQuestion(field, row[field.id], row);
          if (m) errors[`${q.id}.${index}.${field.id}`] = m;
        }
      });
    }
  }
  return errors;
}

export function validateForm(schema: FormSchema, respondent: Respondent, answers: Answers): FieldErrors {
  return validateQuestions(questionsFor(schema, respondent), answers);
}

export function answersFor(schema: FormSchema, respondent: Respondent, answers: Answers): Answers {
  const out: Answers = {};
  for (const q of questionsFor(schema, respondent)) {
    if (!isVisible(q, answers)) continue;
    if (answers[q.id] !== undefined) out[q.id] = answers[q.id];
  }
  return out;
}
