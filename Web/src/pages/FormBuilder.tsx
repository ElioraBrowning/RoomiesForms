import { useEffect, useState } from 'react';
import api, { readApiError } from '../services/api';
import type { FormDetail, FormMeta } from '../types';
import type { FormPage, FormQuestion, FormSchema, QuestionType } from '../forms/types';
import { FormRunner } from '../forms/FormRunner';

/**
 * Edits the same JSON definition the forms run on. Only the fixed set of question types
 * is offered, which is what keeps every form consistent. The server checks the definition
 * again before saving (Backend/Forms/FormSchemaChecker.cs).
 */

const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'longText', label: 'Paragraph' },
  { value: 'address', label: 'Address' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone number' },
  { value: 'wNumber', label: 'W#' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Money' },
  { value: 'date', label: 'Date' },
  { value: 'choice', label: 'Multiple choice (pick one)' },
  { value: 'multiChoice', label: 'Multiple choice (pick several)' },
  { value: 'confirm', label: 'Checkbox to confirm' },
  { value: 'signature', label: 'Typed signature' },
  { value: 'list', label: 'Repeating rows' },
];

/** Types allowed inside a repeating row. */
const ROW_TYPES: QuestionType[] = ['text', 'longText', 'number', 'currency', 'date', 'email', 'phone'];

const CATEGORIES = ['Internship', 'Program feedback', 'Advising', 'Other'];

const blankSchema = (): FormSchema => ({
  id: '',
  title: '',
  department: 'Computer Science',
  category: 'Internship',
  description: '',
  needs: [],
  pages: [{ id: 'page1', title: 'First page', questions: [newQuestion('text', [])] }],
});

/** A question id made from its label, unique within the form: "Hours per week" -> "hoursPerWeek". */
function idFromLabel(label: string, taken: string[]) {
  const words = label.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  let base = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('') || 'question';
  if (!/^[A-Za-z]/.test(base)) base = 'q' + base;
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}${n}`;
  return id;
}

function newQuestion(type: QuestionType, taken: string[]): FormQuestion {
  const q: FormQuestion = { id: idFromLabel('New question', taken), type, label: 'New question' };
  if (type === 'choice' || type === 'multiChoice') q.options = ['Option 1', 'Option 2'];
  if (type === 'confirm' || type === 'signature') q.statement = 'I confirm this is accurate.';
  if (type === 'list') q.fields = [{ id: 'text', type: 'text', label: 'Item' }];
  return q;
}

const allIds = (s: FormSchema) => s.pages.flatMap((p) => p.questions.map((q) => q.id));

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function FormBuilder() {
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [formKey, setFormKey] = useState<string>('');
  const [isNew, setIsNew] = useState(false);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<FormMeta[]>('/forms').then((res) => setForms(res.data)).catch(() => setForms([]));
  }, []);

  const load = async (key: string) => {
    setProblems([]);
    setMessage('');
    setPreview(false);
    if (key === '__new') {
      setIsNew(true);
      setFormKey('');
      setSchema(blankSchema());
    } else if (key) {
      setIsNew(false);
      setFormKey(key);
      const res = await api.get<FormDetail>(`/forms/${key}`);
      setSchema(res.data.schema ? structuredClone(res.data.schema) : blankSchema());
    } else {
      setSchema(null);
    }
    setPageIndex(0);
    setQuestionIndex(0);
  };

  const update = (fn: (s: FormSchema) => FormSchema) => {
    setSchema((s) => (s ? fn(structuredClone(s)) : s));
    setMessage('');
  };

  const page = schema?.pages[pageIndex];
  const question = page?.questions[questionIndex];

  const updatePage = (patch: Partial<FormPage>) =>
    update((s) => {
      s.pages[pageIndex] = { ...s.pages[pageIndex], ...patch };
      return s;
    });

  const updateQuestion = (patch: Partial<FormQuestion>) =>
    update((s) => {
      const q = s.pages[pageIndex].questions[questionIndex];
      s.pages[pageIndex].questions[questionIndex] = { ...q, ...patch };
      return s;
    });

  const save = async () => {
    if (!schema) return;
    setSaving(true);
    setProblems([]);
    try {
      if (isNew) {
        await api.post('/forms', schema);
        setMessage(`Created ${schema.id}. Assign it to students from the Assign forms page.`);
        setIsNew(false);
        setFormKey(schema.id);
        const res = await api.get<FormMeta[]>('/forms');
        setForms(res.data);
      } else {
        await api.put(`/forms/${formKey}/schema`, schema);
        setMessage('Saved. Students see the new version the next time they open the form.');
      }
    } catch (err) {
      const data = (err as { response?: { data?: { problems?: string[] } } })?.response?.data;
      setProblems(data?.problems ?? [readApiError(err, "Couldn't save the form.").message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="builder">
      <div className="page-head page-head-row">
        <h1>Form builder</h1>
        <div className="question builder-pick">
          <label className="question-label" htmlFor="pick-form">Form</label>
          <select id="pick-form" className="input" value={isNew ? '__new' : formKey} onChange={(e) => void load(e.target.value)}>
            <option value="">Choose a form…</option>
            {groupForms(forms).map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((f) => (
                  <option key={f.id} value={f.googleFormId}>{f.title}</option>
                ))}
              </optgroup>
            ))}
            <option value="__new">+ New form</option>
          </select>
        </div>
      </div>

      {!schema && <div className="card empty-card"><p>Choose a form to edit, or start a new one.</p></div>}

      {schema && (
        <>
          <section className="card">
            <div className="builder-form-fields">
              {isNew && (
                <Field label="Form id" help="Letters and numbers, like CS430. Can't be changed later.">
                  <input className="input" value={schema.id} onChange={(e) => update((s) => ({ ...s, id: e.target.value.replace(/[^A-Za-z0-9]/g, '') }))} />
                </Field>
              )}
              <Field label="Title">
                <input className="input" value={schema.title} onChange={(e) => update((s) => ({ ...s, title: e.target.value }))} />
              </Field>
              <Field label="Department">
                <input
                  className="input"
                  list="builder-departments"
                  value={schema.department ?? ''}
                  onChange={(e) => update((s) => ({ ...s, department: e.target.value }))}
                />
                <datalist id="builder-departments">
                  {[...new Set(forms.map((f) => f.department).filter(Boolean))].map((d) => <option key={d} value={d} />)}
                </datalist>
              </Field>
              <Field label="What it's for" help="Forms are grouped by this on the dashboard.">
                <select className="input" value={schema.category ?? 'Other'} onChange={(e) => update((s) => ({ ...s, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Summary" help="One or two sentences shown under the form's name." optional>
                <textarea className="input input-textarea" rows={2} value={schema.description ?? ''} onChange={(e) => update((s) => ({ ...s, description: e.target.value }))} />
              </Field>
              <Field label="What students need to have ready" help="One per line. Shown when they click More info." optional>
                <textarea
                  className="input input-textarea"
                  rows={2}
                  value={(schema.needs ?? []).join('\n')}
                  onChange={(e) => update((s) => ({ ...s, needs: e.target.value.split('\n') }))}
                  onBlur={() => update((s) => ({ ...s, needs: (s.needs ?? []).map((n) => n.trim()).filter(Boolean) }))}
                />
              </Field>
              <Field label="Anonymous" help="Answers are stored without the student's name.">
                <label className={`choice choice-compact ${schema.anonymous ? 'is-checked' : ''}`}>
                  <input type="checkbox" checked={Boolean(schema.anonymous)} onChange={(e) => update((s) => ({ ...s, anonymous: e.target.checked }))} />
                  <span className="choice-mark choice-mark-box" aria-hidden="true" />
                  <span className="choice-text">Anonymous form</span>
                </label>
              </Field>
            </div>
          </section>

          <div className="builder-grid">
            {/* Pages */}
            <section className="card builder-col">
              <h2 className="card-title">Pages</h2>
              <ol className="builder-list">
                {schema.pages.map((p, i) => (
                  <li key={p.id + i} className={i === pageIndex ? 'is-selected' : ''}>
                    <button type="button" className="builder-item" onClick={() => { setPageIndex(i); setQuestionIndex(0); }}>
                      <span>{i + 1}. {p.title || 'Untitled page'}</span>
                      <span className="help-inline">{p.questions.length} question{p.questions.length === 1 ? '' : 's'}{p.respondent === 'employer' ? ' · employer' : ''}</span>
                    </button>
                    <span className="builder-item-tools">
                      <button type="button" className="btn-link" aria-label="Move page up" onClick={() => { update((s) => ({ ...s, pages: move(s.pages, i, i - 1) })); setPageIndex(Math.max(0, i - 1)); }}>Up</button>
                      <button type="button" className="btn-link" aria-label="Move page down" onClick={() => { update((s) => ({ ...s, pages: move(s.pages, i, i + 1) })); setPageIndex(Math.min(schema.pages.length - 1, i + 1)); }}>Down</button>
                    </span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => {
                  update((s) => ({ ...s, pages: [...s.pages, { id: `page${s.pages.length + 1}`, title: 'New page', questions: [newQuestion('text', allIds(s))] }] }));
                  setPageIndex(schema.pages.length);
                  setQuestionIndex(0);
                }}
              >
                + Add page
              </button>
            </section>

            {/* Selected page */}
            {page && (
              <section className="card builder-col">
                <h2 className="card-title">Page {pageIndex + 1}</h2>
                <Field label="Page title">
                  <input className="input" value={page.title} onChange={(e) => updatePage({ title: e.target.value })} />
                </Field>
                <Field label="Instructions" optional>
                  <textarea className="input input-textarea" rows={2} value={page.description ?? ''} onChange={(e) => updatePage({ description: e.target.value })} />
                </Field>
                <Field label="Who answers this page">
                  <select className="input" value={page.respondent ?? 'student'} onChange={(e) => updatePage({ respondent: e.target.value as FormPage['respondent'] })}>
                    <option value="student">Student</option>
                    <option value="employer">Employer (through their link)</option>
                  </select>
                </Field>

                <h3 className="builder-subtitle">Questions</h3>
                <ol className="builder-list">
                  {page.questions.map((q, i) => (
                    <li key={q.id + i} className={i === questionIndex ? 'is-selected' : ''}>
                      <button type="button" className="builder-item" onClick={() => setQuestionIndex(i)}>
                        <span>{q.label || 'Untitled'}</span>
                        <span className="help-inline">{TYPES.find((t) => t.value === q.type)?.label}{q.reviewRequired ? ' · verify' : ''}</span>
                      </button>
                      <span className="builder-item-tools">
                        <button type="button" className="btn-link" aria-label="Move question up" onClick={() => { updatePage({ questions: move(page.questions, i, i - 1) }); setQuestionIndex(Math.max(0, i - 1)); }}>Up</button>
                        <button type="button" className="btn-link" aria-label="Move question down" onClick={() => { updatePage({ questions: move(page.questions, i, i + 1) }); setQuestionIndex(Math.min(page.questions.length - 1, i + 1)); }}>Down</button>
                      </span>
                    </li>
                  ))}
                </ol>
                {page.questions.length >= 3 && (
                  <p className="help-text">Three or more questions may not fit without scrolling. Split them unless they're closely related.</p>
                )}
                <div className="button-row">
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => { updatePage({ questions: [...page.questions, newQuestion('text', allIds(schema))] }); setQuestionIndex(page.questions.length); }}>
                    + Add question
                  </button>
                  {schema.pages.length > 1 && (
                    <button type="button" className="btn-link btn-link-danger" onClick={() => { update((s) => ({ ...s, pages: s.pages.filter((_, i) => i !== pageIndex) })); setPageIndex(0); setQuestionIndex(0); }}>
                      Delete page
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Selected question */}
            {question && page && (
              <section className="card builder-col">
                <h2 className="card-title">Question</h2>
                <Field label="Question text">
                  <input
                    className="input"
                    value={question.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      // Ids follow the label until the form is saved with real answers in it; new forms only.
                      const patch: Partial<FormQuestion> = { label };
                      if (isNew) patch.id = idFromLabel(label, allIds(schema).filter((x) => x !== question.id));
                      updateQuestion(patch);
                    }}
                  />
                </Field>
                <Field label="Answer type">
                  <select
                    className="input"
                    value={question.type}
                    onChange={(e) => {
                      const fresh = newQuestion(e.target.value as QuestionType, []);
                      updateQuestion({ type: fresh.type, options: fresh.options ?? question.options, statement: fresh.statement ?? question.statement, fields: fresh.fields });
                    }}
                  >
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Help text" optional>
                  <input className="input" value={question.help ?? ''} onChange={(e) => updateQuestion({ help: e.target.value || undefined })} />
                </Field>

                {(question.type === 'choice' || question.type === 'multiChoice') && (
                  <Field label="Options" help="One per line.">
                    <textarea
                      className="input input-textarea"
                      rows={Math.max(3, (question.options?.length ?? 0) + 1)}
                      value={(question.options ?? []).join('\n')}
                      onChange={(e) => updateQuestion({ options: e.target.value.split('\n') })}
                      onBlur={() => updateQuestion({ options: (question.options ?? []).map((o) => o.trim()).filter(Boolean) })}
                    />
                  </Field>
                )}
                {question.type === 'multiChoice' && (
                  <div className="builder-row-2">
                    <Field label="Pick at least" optional>
                      <NumberInput value={question.minSelected} onChange={(v) => updateQuestion({ minSelected: v })} />
                    </Field>
                    <Field label="Pick at most" optional>
                      <NumberInput value={question.maxSelected} onChange={(v) => updateQuestion({ maxSelected: v })} />
                    </Field>
                  </div>
                )}
                {(question.type === 'confirm' || question.type === 'signature') && (
                  <Field label={question.type === 'signature' ? 'What they agree to by signing' : 'What they confirm'}>
                    <input className="input" value={question.statement ?? ''} onChange={(e) => updateQuestion({ statement: e.target.value })} />
                  </Field>
                )}
                {question.type === 'signature' && (
                  <Field label="Must match the name in" optional help="The typed name has to match this answer.">
                    <select className="input" value={question.matchField ?? ''} onChange={(e) => updateQuestion({ matchField: e.target.value || undefined })}>
                      <option value="">Don't check</option>
                      {schema.pages.flatMap((p) => p.questions).filter((q) => q.type === 'text' && q.id !== question.id).map((q) => (
                        <option key={q.id} value={q.id}>{q.label}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {question.type === 'date' && (
                  <Field label="Must be after" optional>
                    <select className="input" value={question.after ?? ''} onChange={(e) => updateQuestion({ after: e.target.value || undefined })}>
                      <option value="">Any date</option>
                      {schema.pages.flatMap((p) => p.questions).filter((q) => q.type === 'date' && q.id !== question.id).map((q) => (
                        <option key={q.id} value={q.id}>{q.label}</option>
                      ))}
                    </select>
                  </Field>
                )}
                {question.type === 'email' && (
                  <Field label="Only allow addresses ending in" optional help="Comma separated, like selu.edu, southeastern.edu">
                    <input
                      className="input"
                      value={(question.domains ?? []).join(', ')}
                      onChange={(e) => {
                        const domains = e.target.value.split(',').map((d) => d.trim().replace(/^@/, '')).filter(Boolean);
                        updateQuestion({ domains: domains.length ? domains : undefined });
                      }}
                    />
                  </Field>
                )}
                {(question.type === 'number' || question.type === 'currency') && (
                  <div className="builder-row-2">
                    <Field label="Lowest" optional>
                      <NumberInput value={question.min} onChange={(v) => updateQuestion({ min: v })} />
                    </Field>
                    <Field label="Highest" optional>
                      <NumberInput value={question.max} onChange={(v) => updateQuestion({ max: v })} />
                    </Field>
                  </div>
                )}
                {(question.type === 'text' || question.type === 'longText') && (
                  <div className="builder-row-2">
                    <Field label="Shortest answer" optional>
                      <NumberInput value={question.minLength} onChange={(v) => updateQuestion({ minLength: v })} />
                    </Field>
                    <Field label="Longest answer" optional>
                      <NumberInput value={question.maxLength} onChange={(v) => updateQuestion({ maxLength: v })} />
                    </Field>
                  </div>
                )}
                {question.type === 'list' && (
                  <Field label="Fields in each row" help={`One per line, as Label:type. Types: ${ROW_TYPES.join(', ')}.`}>
                    <textarea
                      className="input input-textarea"
                      rows={3}
                      value={(question.fields ?? []).map((f) => `${f.label}:${f.type}`).join('\n')}
                      onChange={(e) => {
                        const taken: string[] = [];
                        const fields = e.target.value.split('\n').filter((l) => l.trim()).map((line) => {
                          const [label, type] = line.split(':');
                          const id = idFromLabel(label, taken);
                          taken.push(id);
                          const t = (ROW_TYPES.includes((type ?? '').trim() as QuestionType) ? type.trim() : 'text') as QuestionType;
                          return { id, label: label.trim(), type: t };
                        });
                        updateQuestion({ fields });
                      }}
                    />
                  </Field>
                )}

                <div className="builder-checks">
                  <label className={`choice choice-compact ${question.required !== false ? 'is-checked' : ''}`}>
                    <input type="checkbox" checked={question.required !== false} onChange={(e) => updateQuestion({ required: e.target.checked ? undefined : false })} />
                    <span className="choice-mark choice-mark-box" aria-hidden="true" />
                    <span className="choice-text">Required</span>
                  </label>
                  <label className={`choice choice-compact ${question.reviewRequired ? 'is-checked' : ''}`}>
                    <input type="checkbox" checked={Boolean(question.reviewRequired)} onChange={(e) => updateQuestion({ reviewRequired: e.target.checked || undefined })} />
                    <span className="choice-mark choice-mark-box" aria-hidden="true" />
                    <span className="choice-text">Faculty must verify this answer</span>
                  </label>
                </div>

                <p className="help-inline">Saved as <code>{question.id}</code></p>
                <button
                  type="button"
                  className="btn-link btn-link-danger"
                  onClick={() => { updatePage({ questions: page.questions.filter((_, i) => i !== questionIndex) }); setQuestionIndex(0); }}
                  disabled={page.questions.length === 1}
                >
                  Delete question
                </button>
              </section>
            )}
          </div>

          {problems.length > 0 && (
            <div className="alert alert-danger" role="alert">
              <h2 className="alert-title">Fix these before saving</h2>
              <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
          {message && <p className="alert alert-success" role="status">{message}</p>}

          <div className="button-row builder-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setPreview((p) => !p)}>
              {preview ? 'Close preview' : 'Preview as a student'}
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create form' : 'Save changes'}
            </button>
          </div>

          {preview && (
            <section className="builder-preview">
              <h2 className="section-title">Preview</h2>
              <FormRunner key={JSON.stringify(schema).length} schema={schema} respondent="student" initialAnswers={{}} onSubmit={async () => undefined} submitLabel="Submit (preview only)" />
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Forms grouped as "Department: purpose", in a stable order. */
function groupForms(forms: FormMeta[]): [string, FormMeta[]][] {
  const groups = new Map<string, FormMeta[]>();
  for (const f of forms) {
    const key = `${f.department ?? 'Other'}: ${f.category ?? 'Other'}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function Field({ label, help, optional, children }: { label: string; help?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="question builder-field">
      <span className="question-label">
        {label}
        {optional && <span className="question-optional"> (optional)</span>}
      </span>
      {help && <p className="question-help">{help}</p>}
      {children}
    </div>
  );
}

function NumberInput({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <input
      className="input"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value.trim();
        onChange(v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
      }}
    />
  );
}
