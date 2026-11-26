import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readApiError } from '../../services/api';
import type { SubmissionDetail } from '../../types';
import { type QuickNote, getQuickNotes } from '../../utils/quickNotes';
import ManageNotesModal from './ManageNotesModal';

interface InlineReviewPanelProps {
  submissionId: number;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onCollapse: () => void;
  onApproveNext: (id: number) => void;
  onSendRevision: (id: number, feedback: string) => void;
  onRevoke?: (id: number) => void;
}

type OriginType = 'student' | 'employer' | 'faculty';

export default function InlineReviewPanel({
  submissionId,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onCollapse,
  onApproveNext,
  onSendRevision,
  onRevoke,
}: InlineReviewPanelProps) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Revision mode state
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [activeChipIds, setActiveChipIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>(() => getQuickNotes());
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<SubmissionDetail>(`/submissions/${submissionId}`)
      .then((res) => {
        if (cancelled) return;
        setDetail(res.data);
        setIsRevisionMode(false);
        setFeedbackText('');
        setActiveChipIds([]);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(readApiError(err, 'Could not load details.').message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const formKey = (detail?.form?.googleFormId || '').toUpperCase();
  const isEmployerOrigin =
    formKey === 'CS420' || detail?.employerReview?.signedAt != null;
  const isFacultyOrigin = Boolean(
    detail?.approvals?.some((a) => a.roleName === 'Faculty' && a.status === 'Approved'),
  );

  const origin: OriginType = isEmployerOrigin
    ? 'employer'
    : isFacultyOrigin
    ? 'faculty'
    : 'student';

  const originLabel =
    origin === 'employer'
      ? 'Employer / Business'
      : origin === 'faculty'
      ? 'Faculty Reviewed'
      : 'Student Submission';

  const responses = (detail?.responses || {}) as Record<string, any>;
  const student = detail?.student || { fullName: 'Student', email: '', wNumber: '' };

  const rawGpa = responses.gpa ?? responses.majorGpa ?? null;
  const majorGpa = rawGpa !== null && rawGpa !== '' && !Number.isNaN(Number(rawGpa)) ? Number(rawGpa) : null;
  const classification = responses.classification || null;
  const degree = responses.degree || null;
  const companyName = responses.employerName || responses.companyName || responses.employer || null;
  const companyLocation = responses.companyLocation || (typeof responses.employerAddress === 'string' ? responses.employerAddress : null);
  const supervisorName = responses.supervisorName || null;
  const supervisorTitle = responses.supervisorTitle || null;
  const supervisorEmail = responses.supervisorEmail || null;
  const jobTitle = responses.jobTitle || responses.roleTitle || null;
  const employmentType = responses.employmentType || null;
  const weeklyHours = responses.hoursPerWeek || responses.weeklyHours || null;
  const semester = responses.semester || (responses.startDate ? `${responses.startDate}${responses.endDate ? ` – ${responses.endDate}` : ''}` : null);
  const jobDuties = responses.jobResponsibilities || responses.jobDuties || responses.duties || responses.objective || null;
  const resubmissionNote = responses.resubmissionNote || null;
  const employerVerified = Boolean(detail?.employerReview?.signedAt);

  const isResubmission =
    Boolean(resubmissionNote) ||
    detail?.auditLogs?.some((log) => log.action === 'Rejected' || log.action === 'Changes Requested');

  const isApproved =
    detail?.status === 'Approved' || detail?.status === 'Completed';

  const handleChipClick = (note: QuickNote) => {
    const isActive = activeChipIds.includes(note.id);
    if (isActive) {
      setActiveChipIds((prev) => prev.filter((id) => id !== note.id));
      setFeedbackText((prev) => {
        return prev
          .replace(note.text, '')
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .trim();
      });
    } else {
      setActiveChipIds((prev) => [...prev, note.id]);
      setFeedbackText((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed}\n\n${note.text}` : note.text;
      });
    }
  };

  return (
    <div className={`dean-inline-tray origin-${origin}`} onClick={(e) => e.stopPropagation()}>
      {/* Tray Top Bar: Origin Badge, Batch Counter & Non-Destructive Cycling */}
      <div className="dean-tray-topbar">
        <div className="dean-tray-meta-left">
          <span className={`dean-origin-badge origin-badge-${origin}`}>{originLabel}</span>
          <span className="dean-tray-counter">
            Form {currentIndex + 1} of {totalCount}
          </span>
          {isResubmission && <span className="dean-pill pill-revised">Revised</span>}
        </div>

        <div className="dean-tray-controls-right">
          <button
            type="button"
            className="btn btn-secondary btn-small dean-cycle-btn"
            onClick={onPrev}
            disabled={!hasPrev}
            title="Cycle to previous form without approving"
          >
            ← Previous Form
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-small dean-cycle-btn"
            onClick={onNext}
            disabled={!hasNext}
            title="Cycle to next form without approving"
          >
            Next Form →
          </button>
          <button
            type="button"
            className="dean-collapse-btn"
            onClick={onCollapse}
            title="Collapse this quick view"
          >
            Collapse ▴
          </button>
        </div>
      </div>

      {/* Tray Body Content */}
      <div className="dean-tray-body">
        {loading ? (
          <div className="dean-drawer-loading">
            <div className="dean-drawer-spinner" />
            <p>Loading summary details...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : isRevisionMode ? (
          /* =================================================================
             REVISION STATION (Textarea + Interactive Canned Chips)
             ================================================================= */
          <section className="dean-revision-panel">
            <div className="dean-revision-instructions">
              <span className="dean-section-kicker kicker-revised">Required Revision Details</span>
              <p className="dean-revision-hint">
                Click quick notes below to append pre-written feedback, or type your own instructions. This feedback will be sent directly to <strong>{student.fullName}</strong>.
              </p>
            </div>

            <textarea
              className="input dean-revision-textarea"
              rows={5}
              placeholder="Type specific instructions or click quick notes below..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />

            <div className="dean-chips-section">
              <div className="dean-chips-head">
                <span className="dean-chips-title">One-Click Quick Notes:</span>
                <button
                  type="button"
                  className="btn btn-link dean-manage-notes-btn"
                  onClick={() => setIsManageModalOpen(true)}
                >
                  Manage Notes
                </button>
              </div>

              <div className="dean-chips-wrap">
                {notes.map((note) => {
                  const isActive = activeChipIds.includes(note.id);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      className={`dean-chip ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleChipClick(note)}
                    >
                      {isActive && <span className="dean-chip-check">✓</span>}
                      <span>{note.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          /* =================================================================
             NORMAL INLINE TRIAGE VIEW
             ================================================================= */
          <>
            {isApproved && (
              <section className="dean-drawer-section dean-clearance-box mb-sm">
                <span className="dean-section-kicker kicker-cleared">Academic Clearance Granted</span>
                <div className="dean-clearance-content">
                  <p className="dean-clearance-title">Cleared for CMPS 4000 Enrollment</p>
                  <p className="dean-clearance-desc">
                    Official department authorization recorded by Dr. Bonnie Achée. The student has been notified to submit their Prerequisite Override Request in Workday.
                  </p>
                </div>
              </section>
            )}

            {isResubmission && (
              <section className="dean-drawer-section dean-drawer-diff mb-sm">
                <span className="dean-section-kicker kicker-revised">What Changed</span>
                <p className="dean-diff-text">
                  {resubmissionNote ||
                    'Student submitted updated information following feedback from prior review.'}
                </p>
              </section>
            )}

            <div className="dean-tray-columns">
              {/* Column 1: Academic Standing */}
              <div className="dean-tray-col">
                <span className="dean-section-kicker">Academic Standing</span>
                <div className="dean-detail-stack">
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Major GPA</span>
                    <span className="dean-field-val val-strong">
                      {majorGpa != null ? majorGpa.toFixed(2) : 'Not provided'}
                    </span>
                  </div>
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Classification</span>
                    <span className="dean-field-val">{classification || 'Not provided'}</span>
                  </div>
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Degree Track</span>
                    <span className="dean-field-val">{degree || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Employer & Supervisor */}
              <div className="dean-tray-col">
                <span className="dean-section-kicker">Employer &amp; Supervisor</span>
                <div className="dean-detail-stack">
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Company</span>
                    <span className="dean-stack-val">
                      <strong>{companyName || 'Not provided'}</strong>
                      {companyLocation && <span className="dean-loc"> ({companyLocation})</span>}
                    </span>
                  </div>
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Supervisor</span>
                    <span className="dean-stack-val">
                      {supervisorName || 'Not provided'}
                      {supervisorTitle && <span className="dean-title-sub"> · {supervisorTitle}</span>}
                    </span>
                  </div>
                  <div className="dean-stack-row">
                    <span className="dean-stack-label">Work Email</span>
                    <span className="dean-stack-val">
                      {supervisorEmail ? <code>{supervisorEmail}</code> : 'Not provided'}
                      {employerVerified && <span className="dean-verified-pill">Verified</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Role & Duties */}
              <div className="dean-tray-col span-full">
                <span className="dean-section-kicker">Role &amp; Responsibilities</span>
                <div className="dean-duties-box">
                  <div className="dean-duties-meta">
                    <strong>{jobTitle || 'Not provided'}</strong>
                    {employmentType && <span> · {employmentType}</span>}
                    {weeklyHours && <span> · {weeklyHours} hrs/wk</span>}
                    {semester && <span> ({semester})</span>}
                  </div>
                  <p className="dean-duties-quote">
                    {jobDuties ? <>&ldquo;{jobDuties}&rdquo;</> : 'No job responsibilities provided.'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tray Footer Actions */}
      <div className="dean-tray-footer">
        {isRevisionMode ? (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setIsRevisionMode(false)}
            >
              ← Back to Summary
            </button>
            <button
              type="button"
              className="btn btn-primary btn-small dean-btn-send-revision"
              disabled={!feedbackText.trim()}
              onClick={() => {
                onSendRevision(submissionId, feedbackText.trim());
                setIsRevisionMode(false);
              }}
            >
              Send Back for Revision →
            </button>
          </>
        ) : (
          <>
            <Link
              to={`/submissions/${submissionId}`}
              className="btn btn-secondary btn-small dean-footer-link"
              onClick={(e) => e.stopPropagation()}
            >
              Open Full Form ↗
            </Link>

            {isApproved ? (
              <button
                type="button"
                className="btn btn-secondary btn-small dean-footer-revoke"
                onClick={() => onRevoke?.(submissionId)}
              >
                Revoke Approval
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-small dean-footer-revision"
                  onClick={() => setIsRevisionMode(true)}
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small dean-footer-approve"
                  onClick={() => onApproveNext(submissionId)}
                >
                  Approve &amp; Next →
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Inline Quick Notes Manager Modal */}
      <ManageNotesModal
        isOpen={isManageModalOpen}
        notes={notes}
        onClose={(updated) => {
          setNotes(updated);
          setIsManageModalOpen(false);
        }}
      />
    </div>
  );
}
