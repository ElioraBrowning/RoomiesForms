import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { FormMeta } from '../types';
import { useAuth } from '../context/AuthContext';
import '../index.css';

import CS401 from '../components/forms/CS401';
import CS402 from '../components/forms/CS402';
import CS403 from '../components/forms/CS403';
import CS404 from '../components/forms/CS404';
import CS405 from '../components/forms/CS405';
import CS410 from '../components/forms/CS410';
import CS420 from '../components/forms/CS420';
import ExitSurvey from '../components/forms/ExitSurvey';

export default function FormView() {
  const { formId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formMeta, setFormMeta] = useState<FormMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftData, setDraftData] = useState<any>(null);
  const [isRevision, setIsRevision] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchFormAndDraft = async () => {
      try {
        const res = await api.get(`/forms/${formId}`);
        setFormMeta(res.data);
        
        try {
          const draftRes = await api.get(`/submissions/drafts/${formId}`);
          if (draftRes.data && draftRes.data.responses) {
            setDraftData(draftRes.data.responses);

            if (draftRes.data.status === 'Rejected') {
              setIsRevision(true);
              // Extract latest reviewer comment from audit logs if present
              const logs = draftRes.data.auditLogs as Array<{ comments?: string; action?: string }> | undefined;
              if (logs && logs.length > 0) {
                const latestReject = [...logs].reverse().find(l => l.action === 'Rejected' && l.comments);
                if (latestReject?.comments) {
                  setRevisionFeedback(latestReject.comments);
                }
              }
            }
          }
        } catch (draftErr) {
          // No draft or rejected submission exists, start fresh
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFormAndDraft();
  }, [formId]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/submissions', {
        formId: Number(formId),
        responses: data
      });
      alert(
        isRevision
          ? 'Revised form submitted successfully! Your submission is now pending faculty review.'
          : 'Form submitted successfully! Your submission is now pending faculty review.'
      );
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error submitting form. Is the backend workflow configured?');
    }
  };

  const onSaveDraft = async (data: any) => {
    try {
      await api.post('/submissions/drafts', {
        formId: Number(formId),
        responses: data
      });
    } catch (err) {
      console.error('Failed to save draft', err);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading form...</p>
      </div>
    );
  }
  if (!formMeta) return <div className="card"><p>Form not found.</p></div>;

  const defaultValues = draftData || {
    name: user?.fullName,
    wNumber: user?.wNumber,
    email: user?.email,
    studentName: user?.fullName,
  };

  const renderForm = () => {
    const props = { onSubmit, onSaveDraft, defaultValues };
    switch (formMeta.googleFormId) {
      case 'CS401': return <CS401 {...props} />;
      case 'CS402': return <CS402 {...props} />;
      case 'CS403': return <CS403 {...props} />;
      case 'CS404': return <CS404 {...props} />;
      case 'CS405': return <CS405 {...props} />;
      case 'CS410': return <CS410 {...props} />;
      case 'CS420': return <CS420 {...props} />;
      case 'ExitSurvey': return <ExitSurvey {...props} />;
      default: return <div>Generic form renderer goes here...</div>;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>{formMeta.title}</h1>
        {isRevision && (
          <span className="status status-rejected">Editing Resubmission</span>
        )}
      </div>

      {isRevision && (
        <div className="student-alert-card student-alert-rejected" style={{ marginBottom: '1.75rem' }}>
          <div className="student-alert-header">
            <span className="student-alert-icon">⚠️</span>
            <div>
              <h3>Editing Form: Revisions Requested</h3>
              <p>
                Your previous responses have been loaded below. Please make the requested updates and submit your revised form.
              </p>
            </div>
          </div>
          {revisionFeedback && (
            <div className="student-feedback-box">
              <strong>Reviewer Feedback:</strong>
              <pre>{revisionFeedback}</pre>
            </div>
          )}
        </div>
      )}

      {renderForm()}
    </div>
  );
}
