import type { FormQuestion } from './types';

export function formatAnswer(q: FormQuestion, value: unknown): string {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
    return '';
  }
  switch (q.type) {
    case 'confirm':
      return value === true ? 'Confirmed' : '';
    case 'signature':
      return typeof value === 'string' ? `Signed electronically as ${value}` : '';
    case 'multiChoice':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'date': {
      if (typeof value !== 'string') return String(value);
      const d = new Date(value + 'T00:00:00Z');
      return Number.isNaN(d.getTime())
        ? value
        : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    }
    case 'currency': {
      const n = Number(String(value).replace(/,/g, ''));
      return Number.isFinite(n) ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : String(value);
    }
    default:
      return String(value);
  }
}
