import { useForm, useFieldArray } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS403({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, control, getValues } = useForm({ 
    defaultValues: defaultValues || { objectives: [{ text: '', rating: '' }] } 
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "objectives" });


  const handleSaveDraft = (progress: number) => {
    if (onSaveDraft) onSaveDraft({ ...getValues(), __progress: progress });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormWrapper getValues={getValues} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit(onSubmit)} isReadonly={isReadonly}>
      <FormStep>
        <h3>Measurable Learning Objectives</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
          List specific objectives describing what you plan to accomplish. 
          At the end of the semester, your supervisor will evaluate accomplishment from 0% to 100%.
        </p>

        {fields.map((field, index) => (
          <div key={field.id} className="dynamic-field-row">
            <div style={{ flex: 1 }}>
              <label>Objective {index + 1}</label>
              <textarea {...register(`objectives.${index}.text`)} disabled={isReadonly}></textarea>
            </div>
            <div style={{ width: '120px' }}>
              <label>Supervisor %</label>
              <input type="number" min="0" max="100" {...register(`objectives.${index}.rating`)} disabled={isReadonly} />
            </div>
            {!isReadonly && <button type="button" className="btn btn-secondary" onClick={() => remove(index)} style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}>Remove</button>}
          </div>
        ))}
        
        {!isReadonly && (
          <button type="button" className="btn btn-secondary" onClick={() => append({ text: '', rating: '' })} style={{ marginBottom: '1rem' }}>
            + Add Objective
          </button>
        )}
      </FormStep>

      <FormStep>
        <h3>Signatures</h3>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('studentSignature')} disabled={isReadonly} required style={{ width: '1.2rem', height: '1.2rem', margin: 0 }} /> 
            Student Signature (Electronic)
          </label>
        </div>
      </FormStep>

      
          </FormWrapper>
    </form>
  );
}
