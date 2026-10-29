type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const SUBMISSION: Record<string, { label: string; tone: Tone }> = {
  'Not started': { label: 'Not started', tone: 'neutral' },
  Draft: { label: 'Draft', tone: 'neutral' },
  Pending: { label: 'In review', tone: 'warning' },
  Rejected: { label: 'Changes requested', tone: 'danger' },
  Completed: { label: 'Approved', tone: 'success' },
  Approved: { label: 'Approved', tone: 'success' },
  Submitted: { label: 'Submitted', tone: 'success' },
};

const STEP: Record<string, { label: string; tone: Tone }> = {
  Approved: { label: 'Approved', tone: 'success' },
  'Pending Review': { label: 'In review', tone: 'warning' },
  'Changes Requested': { label: 'Changes requested', tone: 'danger' },
  Waiting: { label: 'Waiting', tone: 'neutral' },
  'Not Submitted': { label: 'Not submitted', tone: 'neutral' },
};

export function StatusBadge({ status, kind = 'submission', label }: { status: string; kind?: 'submission' | 'step'; label?: string }) {
  const map = kind === 'step' ? STEP : SUBMISSION;
  const entry = map[status] ?? { label: status, tone: 'neutral' as Tone };
  return <span className={`badge badge-${entry.tone}`}>{label ?? entry.label}</span>;
}

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
