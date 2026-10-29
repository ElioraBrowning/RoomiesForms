import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { readApiError } from '../services/api';
import type { Assignment, FormMeta, Student } from '../types';
import type { FieldErrors } from '../forms/types';
import { StatusBadge, Badge } from '../components/StatusBadge';
import { SkeletonTable } from '../components/Skeleton';

const STUDENT_EMAIL = /^[^\s@]+@(selu\.edu|southeastern\.edu)$/i;

/** Faculty and department heads choose which students get which forms. */
export default function Assignments() {
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [pickedForms, setPickedForms] = useState<Set<string>>(new Set());
  const [pickedStudents, setPickedStudents] = useState<Set<string>>(new Set());
  const [newEmail, setNewEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  const load = async () => {
    try {
      const [f, s, a] = await Promise.all([
        api.get<FormMeta[]>('/forms'),
        api.get<Student[]>('/assignments/students'),
        api.get<Assignment[]>('/assignments'),
      ]);
      setForms(f.data);
      setStudents(s.data);
      setAssignments(a.data);
    } catch (err) {
      setLoadError(readApiError(err, "Couldn't load assignments.").message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggle = (set: Set<string>, value: string, update: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    update(next);
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!STUDENT_EMAIL.test(email)) {
      setErrors({ ...errors, newEmail: 'Enter a Southeastern email, ending in @selu.edu.' });
      return;
    }
    if (!students.some((s) => s.email.toLowerCase() === email)) {
      setStudents([...students, { id: -Date.now(), fullName: email, email }].sort((a, b) => a.fullName.localeCompare(b.fullName)));
    }
    setPickedStudents(new Set(pickedStudents).add(email));
    setNewEmail('');
    const { newEmail: _drop, ...rest } = errors;
    setErrors(rest);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FieldErrors = {};
    if (pickedForms.size === 0) next.forms = 'Pick at least one form.';
    if (pickedStudents.size === 0) next.students = 'Pick at least one student.';
    if (dueDate && dueDate < new Date().toISOString().slice(0, 10)) next.dueDate = "The due date can't be in the past.";
    setErrors(next);
    setMessage('');
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const res = await api.post<{ created: number }>('/assignments', {
        forms: [...pickedForms],
        studentEmails: [...pickedStudents],
        dueDate: dueDate || null,
        note: note.trim() || null,
      });
      const created = res.data.created;
      setMessage(created === 0 ? 'Those students already had those forms.' : `Assigned ${created} form${created === 1 ? '' : 's'}.`);
      setPickedForms(new Set());
      setPickedStudents(new Set());
      setDueDate('');
      setNote('');
      await load();
    } catch (err) {
      const { message: msg, errors: fieldErrors } = readApiError(err, "Couldn't assign those forms.");
      setErrors(fieldErrors ?? {});
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  };

  const unassign = async (a: Assignment) => {
    if (!window.confirm(`Remove ${a.formTitle} from ${a.studentName}? Any unsent draft is deleted too.`)) return;
    try {
      await api.delete(`/assignments/${a.id}`);
      setAssignments((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      window.alert(readApiError(err, "Couldn't remove that assignment.").message);
    }
  };

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) => a.studentName.toLowerCase().includes(q) || a.studentEmail.toLowerCase().includes(q) || a.formTitle.toLowerCase().includes(q),
    );
  }, [assignments, filter]);

  if (loading) return <div className="card"><SkeletonTable rows={6} /></div>;
  if (loadError) return <div className="alert alert-danger">{loadError}</div>;

  return (
    <div className="assignments-page">
      <h1 className="dashboard-title">Assign forms</h1>

      <form className="card assign-card" onSubmit={submit} noValidate>
        <h2 className="card-title">New assignment</h2>
        <div className="assign-grid">
          <fieldset className={`question ${errors.forms ? 'has-error' : ''}`}>
            <legend className="question-label">Forms</legend>
            <div className="check-list">
              {forms.map((f) => (
                <label key={f.id} className={`choice choice-compact ${pickedForms.has(f.googleFormId) ? 'is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={pickedForms.has(f.googleFormId)}
                    onChange={() => toggle(pickedForms, f.googleFormId, setPickedForms)}
                  />
                  <span className="choice-mark choice-mark-box" aria-hidden="true" />
                  <span className="choice-text">
                    {f.title}
                    {f.anonymous && <> <Badge tone="info">Anonymous</Badge></>}
                    {f.hasEmployerStep && <> <Badge tone="neutral">Employer step</Badge></>}
                  </span>
                </label>
              ))}
            </div>
            {errors.forms && <p className="question-error">{errors.forms}</p>}
          </fieldset>

          <fieldset className={`question ${errors.students ? 'has-error' : ''}`}>
            <legend className="question-label">Students</legend>
            <div className="check-list check-list-scroll">
              {students.length === 0 && <p className="help-text">No students yet. Add one by email below.</p>}
              {students.map((s) => (
                <label key={s.email} className={`choice choice-compact ${pickedStudents.has(s.email.toLowerCase()) ? 'is-checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={pickedStudents.has(s.email.toLowerCase())}
                    onChange={() => toggle(pickedStudents, s.email.toLowerCase(), setPickedStudents)}
                  />
                  <span className="choice-mark choice-mark-box" aria-hidden="true" />
                  <span className="choice-text">
                    {s.fullName !== s.email && <strong>{s.fullName} </strong>}
                    <span className="help-inline">{s.email}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className={`add-email ${errors.newEmail ? 'has-error' : ''}`}>
              <label className="visually-hidden" htmlFor="new-email">Add a student by email</label>
              <input
                id="new-email"
                className="input"
                type="email"
                placeholder="Add a student: name@selu.edu"
                value={newEmail}
                aria-invalid={errors.newEmail ? true : undefined}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <button type="button" className="btn btn-secondary" onClick={addEmail}>Add</button>
            </div>
            {errors.newEmail && <p className="question-error">{errors.newEmail}</p>}
            {errors.students && <p className="question-error">{errors.students}</p>}
          </fieldset>
        </div>

        <div className="assign-options">
          <div className={`question ${errors.dueDate ? 'has-error' : ''}`}>
            <label className="question-label" htmlFor="due-date">
              Due date <span className="question-optional">(optional)</span>
            </label>
            <input
              id="due-date"
              className="input input-short input-date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={dueDate}
              aria-invalid={errors.dueDate ? true : undefined}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {errors.dueDate && <p className="question-error">{errors.dueDate}</p>}
          </div>
          <div className={`question ${errors.note ? 'has-error' : ''}`}>
            <label className="question-label" htmlFor="note">
              Note to students <span className="question-optional">(optional)</span>
            </label>
            <input id="note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Submit before your first day" />
            {errors.note && <p className="question-error">{errors.note}</p>}
          </div>
        </div>

        {message && <p className={`alert ${Object.keys(errors).length ? 'alert-danger' : 'alert-success'}`} role="status">{message}</p>}

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Assigning…' : `Assign${pickedForms.size && pickedStudents.size ? ` ${pickedForms.size * pickedStudents.size}` : ''}`}
          </button>
        </div>
      </form>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Current assignments</h2>
          <input
            className="input input-search"
            type="search"
            placeholder="Filter by student or form"
            aria-label="Filter assignments"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {shown.length === 0 ? (
          <p className="empty-state">{assignments.length === 0 ? 'Nothing assigned yet.' : 'No assignments match.'}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Form</th>
                  <th scope="col">Due</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="table-strong">{a.studentName}</span>
                      <br />
                      <span className="help-inline">{a.studentEmail}</span>
                    </td>
                    <td>{a.formTitle}</td>
                    <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'None'}</td>
                    <td>
                      <StatusBadge status={a.status} />
                      {a.status === 'Draft' && typeof a.progress === 'number' && <span className="help-inline"> {a.progress}%</span>}
                    </td>
                    <td className="table-actions">
                      {a.submissionId && a.status !== 'Draft' && (
                        <Link to={`/submissions/${a.submissionId}`} className="btn-link">View</Link>
                      )}
                      {(a.status === 'Not started' || a.status === 'Draft') && (
                        <button type="button" className="btn-link btn-link-danger" onClick={() => unassign(a)}>
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
