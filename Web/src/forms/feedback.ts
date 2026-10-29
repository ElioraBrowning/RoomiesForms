import type { AuditLogEntry } from '../types';
import type { FormQuestion } from './types';

export interface SentBack {
  byQuestion: Record<string, string>;
  general: string;
  by?: string;
  on?: string;
}

export function latestSentBack(logs: AuditLogEntry[] | undefined, questions: FormQuestion[]): SentBack | null {
  const log = [...(logs ?? [])]
    .sort((a, b) => a.actionTimestamp.localeCompare(b.actionTimestamp))
    .reverse()
    .find((l) => l.action === 'Rejected' && l.comments);
  if (!log?.comments) return null;

  const byLabel: Record<string, string> = {};
  const general: string[] = [];
  for (const line of log.comments.split('\n')) {
    const m = line.match(/^\[(Changes Needed|Note)\]\s*([^:]+):\s*(.+)$/i);
    if (m) byLabel[m[2].trim().toLowerCase()] = m[3].trim();
    else if (!/^question feedback:/i.test(line)) general.push(line);
  }

  const byQuestion: Record<string, string> = {};
  for (const q of questions) {
    const said = byLabel[q.label.toLowerCase()];
    if (said) byQuestion[q.id] = said;
  }

  return { byQuestion, general: general.join('\n').trim(), by: log.reviewer?.fullName, on: log.actionTimestamp };
}

export function sentBackLine(s: SentBack) {
  const date = s.on ? new Date(s.on).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }) : null;
  return `Changes requested${s.by ? ` by ${s.by}` : ''}${date ? ` on ${date}` : ''}.`;
}
