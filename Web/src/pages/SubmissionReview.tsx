import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { SubmissionDetail } from '../types';
import '../index.css';

import CS401 from '../components/forms/CS401';
import CS402 from '../components/forms/CS402';
import CS403 from '../components/forms/CS403';
import CS404 from '../components/forms/CS404';
import CS405 from '../components/forms/CS405';
import CS410 from '../components/forms/CS410';
import CS420 from '../components/forms/CS420';
import ExitSurvey from '../components/forms/ExitSurvey';

export default function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/submissions/${id}`);
        setSubmission(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSubmission();
  }, [id]);

  const handleApprove = async () => {
    try {
      await api.post(`/submissions/${id}/approve`, { comments: "Looks good" });
      alert('Approved successfully');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error approving');
    }
  };

  if (!submission) return <div>Loading...</div>;

  return (
    <div className="card">
      <h2>Review Submission #{submission.id}</h2>
      <p><strong>Form:</strong> {submission.form?.title}</p>
      <p><strong>Student:</strong> {submission.student?.fullName} ({submission.student?.wNumber})</p>
      <p><strong>Status:</strong> {submission.status}</p>

      <hr style={{ margin: '1rem 0' }} />
      <h3>Responses</h3>
      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        {(() => {
          const formId = submission.form?.googleFormId;
          const props = { onSubmit: () => {}, defaultValues: submission.responses, isReadonly: true };
          switch (formId) {
            case 'CS401': return <CS401 {...props} />;
            case 'CS402': return <CS402 {...props} />;
            case 'CS403': return <CS403 {...props} />;
            case 'CS404': return <CS404 {...props} />;
            case 'CS405': return <CS405 {...props} />;
            case 'CS410': return <CS410 {...props} />;
            case 'CS420': return <CS420 {...props} />;
            case 'ExitSurvey': return <ExitSurvey {...props} />;
            default: return <pre>{JSON.stringify(submission.responses, null, 2)}</pre>;
          }
        })()}
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <button onClick={handleApprove} className="btn" disabled={submission.status === 'Completed'}>
          {submission.status === 'Completed' ? 'Already Completed' : 'Approve Step'}
        </button>
        <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
