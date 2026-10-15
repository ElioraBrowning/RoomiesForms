import { useFieldArray } from 'react-hook-form';
import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS405({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, control, getValues, formState } = useValidatedForm({ 
    defaultValues: defaultValues || { logs: [{ week: 1, description: '', hours: 0 }] } 
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: "logs" });

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
        submitText="Submit Activity Log"
      >
        <FormStep
          title="Weekly Activity Log"
          description="Log your weekly internship activities, responsibilities, and total hours worked."
        >
          {fields.map((field, index) => (
            <div key={field.id} className="dynamic-field-row" style={{ marginBottom: '1.25rem' }}>
              <div style={{ width: '80px' }}>
                <label>Week</label>
                <input type="number" {...register(`logs.${index}.week`)} disabled={isReadonly} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Description of Activities</label>
                <textarea
                  placeholder="Summarize activities performed this week..."
                  {...register(`logs.${index}.description`)}
                  disabled={isReadonly}
                  rows={2}
                ></textarea>
              </div>
              <div style={{ width: '110px' }}>
                <label>Hours</label>
                <input type="number" step="0.5" placeholder="0" {...register(`logs.${index}.hours`)} disabled={isReadonly} />
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
              onClick={() => append({ week: fields.length + 1, description: '', hours: 0 })}
              style={{ marginBottom: '1rem' }}
            >
              + Add Week
            </button>
          )}
        </FormStep>
      </FormWrapper>
    </form>
  );
}
