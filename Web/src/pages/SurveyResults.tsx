import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { readApiError } from '../services/api';
import type { Answers, FormQuestion, FormSchema } from '../forms/types';
import { questionsFor } from '../forms/types';
import { SkeletonForm } from '../components/Skeleton';

interface ResultsResponse {
  title: string;
  schema: FormSchema | null;
  assigned: number;
  responses: { submittedOn: string; responses: Answers }[];
}

/**
 * Results for an anonymous survey. Answers are grouped by question rather than by
 * person, which also makes it harder to piece one student's answers back together.
 */
export default function SurveyResults() {
  const { formId } = useParams();
  const [data, setData] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<ResultsResponse>(`/forms/${formId}/anonymous-responses`)
      .then((res) => setData(res.data))
      .catch((err) => setError(readApiError(err, "Couldn't load the results.").message));
  }, [formId]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <div className="results-page"><SkeletonForm /></div>;

  const questions = data.schema ? questionsFor(data.schema, 'student') : [];
  const count = data.responses.length;

  return (
    <div className="results-page">
      <div className="page-head">
        <p className="page-eyebrow"><Link to="/dashboard">Dashboard</Link> / Survey results</p>
        <h1>{data.title}</h1>
        <p className="page-lede">
          {count} response{count === 1 ? '' : 's'} from {data.assigned} student{data.assigned === 1 ? '' : 's'} assigned. Responses are anonymous: no names, W#s or submission times are stored with them.
        </p>
      </div>

      {count === 0 ? (
        <div className="card empty-card">
          <p>No responses yet.</p>
        </div>
      ) : (
        questions.map((q) => <QuestionResults key={q.id} question={q} responses={data.responses.map((r) => r.responses)} />)
      )}
    </div>
  );
}

function QuestionResults({ question: q, responses }: { question: FormQuestion; responses: Answers[] }) {
  if (q.type === 'choice' || q.type === 'multiChoice') {
    const picked = (r: Answers, opt: string) => {
      const v = r[q.id];
      return Array.isArray(v) ? v.includes(opt) : v === opt;
    };
    const counts = (q.options ?? []).map((opt) => ({ opt, n: responses.filter((r) => picked(r, opt)).length }));
    // Percentages are of people who answered, so multi-select bars can add up to more than 100%.
    const total = responses.filter((r) => r[q.id] !== undefined && r[q.id] !== '').length || 1;
    return (
      <section className="card">
        <h2 className="card-title">{q.label}</h2>
        <ul className="result-bars">
          {counts.map(({ opt, n }) => (
            <li key={opt} className="result-bar">
              <span className="result-bar-label">{opt}</span>
              <span className="result-bar-track" aria-hidden="true">
                <span className="result-bar-fill" style={{ width: `${(n / total) * 100}%` }} />
              </span>
              <span className="result-bar-count">
                {n} <span className="help-inline">({Math.round((n / total) * 100)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const texts = responses.map((r) => r[q.id]).filter((v): v is string => typeof v === 'string' && v.trim() !== '');
  return (
    <section className="card">
      <h2 className="card-title">{q.label}</h2>
      {texts.length === 0 ? (
        <p className="empty-state">No answers.</p>
      ) : (
        <ul className="result-quotes">
          {texts.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
