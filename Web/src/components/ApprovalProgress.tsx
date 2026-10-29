import { useEffect, useState } from 'react';
import type { ApprovalStepStatus } from '../types';

export function ApprovalProgress({ steps, compact = false }: { steps: ApprovalStepStatus[]; compact?: boolean }) {
  const [shown, setShown] = useState(0);
  const target = fillFraction(steps);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  if (!steps.length) return null;

  const current = steps.find((s) => s.status === 'Pending Review' || s.status === 'Changes Requested');
  const allDone = steps.every((s) => s.status === 'Approved');
  const sentBack = current?.status === 'Changes Requested';
  const summary = allDone
    ? 'All steps approved'
    : current
      ? `${sentBack ? 'Sent back at' : 'Now at'}: ${current.stepName}`
      : 'Not submitted yet';

  return (
    <div className={`progress-steps ${compact ? 'is-compact' : ''} ${sentBack ? 'is-sent-back' : ''} ${allDone ? 'is-done' : ''}`}>
      {compact && <p className="progress-steps-summary">{summary}</p>}
      <div
        className="progress-steps-track"
        role="progressbar"
        aria-label="Review progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={steps.filter((s) => s.status === 'Approved').length}
        aria-valuetext={summary}
      >
        <div className="progress-steps-fill" style={{ width: `${shown * 100}%` }} />
        {steps.map((s, i) => (
          <span
            key={s.stepOrder}
            className={`progress-steps-dot dot-${dotState(s.status)}`}
            style={{ left: `${(i / Math.max(steps.length - 1, 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      {!compact && (
        <ol className="progress-steps-labels" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s) => (
            <li key={s.stepOrder} className={`label-${dotState(s.status)}`}>
              <span className="progress-steps-name">{s.stepName}</span>
              <span className="progress-steps-who">{s.status === 'Approved' && s.approvedBy ? s.approvedBy : s.reviewerName}</span>
              <span className="progress-steps-state">{stateText(s)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function fillFraction(steps: ApprovalStepStatus[]) {
  if (steps.length < 2) return steps[0]?.status === 'Approved' ? 1 : 0;
  const approved = steps.filter((s) => s.status === 'Approved').length;
  if (approved === steps.length) return 1;
  return Math.min(approved, steps.length - 1) / (steps.length - 1);
}

function dotState(status: string) {
  switch (status) {
    case 'Approved':
      return 'done';
    case 'Pending Review':
      return 'active';
    case 'Changes Requested':
      return 'sent-back';
    default:
      return 'waiting';
  }
}

function stateText(s: ApprovalStepStatus) {
  switch (s.status) {
    case 'Approved':
      return s.actionDate ? `Approved ${new Date(s.actionDate).toLocaleDateString()}` : 'Approved';
    case 'Pending Review':
      return 'In review';
    case 'Changes Requested':
      return 'Sent back';
    case 'Not Submitted':
      return 'Not submitted';
    default:
      return 'Waiting';
  }
}