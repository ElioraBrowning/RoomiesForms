import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function ExitSurvey({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, getValues } = useForm({ defaultValues });


  const handleSaveDraft = (progress: number) => {
    if (onSaveDraft) onSaveDraft({ ...getValues(), __progress: progress });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormWrapper getValues={getValues} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit(onSubmit)} isReadonly={isReadonly}>
      <h3>Computer Science Program Feedback Survey</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#555' }}>
        The purpose of this survey is to help the department evaluate how effectively your prior computer science coursework prepared you. Your feedback is critical. Please answer honestly based on your academic preparation from coursework only. Do not include knowledge or skills gained through work experience.
      </p>

      <FormStep title="Preparation Level">
        <label style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', display: 'block', color: 'var(--text-heading)' }}>
          1. Preparation Level: How well prepared did you feel to undertake the project assigned in this course?
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
          {['(1) Not prepared at all', '(2) Somewhat prepared', '(3) Adequately prepared', '(4) More than adequately prepared', '(5) Extremely well prepared'].map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'normal', cursor: isReadonly ? 'default' : 'pointer' }}>
              <input 
                type="radio" 
                value={opt} 
                {...register('preparationLevel')} 
                disabled={isReadonly}
                style={{ margin: 0, width: '1.2rem', height: '1.2rem', cursor: isReadonly ? 'default' : 'pointer' }} 
              />
              <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{opt}</span>
            </label>
          ))}
        </div>
      </FormStep>

      <FormStep title="Areas Needing Improvement">
        <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>2. Areas Needing Improvement: In what areas did you feel less than adequately prepared? (e.g., concepts, tools, programming techniques, or skills that prior coursework did not cover or did not prepare you to learn easily.)</label>
        <textarea {...register('improvementAreas')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </FormStep>

      <FormStep title="Areas of Strength">
        <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>3. Areas of Strength: In what areas did you feel adequately or more than adequately prepared?</label>
        <textarea {...register('strengthAreas')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </FormStep>

      <FormStep title="Additional Comments">
        <label style={{ fontWeight: 'bold', color: 'var(--text-heading)' }}>4. Additional Comments: Please share any other feedback or suggestions that could help improve the Computer Science program.</label>
        <textarea {...register('additionalComments')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </FormStep>

      
          </FormWrapper>
    </form>
  );
}
