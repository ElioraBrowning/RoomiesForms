import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { SubmissionSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);

  const isDepartmentHead = user?.roles?.includes('Department Head');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/submissions');
        setSubmissions(res.data);
      } catch (error) {
        console.error("Failed to fetch pending approvals", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h1>{isDepartmentHead ? "Department Head Dashboard" : "Faculty Dashboard"}</h1>
      
      <div className="card">
        <h2>Pending Approvals</h2>
        {submissions.length === 0 ? (
          <p>You have no pending approvals.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '0.5rem' }}>Form</th>
                <th style={{ padding: '0.5rem' }}>Student</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{s.formTitle}</td>
                  <td style={{ padding: '0.5rem' }}>{s.studentName}</td>
                  <td style={{ padding: '0.5rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      backgroundColor: s.status === 'Pending' ? '#fff3cd' : '#d4edda',
                      color: s.status === 'Pending' ? '#856404' : '#155724'
                    }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <Link to={`/submissions/${s.id}`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
