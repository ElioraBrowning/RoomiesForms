import { useEffect, useId, useRef, useState } from 'react';
import type { ApprovalStepStatus } from '../types';
import { ApprovalProgress } from './ApprovalProgress';

export function ApprovalPopover({ steps, label = 'Track progress' }: { steps: ApprovalStepStatus[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPinned(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPinned(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!steps.length) return null;

  return (
    <div
      className="approval-popover"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => !pinned && setOpen(false)}
    >
      <button
        type="button"
        className="btn-link"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setPinned(!pinned);
          setOpen(!pinned);
        }}
      >
        {label}
      </button>
      {open && (
        <div className="approval-popover-panel" id={id} role="dialog" aria-label="Approval progress">
          {/* Mount fresh each time so the bar animates from empty. */}
          <ApprovalProgress steps={steps} />
        </div>
      )}
    </div>
  );
}
