import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { SubmissionSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const isDepartmentHead = user?.roles?.includes('Department Head');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/submissions');
        setSubmissions(res.data);
      } catch (error) {
        console.error("Failed to fetch pending approvals", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
          {isDepartmentHead ? "Department Head Dashboard" : "Faculty Dashboard"}
        </h1>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Loading Submissions...</h2>
          <p style={{ color: 'var(--text-help)' }}>Please wait while we securely fetch pending records.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{isDepartmentHead ? "Department Head Dashboard" : "Faculty Dashboard"}</h1>
      
      <div className="card">
        <h2>Pending Approvals</h2>
        {submissions.length === 0 ? (
          <p>You have no pending approvals.</p>
        ) : (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id}>
                    <td className="table-cell-title">
                      {s.formTitle}
                      {s.isResubmission && (
                        <span className="status status-resubmitted" style={{ marginLeft: '0.5rem', fontSize: '0.72rem' }}>
                          Revised
                        </span>
                      )}
                    </td>
                    <td>{s.studentName}</td>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`status ${
                        s.status === 'Completed' || s.status === 'Approved'
                          ? 'status-approved'
                          : s.status === 'Rejected'
                            ? 'status-rejected'
                            : 'status-pending'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <Link to={`/submissions/${s.id}`} className="btn-review">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
