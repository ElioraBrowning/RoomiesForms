import { useForm, useFieldArray } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS405({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit, control } = useForm({ 
    defaultValues: defaultValues || { logs: [{ week: 1, description: '', hours: 0 }] } 
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "logs" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <div className="form-section">
        <h3>Weekly Activity Log</h3>
        
        {fields.map((field, index) => (
          <div key={field.id} className="dynamic-field-row">
            <div style={{ width: '80px' }}>
              <label>Week</label>
              <input type="number" {...register(`logs.${index}.week`)} disabled={isReadonly} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Description of Activities</label>
              <textarea {...register(`logs.${index}.description`)} disabled={isReadonly} rows={3}></textarea>
            </div>
            <div style={{ width: '100px' }}>
              <label>Hours</label>
              <input type="number" {...register(`logs.${index}.hours`)} disabled={isReadonly} />
            </div>
            {!isReadonly && <button type="button" className="btn btn-secondary" onClick={() => remove(index)} style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}>Remove</button>}
          </div>
        ))}
        
        {!isReadonly && (
          <button type="button" className="btn btn-secondary" onClick={() => append({ week: fields.length + 1, description: '', hours: 0 })} style={{ marginBottom: '1rem' }}>
            + Add Week
          </button>
        )}
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Activity Log</button>}
    </form>
  );
}
