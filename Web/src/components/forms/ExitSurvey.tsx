import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function ExitSurvey({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, getValues, formState } = useValidatedForm({ defaultValues });

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
        submitText="Submit Survey"
      >
        <FormStep
          title="Preparation Level"
          description="The purpose of this survey is to help the department evaluate how effectively prior coursework prepared you. Please answer based on coursework preparation only."
        >
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '1rem', display: 'block', color: 'var(--text-heading)' }}>
              1. Preparation Level: How well prepared did you feel to undertake the project assigned in this course?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingLeft: '0.5rem' }}>
              {[
                '(1) Not prepared at all',
                '(2) Somewhat prepared',
                '(3) Adequately prepared',
                '(4) More than adequately prepared',
                '(5) Extremely well prepared',
              ].map(opt => (
                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'normal', cursor: isReadonly ? 'default' : 'pointer' }}>
                  <input 
                    type="radio" 
                    value={opt} 
                    {...register('preparationLevel')} 
                    disabled={isReadonly}
                    style={{ margin: 0, width: '1.2rem', height: '1.2rem', cursor: isReadonly ? 'default' : 'pointer' }} 
                  />
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </FormStep>

        <FormStep
          title="Areas Needing Improvement"
          description="In what areas did you feel less than adequately prepared (concepts, tools, programming techniques, or skills that prior coursework did not cover)?"
        >
          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>
              2. Areas Needing Improvement
            </label>
            <textarea
              placeholder="Describe concepts, technologies, or subjects where you needed more preparation..."
              {...register('improvementAreas')}
              disabled={isReadonly}
              rows={4}
              style={{ marginTop: '0.5rem' }}
            ></textarea>
          </div>
        </FormStep>

        <FormStep
          title="Areas of Strength"
          description="In what areas did you feel adequately or more than adequately prepared?"
        >
          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>
              3. Areas of Strength
            </label>
            <textarea
              placeholder="Describe concepts or tools where you felt well prepared..."
              {...register('strengthAreas')}
              disabled={isReadonly}
              rows={4}
              style={{ marginTop: '0.5rem' }}
            ></textarea>
          </div>
        </FormStep>

        <FormStep
          title="Additional Comments"
          description="Please share any other feedback or suggestions that could help improve the Computer Science curriculum and program."
        >
          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>
              4. Additional Suggestions
            </label>
            <textarea
              placeholder="Any other comments or constructive suggestions..."
              {...register('additionalComments')}
              disabled={isReadonly}
              rows={4}
              style={{ marginTop: '0.5rem' }}
            ></textarea>
          </div>
        </FormStep>
      </FormWrapper>
    </form>
  );
}
