import { useFieldArray } from 'react-hook-form';
import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS403({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, control, getValues, formState } = useValidatedForm({ 
    defaultValues: defaultValues || { objectives: [{ text: '', rating: '' }] } 
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "objectives" });

  const handleSaveDraft = (progress: number) => {
    if (onSaveDraft) onSaveDraft({ ...getValues(), __progress: progress });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormWrapper
        getValues={getValues}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit(onSubmit)}
        isReadonly={isReadonly}
        errors={formState.errors}
        submitText="Submit Objectives"
      >
        <FormStep
          title="Measurable Learning Objectives"
          description="List specific objectives describing what you plan to accomplish. At the end of the semester, your supervisor will evaluate accomplishment from 0% to 100%."
        >
          {fields.map((field, index) => (
            <div key={field.id} className="dynamic-field-row" style={{ marginBottom: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <label>Objective {index + 1}</label>
                <textarea
                  placeholder="Describe your learning objective..."
                  {...register(`objectives.${index}.text`)}
                  disabled={isReadonly}
                  rows={2}
                ></textarea>
              </div>
              <div style={{ width: '130px' }}>
                <label>Supervisor %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0 - 100"
                  {...register(`objectives.${index}.rating`)}
                  disabled={isReadonly}
                />
              </div>
              {!isReadonly && fields.length > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => remove(index)}
                  style={{ marginTop: '1.5rem', alignSelf: 'flex-start' }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          {!isReadonly && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => append({ text: '', rating: '' })}
              style={{ marginBottom: '1rem' }}
            >
              + Add Objective
            </button>
          )}
        </FormStep>

        <FormStep
          title="Student Signature"
          description="Confirm your measurable learning objectives for the semester."
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: isReadonly ? 'default' : 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                {...register('studentSignature')}
                disabled={isReadonly}
                style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }}
              /> 
              <span>Student Signature (Electronic) - I confirm these measurable learning objectives.</span>
            </label>
          </div>
        </FormStep>
      </FormWrapper>
    </form>
  );
}
