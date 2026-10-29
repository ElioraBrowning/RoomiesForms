import { useId } from 'react';
import type { Answers, FieldErrors, FormQuestion } from './types';
import { blankListRow, isRequired } from './types';

interface QuestionFieldProps {
  question: FormQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  errors?: FieldErrors;
  scope: Answers;
  disabled?: boolean;
  autoFocus?: boolean;
  inList?: 'single' | 'multi';
}

export function QuestionField(props: QuestionFieldProps) {
  const { question: q, error, disabled } = props;
  const id = useId();
  const helpId = q.help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  if (q.type === 'choice' || q.type === 'multiChoice' || q.type === 'confirm' || q.type === 'list') {
    return (
      <fieldset className={`question ${error ? 'has-error' : ''}`} aria-describedby={describedBy} disabled={disabled}>
        <legend className="question-label">
          {q.label}
          {!isRequired(q) && <span className="question-optional"> (optional)</span>}
        </legend>
        {q.help && <p className="question-help" id={helpId}>{q.help}</p>}
        {q.type === 'choice' && <ChoiceInput {...props} />}
        {q.type === 'multiChoice' && <MultiChoiceInput {...props} />}
        {q.type === 'confirm' && <ConfirmInput {...props} />}
        {q.type === 'list' && <ListInput {...props} />}
        {error && <p className="question-error" id={errorId} role="alert">{error}</p>}
      </fieldset>
    );
  }

  return (
    <div className={`question ${error ? 'has-error' : ''}`}>
      <label className={props.inList === 'single' ? 'visually-hidden' : 'question-label'} htmlFor={id}>
        {q.label}
        {!isRequired(q) && <span className="question-optional"> (optional)</span>}
      </label>
      {q.help && <p className="question-help" id={helpId}>{q.help}</p>}
      <TextLikeInput {...props} inputId={id} describedBy={describedBy} />
      {error && <p className="question-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}

function TextLikeInput({
  question: q,
  value,
  onChange,
  onBlur,
  error,
  scope,
  disabled,
  autoFocus,
  inputId,
  describedBy,
  inList,
}: QuestionFieldProps & { inputId: string; describedBy?: string }) {
  const str = value === undefined || value === null ? '' : String(value);
  const common = {
    id: inputId,
    name: q.id,
    disabled,
    autoFocus,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': isRequired(q) || undefined,
    placeholder: q.placeholder,
    onBlur,
  };

  switch (q.type) {
    case 'longText':
    case 'address':
      return (
        <>
          <textarea
            {...common}
            className="input input-textarea"
            rows={inList ? 1 : q.type === 'address' ? 2 : 3}
            maxLength={q.maxLength ?? (q.type === 'address' ? 300 : 4000)}
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          {q.type === 'longText' && (
            <CharacterCount length={str.trim().length} min={q.minLength} max={q.maxLength ?? 4000} />
          )}
        </>
      );

    case 'email':
      return (
        <input
          {...common}
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'phone':
      return (
        <input
          {...common}
          className="input input-short"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const formatted = formatPhone(str);
            if (formatted !== str) onChange(formatted);
            onBlur?.();
          }}
        />
      );

    case 'signature':
      return (
        <>
          {q.statement && <p className="signature-statement">{q.statement}</p>}
          <input
            {...common}
            className="input input-signature"
            type="text"
            autoComplete="name"
            spellCheck={false}
            maxLength={100}
            value={str}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="signature-note">Typing your name here is your electronic signature.</p>
        </>
      );

    case 'wNumber':
      return (
        <input
          {...common}
          className="input input-short"
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={9}
          value={str}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, ''))}
        />
      );

    case 'number':
      return (
        <input
          {...common}
          className="input input-short"
          type="text"
          inputMode={q.step !== undefined && q.step < 1 ? 'decimal' : 'numeric'}
          value={str}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
        />
      );

    case 'currency':
      return (
        <div className="input-affix">
          <span className="input-affix-symbol" aria-hidden="true">$</span>
          <input
            {...common}
            className="input input-short"
            type="text"
            inputMode="decimal"
            value={str}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
            onBlur={() => {
              const n = Number(str.replace(/,/g, ''));
              if (str.trim() !== '' && Number.isFinite(n)) onChange(n.toFixed(2));
              onBlur?.();
            }}
          />
        </div>
      );

    case 'date': {
      const after = q.after ? scope[q.after] : undefined;
      const min = typeof after === 'string' && after ? nextDay(after) : '2000-01-01';
      return (
        <input
          {...common}
          className="input input-short input-date"
          type="date"
          min={min}
          max="2100-12-31"
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }

    default:
      return (
        <input
          {...common}
          className="input"
          type="text"
          maxLength={q.maxLength ?? 200}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function ChoiceInput({ question: q, value, onChange, onBlur, error, disabled }: QuestionFieldProps) {
  const name = useId();
  return (
    <div className={`choice-list ${q.options && q.options.length <= 2 ? 'choice-list-inline' : ''}`} role="radiogroup">
      {(q.options ?? []).map((opt) => {
        const checked = value === opt;
        return (
          <label key={opt} className={`choice ${checked ? 'is-checked' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={checked}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              onChange={() => onChange(opt)}
              onBlur={onBlur}
            />
            <span className="choice-mark" aria-hidden="true" />
            <span className="choice-text">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}

function MultiChoiceInput({ question: q, value, onChange, onBlur, error, disabled }: QuestionFieldProps) {
  const picked = Array.isArray(value) ? (value as string[]) : [];
  const atMax = q.maxSelected !== undefined && picked.length >= q.maxSelected;

  const toggle = (opt: string) => {
    const next = picked.includes(opt) ? picked.filter((p) => p !== opt) : [...picked, opt];
    onChange((q.options ?? []).filter((o) => next.includes(o)));
  };

  return (
    <>
      <p className="question-help">
        {q.maxSelected === 1
          ? 'Pick one.'
          : q.maxSelected
            ? `Pick up to ${q.maxSelected}.`
            : 'Pick all that apply.'}
      </p>
      <div className="choice-list">
        {(q.options ?? []).map((opt) => {
          const checked = picked.includes(opt);
          return (
            <label key={opt} className={`choice ${checked ? 'is-checked' : ''}`}>
              <input
                type="checkbox"
                value={opt}
                checked={checked}
                disabled={disabled || (!checked && atMax)}
                aria-invalid={error ? true : undefined}
                onChange={() => toggle(opt)}
                onBlur={onBlur}
              />
              <span className="choice-mark choice-mark-box" aria-hidden="true" />
              <span className="choice-text">{opt}</span>
            </label>
          );
        })}
      </div>
    </>
  );
}

function ConfirmInput({ question: q, value, onChange, onBlur, error, disabled }: QuestionFieldProps) {
  const checked = value === true;
  return (
    <label className={`choice choice-confirm ${checked ? 'is-checked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
      />
      <span className="choice-mark choice-mark-box" aria-hidden="true" />
      <span className="choice-text">{q.statement ?? q.label}</span>
    </label>
  );
}

function ListInput({ question: q, value, onChange, errors, disabled }: QuestionFieldProps) {
  const rows = Array.isArray(value) ? (value as Answers[]) : [];
  const fields = q.fields ?? [];
  const canAdd = !disabled && (q.maxItems === undefined || rows.length < q.maxItems);
  const canRemove = !disabled && rows.length > (q.minItems ?? 0);

  const blankRow = () => blankListRow(q, rows.length);

  const updateRow = (index: number, fieldId: string, fieldValue: unknown) => {
    const next = rows.map((r, i) => (i === index ? { ...r, [fieldId]: fieldValue } : r));
    onChange(next);
  };

  return (
    <div className="list-input">
      {rows.map((row, index) => (
        <div className="list-row" key={index}>
          <div className="list-row-head">
            <span className="list-row-title">
              {q.itemLabel ?? 'Item'} {index + 1}
            </span>
            {canRemove && (
              <button
                type="button"
                className="btn-link btn-link-danger"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            )}
          </div>
          <div className={`list-row-fields list-row-fields-${fields.length}`}>
            {fields.map((f) => (
              <QuestionField
                key={f.id}
                question={f}
                value={row[f.id]}
                scope={row}
                disabled={disabled}
                error={errors?.[`${q.id}.${index}.${f.id}`]}
                inList={fields.length === 1 ? 'single' : 'multi'}
                onChange={(v) => updateRow(index, f.id, v)}
              />
            ))}
          </div>
        </div>
      ))}
      {canAdd && (
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onChange([...rows, blankRow()])}>
          + {q.addLabel ?? 'Add another'}
        </button>
      )}
    </div>
  );
}

function CharacterCount({ length, min, max }: { length: number; min?: number; max: number }) {
  const short = min !== undefined && length > 0 && length < min;
  return (
    <p className={`char-count ${short ? 'is-short' : ''}`} aria-live="polite">
      {short ? `${min - length} more characters needed` : `${length} / ${max}`}
    </p>
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function nextDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '2000-01-01';
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
