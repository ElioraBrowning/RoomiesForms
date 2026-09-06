import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { FormMeta, SubmissionSummary } from '../../types';

export default function StudentDashboard() {
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formsRes, subRes] = await Promise.allSettled([
          api.get('/forms'),
          api.get('/submissions')
        ]);

        if (formsRes.status === 'fulfilled') setForms(formsRes.value.data);
        if (subRes.status === 'fulfilled') setSubmissions(subRes.value.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Student Dashboard</h1>
      
      <div className="card">
        <h2>Available Forms</h2>
        {forms.length === 0 ? (
          <p>No forms available.</p>
        ) : (
          <div className="grid">
            {forms.map(f => (
              <div key={f.id} className="card" style={{ marginBottom: 0, border: '1px solid #ccc' }}>
                <h3>{f.title}</h3>
                <Link to={`/forms/${f.id}`} className="btn">Fill Out</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>My Submissions</h2>
        {submissions.length === 0 ? (
          <p>You have not submitted any forms yet.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ padding: '0.5rem' }}>Form</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{s.formTitle}</td>
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
                    <Link to={`/submissions/${s.id}`}>View</Link>
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
