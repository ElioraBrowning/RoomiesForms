import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { readApiError } from '../../services/api';
import type { SubmissionSummary } from '../../types';
import { SkeletonTable } from '../Skeleton';
import { Badge } from '../StatusBadge';
import InlineReviewPanel from './InlineReviewPanel';

export type TaskBucket = 'all' | 'fresh' | 'resubmission' | 'waiting' | 'approved';
export type SortOption = 'oldest' | 'newest';
export type OriginFilter = 'all' | 'student' | 'employer' | 'faculty';

interface DeanTaskCenterProps {
  onSwitchToOverview?: () => void;
}

const shortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const daysSince = (iso: string) => {
  try {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  } catch {
    return 0;
  }
};

interface UndoState {
  submission: SubmissionSummary;
  previousQueue: SubmissionSummary[];
  previousReviewed: SubmissionSummary[];
  timeoutId: any;
}

const getOrigin = (s: SubmissionSummary): { origin: 'student' | 'employer' | 'faculty'; label: string } => {
  const k = s.formKey || '';
  if (k === 'CS404' || k === 'CS405' || s.employerReview != null) {
    return { origin: 'employer', label: 'Employer / Business' };
  }
  if (k === 'CS410' || k === 'CS420') {
    return { origin: 'faculty', label: 'Faculty Review' };
  }
  return { origin: 'student', label: 'Student Submission' };
};

export default function DeanTaskCenter({ onSwitchToOverview }: DeanTaskCenterProps) {
  const [queue, setQueue] = useState<SubmissionSummary[]>([]);
  const [reviewed, setReviewed] = useState<SubmissionSummary[]>([]);
  const [withEmployer, setWithEmployer] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeBucket, setActiveBucket] = useState<TaskBucket>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('oldest');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [justApprovedId, setJustApprovedId] = useState<number | null>(null);

  // Viewport scroll tracking for Floating Jump-to-Active button
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const [isOutOfView, setIsOutOfView] = useState(false);
  const [scrollDir, setScrollDir] = useState<'above' | 'below'>('above');

  useEffect(() => {
    Promise.all([
      api.get<SubmissionSummary[]>('/submissions'),
      api.get<SubmissionSummary[]>('/submissions/reviewed'),
      api.get<SubmissionSummary[]>('/submissions/awaiting-employer'),
    ])
      .then(([q, r, e]) => {
        setQueue(q.data || []);
        setReviewed(r.data || []);
        setWithEmployer(e.data || []);
      })
      .catch((err) => setError(readApiError(err, "Couldn't load review queue.").message))
      .finally(() => setLoading(false));
  }, []);

  // Monitor if the expanded card is scrolled out of viewport
  useEffect(() => {
    if (!expandedId) {
      setIsOutOfView(false);
      return;
    }

    const checkVisibility = () => {
      if (!activeCardRef.current) return;
      const rect = activeCardRef.current.getBoundingClientRect();
      const topBoundary = 90;
      const bottomBoundary = window.innerHeight - 90;

      if (rect.bottom < topBoundary) {
        setIsOutOfView(true);
        setScrollDir('above');
      } else if (rect.top > bottomBoundary) {
        setIsOutOfView(true);
        setScrollDir('below');
      } else {
        setIsOutOfView(false);
      }
    };

    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  }, [expandedId]);

  // Smooth Auto-Scroll that follows the user when cycling (Next/Prev), approving, or undoing
  useEffect(() => {
    if (!expandedId) return;

    // Small delay to allow previous card to collapse/unmount and new card to expand in the DOM
    const timer = setTimeout(() => {
      if (activeCardRef.current) {
        activeCardRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [expandedId]);

  const handleJumpToActive = () => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 1. Fresh Submissions
  const freshList = useMemo(
    () => queue.filter((s) => (s.status === 'Pending' || !s.status) && !s.isResubmission),
    [queue]
  );

  // 2. Resubmissions
  const resubmissionList = useMemo(
    () => queue.filter((s) => s.isResubmission && s.status !== 'Completed' && s.status !== 'Approved'),
    [queue]
  );

  // 3. Waiting on Others
  const waitingList = useMemo(() => {
    const fromEmployer = withEmployer;
    const waitingInQueue = queue.filter(
      (s) => s.status === 'Awaiting Employer' || s.status === 'Rejected' || s.status === 'Changes Requested'
    );
    const map = new Map<number, SubmissionSummary>();
    fromEmployer.forEach((item) => map.set(item.id, item));
    waitingInQueue.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [withEmployer, queue]);

  // 4. Approved Archive
  const approvedList = useMemo(() => {
    const list = [...reviewed, ...queue.filter((s) => s.status === 'Approved' || s.status === 'Completed')];
    const map = new Map<number, SubmissionSummary>();
    list.forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }, [reviewed, queue]);

  // Select list based on active bucket
  const baseList = useMemo(() => {
    switch (activeBucket) {
      case 'fresh':
        return freshList;
      case 'resubmission':
        return resubmissionList;
      case 'waiting':
        return waitingList;
      case 'approved':
        return approvedList;
      case 'all':
      default:
        return [...freshList, ...resubmissionList];
    }
  }, [activeBucket, freshList, resubmissionList, waitingList, approvedList]);

  // Omni-search, Submitter Origin filter, and Sorting pipeline
  const filteredList = useMemo(() => {
    let list = [...baseList];

    // 1. Submitter Origin Filter
    if (originFilter !== 'all') {
      list = list.filter((s) => getOrigin(s).origin === originFilter);
    }

    // 2. Omni-search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const name = (s.studentName || '').toLowerCase();
        const wNum = (s.wNumber || '').toLowerCase();
        const title = (s.formTitle || '').toLowerCase();
        const employerEmail = (s.employerReview?.employerEmail || '').toLowerCase();
        return name.includes(q) || wNum.includes(q) || title.includes(q) || employerEmail.includes(q);
      });
    }

    // 3. Sorting: Oldest first (waiting longest) vs Newest first
    list.sort((a, b) => {
      const timeA = new Date(a.updatedAt).getTime();
      const timeB = new Date(b.updatedAt).getTime();
      if (sortBy === 'oldest') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });

    return list;
  }, [baseList, originFilter, searchQuery, sortBy]);

  // Handle Approve & Next Transition Engine
  const handleApproveNext = (id: number) => {
    const sub = queue.find((s) => s.id === id) || baseList.find((s) => s.id === id);
    if (!sub) return;

    const previousQueue = [...queue];
    const previousReviewed = [...reviewed];

    const now = new Date().toISOString();
    const updatedSub: SubmissionSummary = {
      ...sub,
      status: 'Approved',
      reviewedAction: 'Approved',
      reviewedAt: now,
      approvals: [
        ...(sub.approvals || []),
        {
          stepOrder: (sub.approvals?.length || 0) + 1,
          stepName: 'Department Head Authorization',
          roleName: 'Department Head',
          reviewerName: 'Dr. Bonnie Achée',
          status: 'Approved',
          approvedBy: 'Dr. Bonnie Achée',
          actionDate: now,
          comments:
            'Prerequisites verified and cleared for CMPS 400 Workday override by Dr. Bonnie Achée.',
        },
      ],
    };

    setQueue((prev) => prev.filter((s) => s.id !== id));
    setReviewed((prev) => [updatedSub, ...prev.filter((s) => s.id !== id)]);

    setJustApprovedId(id);
    setTimeout(() => {
      setJustApprovedId((prev) => (prev === id ? null : prev));
    }, 1500);

    const remainingPending = filteredList.filter(
      (s) =>
        s.id !== id &&
        (s.status === 'Pending' || s.isResubmission || !s.status) &&
        s.status !== 'Approved' &&
        s.status !== 'Completed' &&
        s.status !== 'Awaiting Employer'
    );

    if (remainingPending.length === 0) {
      setExpandedId(null);
    } else {
      const currentIndex = filteredList.findIndex((s) => s.id === id);
      const nextSub =
        filteredList.slice(currentIndex + 1).find((s) => remainingPending.some((rp) => rp.id === s.id)) ||
        remainingPending[0];
      setExpandedId(nextSub ? nextSub.id : null);
    }

    if (undoState?.timeoutId) {
      clearTimeout(undoState.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      setUndoState(null);
    }, 5000);

    setUndoState({
      submission: updatedSub,
      previousQueue,
      previousReviewed,
      timeoutId,
    });
  };

  const handleUndo = () => {
    if (!undoState) return;
    clearTimeout(undoState.timeoutId);

    setQueue(undoState.previousQueue);
    setReviewed(undoState.previousReviewed);
    setExpandedId(undoState.submission.id);
    setUndoState(null);
  };

  const handleRevoke = (id: number) => {
    const sub = reviewed.find((s) => s.id === id) || queue.find((s) => s.id === id);
    if (!sub) return;

    const reverted: SubmissionSummary = {
      ...sub,
      status: 'Pending',
      reviewedAction: null,
      reviewedAt: null,
      approvals: (sub.approvals || []).filter((a) => a.approvedBy !== 'Dr. Bonnie Achée'),
    };

    setReviewed((prev) => prev.filter((s) => s.id !== id));
    setQueue((prev) => [reverted, ...prev.filter((s) => s.id !== id)]);
    setExpandedId(id);
  };

  const handleSendRevision = (id: number, feedback: string) => {
    const sub = queue.find((s) => s.id === id) || baseList.find((s) => s.id === id);
    if (!sub) return;

    const updatedSub: SubmissionSummary = {
      ...sub,
      status: 'Changes Requested',
      latestComment: feedback,
      isResubmission: false,
    };

    setQueue((prev) => prev.map((s) => (s.id === id ? updatedSub : s)));

    const remainingPending = filteredList.filter(
      (s) =>
        s.id !== id &&
        (s.status === 'Pending' || s.isResubmission || !s.status) &&
        s.status !== 'Approved' &&
        s.status !== 'Completed' &&
        s.status !== 'Awaiting Employer'
    );

    if (remainingPending.length === 0) {
      setExpandedId(null);
    } else {
      const currentIndex = filteredList.findIndex((s) => s.id === id);
      const nextSub =
        filteredList.slice(currentIndex + 1).find((s) => remainingPending.some((rp) => rp.id === s.id)) ||
        remainingPending[0];
      setExpandedId(nextSub ? nextSub.id : null);
    }
  };

  const handleBucketClick = (bucket: TaskBucket) => {
    if (activeBucket === bucket) {
      setActiveBucket('all');
    } else {
      setActiveBucket(bucket);
    }
  };

  const activeStudent = filteredList.find((s) => s.id === expandedId);
  const activeStudentName = activeStudent ? activeStudent.studentName : 'Active Form';

  // Dynamic description of what is currently filtered and displayed
  const showingDescription = useMemo(() => {
    const bucketName =
      activeBucket === 'all'
        ? 'All Action Items'
        : activeBucket === 'fresh'
        ? 'Fresh Submissions'
        : activeBucket === 'resubmission'
        ? 'Resubmissions'
        : activeBucket === 'waiting'
        ? 'Waiting on Others'
        : 'Approved Archive';

    const originName =
      originFilter === 'student'
        ? 'Students'
        : originFilter === 'employer'
        ? 'Employers / Business'
        : originFilter === 'faculty'
        ? 'Faculty'
        : null;

    let text = bucketName;
    if (originName) {
      text += ` · ${originName}`;
    }
    if (searchQuery.trim()) {
      text += ` matching "${searchQuery.trim()}"`;
    }

    return `${text} (${filteredList.length})`;
  }, [activeBucket, originFilter, searchQuery, filteredList.length]);

  return (
    <div className="dean-task-center">
      {/* Header Row */}
      <div className="dean-task-header">
        <div>
          <span className="dean-simple-kicker">College of Science &amp; Technology</span>
          <h1 className="dean-simple-title">Task Center &amp; Approvals</h1>
          <p className="dean-simple-sub">
            Review and clear internship applications for CMPS 400 enrollment.
          </p>
        </div>

        <div className="dean-task-header-actions">
          {onSwitchToOverview && (
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={onSwitchToOverview}
            >
              ← Program Outcomes
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* 4 Metric Buckets */}
      <section className="dean-metric-grid" aria-label="Task Summary & Filters">
        <button
          type="button"
          className={`dean-metric-card ${activeBucket === 'fresh' ? 'is-active' : ''}`}
          onClick={() => handleBucketClick('fresh')}
        >
          <div className="dean-metric-top">
            <span className="dean-metric-label">Fresh Submissions</span>
            <span className="dean-metric-badge tone-fresh">{freshList.length}</span>
          </div>
          <div className="dean-metric-count">{freshList.length}</div>
          <span className="dean-metric-hint">Awaiting initial review</span>
        </button>

        <button
          type="button"
          className={`dean-metric-card ${activeBucket === 'resubmission' ? 'is-active' : ''}`}
          onClick={() => handleBucketClick('resubmission')}
        >
          <div className="dean-metric-top">
            <span className="dean-metric-label">Resubmissions</span>
            <span className="dean-metric-badge tone-revised">{resubmissionList.length}</span>
          </div>
          <div className="dean-metric-count">{resubmissionList.length}</div>
          <span className="dean-metric-hint">Revised after feedback</span>
        </button>

        <button
          type="button"
          className={`dean-metric-card ${activeBucket === 'waiting' ? 'is-active' : ''}`}
          onClick={() => handleBucketClick('waiting')}
        >
          <div className="dean-metric-top">
            <span className="dean-metric-label">Waiting on Others</span>
            <span className="dean-metric-badge tone-waiting">{waitingList.length}</span>
          </div>
          <div className="dean-metric-count">{waitingList.length}</div>
          <span className="dean-metric-hint">Supervisor or student action</span>
        </button>

        <button
          type="button"
          className={`dean-metric-card ${activeBucket === 'approved' ? 'is-active' : ''}`}
          onClick={() => handleBucketClick('approved')}
        >
          <div className="dean-metric-top">
            <span className="dean-metric-label">Approved Archive</span>
            <span className="dean-metric-badge tone-approved">{approvedList.length}</span>
          </div>
          <div className="dean-metric-count">{approvedList.length}</div>
          <span className="dean-metric-hint">Cleared for Workday override</span>
        </button>
      </section>

      {/* Filter Bar & Omni Search */}
      <div className="dean-task-controls">
        <div className="dean-task-active-desc">
          <span>Showing: </span>
          <strong>{showingDescription}</strong>
          {(activeBucket !== 'all' || originFilter !== 'all' || searchQuery || sortBy !== 'oldest') && (
            <button
              type="button"
              className="btn btn-link dean-clear-filter"
              onClick={() => {
                setActiveBucket('all');
                setOriginFilter('all');
                setSearchQuery('');
                setSortBy('oldest');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="dean-task-filters-group">
          {/* Submitter Origin Filter */}
          <div className="dean-filter-select-wrap">
            <label htmlFor="dean-origin-select" className="visually-hidden">
              Filter by Submitter Origin
            </label>
            <select
              id="dean-origin-select"
              className="input dean-filter-select"
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}
            >
              <option value="all">All Submitters</option>
              <option value="student">Students Only</option>
              <option value="employer">Employers / Business Only</option>
              <option value="faculty">Faculty Only</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div className="dean-filter-select-wrap">
            <label htmlFor="dean-sort-select" className="visually-hidden">
              Sort submissions
            </label>
            <select
              id="dean-sort-select"
              className="input dean-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="oldest">Waiting Longest (Oldest First)</option>
              <option value="newest">Most Recently Updated (Newest First)</option>
            </select>
          </div>

          {/* Omni Search */}
          <div className="dean-task-search-wrap">
            <label className="visually-hidden" htmlFor="dean-omni-search">
              Search by student name, W-Number, or form title
            </label>
            <input
              id="dean-omni-search"
              type="search"
              className="input input-search dean-task-search"
              placeholder="Search by student name, W#, or form..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Full-Width Expandable Card List */}
      <section className="dean-queue-container">
        {loading ? (
          <SkeletonTable />
        ) : filteredList.length === 0 ? (
          <div className="card dean-task-empty">
            <h3 className="dean-task-empty-title">All caught up</h3>
            <p className="dean-task-empty-desc">
              {searchQuery
                ? 'No submissions match your search query.'
                : activeBucket === 'approved'
                ? 'No forms have been approved yet.'
                : activeBucket === 'waiting'
                ? 'No forms are currently waiting on employers or students.'
                : 'No pending submissions require your review.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="dean-queue-list">
            {filteredList.map((s, idx) => {
              const waitingDays = daysSince(s.updatedAt);
              const isPendingAction = s.status === 'Pending' || s.status === 'Draft' || !s.status;
              const isApproved = s.status === 'Approved' || s.status === 'Completed';
              const isExpanded = s.id === expandedId;
              const isJustApproved = s.id === justApprovedId;
              const { origin, label: originLabel } = getOrigin(s);

              return (
                <div
                  key={s.id}
                  ref={isExpanded ? activeCardRef : null}
                  className={`dean-queue-card origin-${origin} ${isExpanded ? 'is-expanded' : ''} ${
                    isJustApproved ? 'is-just-approved' : ''
                  }`}
                >
                  {/* Card Header Row (Click to toggle expansion) */}
                  <div
                    className="dean-queue-row"
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(isExpanded ? null : s.id);
                      }
                    }}
                  >
                    {/* Column 1: Submitter Origin & Form */}
                    <div className="dean-col-form">
                      <div className="dean-row-badges">
                        <span className={`dean-origin-badge origin-badge-${origin}`}>
                          {originLabel}
                        </span>
                        {s.isResubmission && (
                          <span className="dean-pill pill-revised">Revised</span>
                        )}
                      </div>
                      <div className="dean-row-title">{s.formTitle}</div>
                    </div>

                    {/* Column 2: Student & W# */}
                    <div className="dean-col-student">
                      <span className="dean-student-name">{s.studentName}</span>
                      <code className="dean-wnum">{s.wNumber || 'W0123456'}</code>
                    </div>

                    {/* Column 3: Timeline */}
                    <div className="dean-col-date">
                      <span className="dean-date-val">{shortDate(s.updatedAt)}</span>
                      {isPendingAction && waitingDays >= 5 && (
                        <span className="dean-waiting-tag">Waiting {waitingDays}d</span>
                      )}
                    </div>

                    {/* Column 4: Status */}
                    <div className="dean-col-status">
                      {isApproved ? (
                        <Badge tone="success">Cleared</Badge>
                      ) : s.status === 'Awaiting Employer' ? (
                        <Badge tone="warning">Waiting on Employer</Badge>
                      ) : s.isResubmission ? (
                        <Badge tone="info">Resubmitted</Badge>
                      ) : (
                        <Badge tone="neutral">Ready for Review</Badge>
                      )}
                    </div>

                    {/* Column 5: Actions */}
                    <div className="dean-col-actions" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/submissions/${s.id}`}
                        className="btn btn-secondary btn-small dean-link-full"
                        title="Open full submission page"
                      >
                        Open Full Form ↗
                      </Link>
                      <button
                        type="button"
                        className={`btn btn-small ${isExpanded ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      >
                        {isExpanded ? 'Collapse ▴' : isApproved ? 'View Clearance ▾' : 'Quick Review ▾'}
                      </button>
                    </div>
                  </div>

                  {/* Inline Expanded Tray */}
                  {isExpanded && (
                    <InlineReviewPanel
                      submissionId={s.id}
                      currentIndex={idx}
                      totalCount={filteredList.length}
                      hasPrev={idx > 0}
                      hasNext={idx < filteredList.length - 1}
                      onPrev={() => setExpandedId(filteredList[idx - 1].id)}
                      onNext={() => setExpandedId(filteredList[idx + 1].id)}
                      onCollapse={() => setExpandedId(null)}
                      onApproveNext={handleApproveNext}
                      onSendRevision={handleSendRevision}
                      onRevoke={handleRevoke}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Jump-to-Active Button (when scrolled away from open review) */}
      {isOutOfView && expandedId && (
        <button
          type="button"
          className={`dean-jump-pill jump-${scrollDir}`}
          onClick={handleJumpToActive}
          title="Return to the active review form"
        >
          <span className="dean-jump-arrow">{scrollDir === 'above' ? '↑' : '↓'}</span>
          <span>Jump to Active Review ({activeStudentName})</span>
        </button>
      )}

      {/* 5-Second Undo Safety Toast */}
      {undoState && (
        <div className="dean-undo-toast" role="status" aria-live="polite">
          <span className="dean-undo-text">
            Approved <strong>{undoState.submission.studentName}</strong>.
          </span>
          <button type="button" className="dean-undo-btn" onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
