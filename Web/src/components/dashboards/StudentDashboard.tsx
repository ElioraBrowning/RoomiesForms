import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { FormMeta, SubmissionSummary } from '../../types';

export default function StudentDashboard() {
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>Student Dashboard</h1>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Loading Dashboard...</h2>
          <p style={{ color: 'var(--text-help)' }}>Please wait while we securely fetch your records.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', color: 'var(--text-heading)' }}>Student Dashboard</h1>
      
      <div className="card">
        <h2>Available Forms & Drafts</h2>
        {forms.length === 0 ? (
          <p>No forms available.</p>
        ) : (
          <div className="grid">
            {forms.map(f => {
              const draft = submissions.find(s => s.formTitle === f.title && s.status === 'Draft');
              const progress = draft?.progress || 0;
              return (
                <div key={f.id} className="nested-card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-heading)' }}>{f.title}</h3>
                  {progress > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-help)', marginBottom: '4px' }}>
                        <span>Draft in progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-card)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--slu-gold)', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', paddingTop: progress === 0 ? '1.5rem' : 0 }}>
                    <Link to={`/forms/${f.id}`} className="btn" style={{ width: '100%', textAlign: 'center' }}>
                      {progress > 0 ? 'Continue Draft' : 'Start Form'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Submitted Forms</h2>
        {submissions.filter(s => s.status !== 'Draft').length === 0 ? (
          <p>You have not submitted any forms yet.</p>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-card)' }}>
                <th style={{ padding: '0.5rem' }}>Form</th>
                <th style={{ padding: '0.5rem' }}>Date</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.filter(s => s.status !== 'Draft').map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
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
