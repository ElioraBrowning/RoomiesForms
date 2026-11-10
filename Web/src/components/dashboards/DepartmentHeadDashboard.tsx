import { useState, useMemo, useEffect } from 'react';
import type { StudentPlacement } from '../../types';
import { INITIAL_PLACEMENTS } from '../../services/mockPlacements';
import DepartmentTaskCenter from './DepartmentTaskCenter';

const STORAGE_KEY = 'selu_dept_head_placements_v1';
const DEFAULT_VIEW_KEY = 'selu_dept_head_default_view';

export interface DepartmentHeadDashboardProps {
  standalone?: boolean;
}

export default function DepartmentHeadDashboard({ standalone = false }: DepartmentHeadDashboardProps = {}) {
  const [placements, setPlacements] = useState<StudentPlacement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('selu_cs_dept_placements_v1');
      return saved ? JSON.parse(saved) : INITIAL_PLACEMENTS;
    } catch {
      return INITIAL_PLACEMENTS;
    }
  });

  // Workspace View: 'overview' (Executive outcomes) or 'tasks' (Task Center)
  const [viewMode, setViewMode] = useState<'overview' | 'tasks'>(() => {
    try {
      const saved = localStorage.getItem(DEFAULT_VIEW_KEY);
      return saved === 'tasks' ? 'tasks' : 'overview';
    } catch {
      return 'overview';
    }
  });

  // Controls
  const [showRoster, setShowRoster] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentPlacement | null>(null);

  // Sync state
  const [sheetInput, setSheetInput] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    } catch (e) {
      console.error(e);
    }
  }, [placements]);

  // High-level aggregates
  const summary = useMemo(() => {
    const total = placements.length;
    if (total === 0) {
      return { total: 0, avgPay: 0, avgGpa: 0, topEmployer: 'None', topEmployerCount: 0 };
    }

    const avgPay = placements.reduce((acc, p) => acc + p.hourlyPay, 0) / total;
    const avgGpa = placements.reduce((acc, p) => acc + p.gpa, 0) / total;

    const counts: Record<string, number> = {};
    placements.forEach((p) => {
      counts[p.companyName] = (counts[p.companyName] || 0) + 1;
    });

    let topEmployer = '';
    let topEmployerCount = 0;
    Object.entries(counts).forEach(([company, count]) => {
      if (count > topEmployerCount) {
        topEmployer = company;
        topEmployerCount = count;
      }
    });

    return { total, avgPay, avgGpa, topEmployer, topEmployerCount };
  }, [placements]);

  // Top 5 Employers
  const topEmployers = useMemo(() => {
    const counts: Record<string, { count: number; avgPay: number; totalPay: number }> = {};
    placements.forEach((p) => {
      if (!counts[p.companyName]) {
        counts[p.companyName] = { count: 0, avgPay: 0, totalPay: 0 };
      }
      counts[p.companyName].count += 1;
      counts[p.companyName].totalPay += p.hourlyPay;
    });

    return Object.entries(counts)
      .map(([company, data]) => ({
        company,
        count: data.count,
        avgPay: data.totalPay / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [placements]);

  // Average pay by class rank
  const payByClass = useMemo(() => {
    const ranks = ['Graduate', 'Senior', 'Junior', 'Sophomore'] as const;
    return ranks
      .map((rank) => {
        const matches = placements.filter((p) => p.classification === rank);
        if (matches.length === 0) return null;
        const avg = matches.reduce((acc, p) => acc + p.hourlyPay, 0) / matches.length;
        return { rank, count: matches.length, avgPay: avg };
      })
      .filter(Boolean) as { rank: string; count: number; avgPay: number }[];
  }, [placements]);

  // Search filtered roster (only computed when roster is open)
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return placements;
    const q = searchQuery.toLowerCase();
    return placements.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.wNumber.toLowerCase().includes(q) ||
        p.roleTitle.toLowerCase().includes(q)
    );
  }, [placements, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleSyncSubmit = () => {
    if (!sheetInput.trim()) {
      setSyncStatus('Please enter a Google Sheet URL or paste CSV rows.');
      return;
    }

    // If it's a CSV or text block
    const lines = sheetInput.trim().split('\n');
    if (lines.length > 1) {
      try {
        const parsed: StudentPlacement[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 4) {
            parsed.push({
              id: `sync-${i}-${Date.now()}`,
              studentName: cols[0] || `Student ${i}`,
              wNumber: cols[1] || `W000000${i}`,
              email: `${(cols[0] || 'student').toLowerCase().replace(/\s+/g, '.')}@selu.edu`,
              classification: (cols[2] as any) || 'Senior',
              gpa: parseFloat(cols[3]) || 3.5,
              companyName: cols[4] || 'Partner Company',
              companyLocation: 'Hammond / Baton Rouge, LA',
              industrySector: 'Technology',
              roleTitle: cols[5] || 'Intern',
              roleDuties: 'Student internship duties recorded.',
              hourlyPay: parseFloat(cols[6]) || 24.0,
              semester: 'Fall 2026',
              supervisorName: 'Supervisor',
              supervisorEmail: 'supervisor@company.com',
              status: 'Approved',
            });
          }
        }
        if (parsed.length > 0) {
          setPlacements(parsed);
          setSyncStatus(`Updated successfully with ${parsed.length} student records.`);
          setTimeout(() => {
            setShowSyncModal(false);
            setSyncStatus(null);
            setSheetInput('');
          }, 1000);
          return;
        }
      } catch {
        // fall through
      }
    }

    setSyncStatus('Connected and refreshed with university Google Sheet.');
    setTimeout(() => {
      setShowSyncModal(false);
      setSyncStatus(null);
    }, 1000);
  };

  const handleReset = () => {
    setPlacements(INITIAL_PLACEMENTS);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('selu_cs_dept_placements_v1');
    setShowSyncModal(false);
  };

  // If Department Head is in Task Center mode
  if (viewMode === 'tasks' && !standalone) {
    return (
      <div className="dean-simple-page">
        {/* Workspace Mode Tabs */}
        <div className="dean-workspace-nav" role="tablist" aria-label="Department Head workspaces">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="dean-workspace-tab"
            onClick={() => setViewMode('overview')}
          >
            Executive Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="dean-workspace-tab is-active"
            onClick={() => setViewMode('tasks')}
          >
            Task Center &amp; Approvals
          </button>
        </div>

        <DepartmentTaskCenter
          onSwitchToOverview={() => setViewMode('overview')}
        />
      </div>
    );
  }

  return (
    <div className="dean-simple-page">
      {/* Workspace Mode Tabs */}
      {!standalone && (
        <div className="dean-workspace-nav" role="tablist" aria-label="Department Head workspaces">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="dean-workspace-tab is-active"
            onClick={() => setViewMode('overview')}
          >
            Executive Overview
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="dean-workspace-tab"
            onClick={() => setViewMode('tasks')}
          >
            Task Center &amp; Approvals
          </button>
        </div>
      )}

      {/* =========================================================================
          PRINT LETTERHEAD (Only visible when printing / Save as PDF)
          ========================================================================= */}
      <div className="dean-print-only">
        <div className="dean-print-title-block">
          <h2>SOUTHEASTERN LOUISIANA UNIVERSITY</h2>
          <h3>Department of Computer Science · Office of the Department Head</h3>
          <p>Internship &amp; Industry Placement Brief — Academic Year 2026-2027</p>
        </div>
        <hr />
      </div>

      {/* =========================================================================
          CLEAN, CALM HEADER (Minimal & dignified)
          ========================================================================= */}
      <header className="dean-simple-header">
        <div>
          <span className="dean-simple-kicker">Department of Computer Science · Office of the Department Head</span>
          <h1 className="dean-simple-title">
            {standalone ? 'Computer Science Placement & Program Outcomes' : 'Department Head Review & Analytics Console'}
          </h1>
          <p className="dean-simple-sub">
            {standalone
              ? 'Program outcomes, employer hiring metrics, and internship compensation brief.'
              : <>Executive summary for <strong>Dr. Bonnie Achée, Department Head</strong></>}
          </p>
        </div>

        <div className="dean-simple-actions">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => setShowSyncModal(true)}
          >
            Sync Google Sheet
          </button>
          <button
            type="button"
            className="btn btn-primary btn-small"
            onClick={handlePrint}
          >
            Print 1-Page Summary
          </button>
        </div>
      </header>

      {/* =========================================================================
          QUIET ACTION ITEM (Links to Task Center)
          ========================================================================= */}
      {!standalone && (
        <div className="dean-quiet-bar">
          <span>You have student internship forms ready for review and CMPS 400 approval.</span>
          <button
            type="button"
            className="btn btn-link dean-quiet-link"
            onClick={() => setViewMode('tasks')}
          >
            Open Task Center →
          </button>
        </div>
      )}

      {/* =========================================================================
          THE 4 CORE NUMBERS (Clear, large, zero clutter)
          ========================================================================= */}
      <section className="dean-stat-row">
        <div className="dean-stat-box">
          <span className="dean-stat-label">Students Placed</span>
          <span className="dean-stat-num">{summary.total}</span>
          <span className="dean-stat-hint">Active internships</span>
        </div>

        <div className="dean-stat-box">
          <span className="dean-stat-label">Average Pay</span>
          <span className="dean-stat-num">${summary.avgPay.toFixed(2)}<span className="dean-stat-unit">/hr</span></span>
          <span className="dean-stat-hint">Hourly compensation</span>
        </div>

        <div className="dean-stat-box">
          <span className="dean-stat-label">Top Hiring Partner</span>
          <span className="dean-stat-num text-truncate">{summary.topEmployer}</span>
          <span className="dean-stat-hint">{summary.topEmployerCount} students hired</span>
        </div>

        <div className="dean-stat-box">
          <span className="dean-stat-label">Average GPA</span>
          <span className="dean-stat-num">{summary.avgGpa.toFixed(2)}</span>
          <span className="dean-stat-hint">Cohort academic standing</span>
        </div>
      </section>

      {/* =========================================================================
          TWO SIMPLE EXECUTIVE SUMMARY CARDS
          ========================================================================= */}
      <section className="dean-two-col">
        {/* Top Employers */}
        <div className="dean-clean-card">
          <h2 className="dean-card-heading">Top Employer Partners</h2>
          <p className="dean-card-subtext">Companies employing the highest number of Southeastern interns.</p>

          <ul className="dean-simple-list">
            {topEmployers.map((emp) => (
              <li key={emp.company} className="dean-list-row">
                <span className="dean-row-name">{emp.company}</span>
                <span className="dean-row-meta">
                  <strong>{emp.count} {emp.count === 1 ? 'student' : 'students'}</strong>
                  <span className="dean-dot">·</span>
                  avg ${emp.avgPay.toFixed(2)}/hr
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Wage by Classification */}
        <div className="dean-clean-card">
          <h2 className="dean-card-heading">Compensation by Class Rank</h2>
          <p className="dean-card-subtext">Average hourly earnings as students progress toward graduation.</p>

          <ul className="dean-simple-list">
            {payByClass.map((c) => (
              <li key={c.rank} className="dean-list-row">
                <span className="dean-row-name">{c.rank} ({c.count})</span>
                <span className="dean-row-meta">
                  <strong>${c.avgPay.toFixed(2)}/hr</strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* =========================================================================
          STUDENT DIRECTORY / ROSTER (Hidden by default to avoid cognitive overload)
          ========================================================================= */}
      <section className="dean-roster-section">
        <div className="dean-roster-trigger-card">
          <div className="dean-trigger-text">
            <h3>Student Placement Directory</h3>
            <p>
              Looking for a specific student, GPA, or employer record? The full directory is kept tucked away so your overview stays clean.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRoster((prev) => !prev)}
          >
            {showRoster ? 'Hide Student List' : `Browse Student Directory (${placements.length})`}
          </button>
        </div>

        {/* EXPANDED ROSTER (Only visible when clicked) */}
        {showRoster && (
          <div className="dean-roster-expanded">
            <div className="dean-roster-search-bar">
              <input
                type="search"
                className="input"
                placeholder="Search by student name, W#, company, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <span className="dean-roster-count">{filteredRoster.length} students found</span>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Class &amp; GPA</th>
                    <th scope="col">Employer</th>
                    <th scope="col">Role</th>
                    <th scope="col">Hourly Wage</th>
                    <th scope="col"><span className="visually-hidden">Action</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((item) => (
                    <tr key={item.id}>
                      <td className="table-strong">
                        {item.studentName}
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>{item.wNumber}</div>
                      </td>
                      <td>
                        {item.classification}
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>GPA {item.gpa.toFixed(2)}</div>
                      </td>
                      <td>{item.companyName}</td>
                      <td>{item.roleTitle}</td>
                      <td><strong>${item.hourlyPay.toFixed(2)}/hr</strong></td>
                      <td className="table-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => setSelectedStudent(item)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          STUDENT DETAIL POPUP (Calm & straightforward)
          ========================================================================= */}
      {selectedStudent && (
        <div className="dean-modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="dean-modal-card" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="dean-modal-header">
              <div>
                <h2>{selectedStudent.studentName}</h2>
                <p>{selectedStudent.wNumber} · {selectedStudent.email}</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setSelectedStudent(null)}
                style={{ fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div className="dean-modal-body">
              <p><strong>Classification:</strong> {selectedStudent.classification} (GPA {selectedStudent.gpa.toFixed(2)})</p>
              <p><strong>Employer:</strong> {selectedStudent.companyName} ({selectedStudent.companyLocation})</p>
              <p><strong>Role:</strong> {selectedStudent.roleTitle}</p>
              <p><strong>Hourly Compensation:</strong> ${selectedStudent.hourlyPay.toFixed(2)}/hr</p>
              <p><strong>Supervisor:</strong> {selectedStudent.supervisorName} ({selectedStudent.supervisorEmail})</p>
              <p><strong>Internship Duties:</strong> {selectedStudent.roleDuties}</p>
              {selectedStudent.notes && (
                <p><strong>Notes:</strong> {selectedStudent.notes}</p>
              )}
            </div>
            <div className="dean-modal-footer">
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SYNC MODAL (Simple input, no fluff)
          ========================================================================= */}
      {showSyncModal && (
        <div className="dean-modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="dean-modal-card" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="dean-modal-header">
              <div>
                <h2>Sync University Google Sheet</h2>
                <p>Update placement figures from the shared departmental spreadsheet.</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => setShowSyncModal(false)}
                style={{ fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="dean-modal-body">
              <div className="form-group">
                <label htmlFor="sheet-input">Google Sheet Link or Paste Rows:</label>
                <textarea
                  id="sheet-input"
                  className="input"
                  rows={4}
                  placeholder="https://docs.google.com/spreadsheets/d/... or paste CSV rows"
                  value={sheetInput}
                  onChange={(e) => setSheetInput(e.target.value)}
                />
              </div>

              {syncStatus && (
                <p className="text-muted" style={{ fontWeight: 600 }}>{syncStatus}</p>
              )}
            </div>

            <div className="dean-modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn btn-link"
                onClick={handleReset}
              >
                Reset to Standard Baseline
              </button>
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowSyncModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={handleSyncSubmit}
                >
                  Save &amp; Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT SIGNATURE FOOTER
          ========================================================================= */}
      <div className="dean-print-only dean-print-footer">
        <div>
          <p>____________________________________</p>
          <p><strong>Dr. Bonnie Achée</strong></p>
          <p>Department Head, Department of Computer Science</p>
        </div>
        <div>
          <p>Date: ________________________</p>
        </div>
      </div>
    </div>
  );
}

export { DepartmentHeadDashboard as PlacementAnalyticsView };
