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

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const res = await api.get(`/forms/${formId}`);
        setFormMeta(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/submissions', {
        formId: Number(formId),
        responses: data
      });
      alert('Form submitted successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error submitting form. Is the backend workflow configured?');
    }
  };

  if (loading) return <div>Loading form...</div>;
  if (!formMeta) return <div>Form not found.</div>;

  const defaultValues = {
    name: user?.fullName,
    wNumber: user?.wNumber,
    email: user?.email,
    studentName: user?.fullName,
  };

  const renderForm = () => {
    switch (formMeta.googleFormId) {
      case 'CS401': return <CS401 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS402': return <CS402 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS403': return <CS403 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS404': return <CS404 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS405': return <CS405 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS410': return <CS410 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'CS420': return <CS420 onSubmit={onSubmit} defaultValues={defaultValues} />;
      case 'ExitSurvey': return <ExitSurvey onSubmit={onSubmit} defaultValues={defaultValues} />;
      default: return <div>Generic form renderer goes here...</div>;
    }
  };

  return (
    <div>
      <h2>{formMeta.title}</h2>
      {renderForm()}
    </div>
  );
}
