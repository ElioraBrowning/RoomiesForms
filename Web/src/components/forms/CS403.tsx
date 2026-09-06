import { useForm, useFieldArray } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS403({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit, control } = useForm({ 
    defaultValues: defaultValues || { objectives: [{ text: '', rating: '' }] } 
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "objectives" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3>Measurable Learning Objectives</h3>
      <p style={{ fontSize: '0.9rem', color: '#555' }}>
        List specific objectives describing what you plan to accomplish. 
        At the end of the semester, your supervisor will evaluate accomplishment from 0% to 100%.
      </p>

      {fields.map((field, index) => (
        <div key={field.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label>Objective {index + 1}</label>
            <textarea {...register(`objectives.${index}.text`)} disabled={isReadonly} style={{ width: '100%' }}></textarea>
          </div>
          <div style={{ width: '100px' }}>
            <label>Supervisor %</label>
            <input type="number" min="0" max="100" {...register(`objectives.${index}.rating`)} disabled={isReadonly} />
          </div>
          {!isReadonly && <button type="button" onClick={() => remove(index)} style={{ marginTop: '1.5rem' }}>Remove</button>}
        </div>
      ))}
      
      {!isReadonly && (
        <button type="button" className="btn" onClick={() => append({ text: '', rating: '' })} style={{ marginBottom: '1rem', backgroundColor: '#6c757d' }}>
          + Add Objective
        </button>
      )}

      <hr style={{ margin: '1rem 0' }} />
      <div className="form-group">
        <label><input type="checkbox" {...register('studentSignature')} disabled={isReadonly} required /> Student Signature (Electronic)</label>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Objectives</button>}
    </form>
  );
}
