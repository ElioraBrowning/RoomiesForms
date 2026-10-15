import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS420({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, getValues, formState } = useValidatedForm({ defaultValues });

  const renderRadioField = (name: string, label: string, options: string[]) => (
    <div className="form-group" style={{ marginBottom: '1.75rem' }}>
      <label style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.75rem', display: 'block', color: 'var(--text-heading)' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingLeft: '0.5rem' }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'normal', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input 
              type="radio" 
              value={opt} 
              {...register(name)} 
              disabled={isReadonly} 
              style={{ margin: 0, width: '1.2rem', height: '1.2rem', cursor: isReadonly ? 'default' : 'pointer' }} 
            />
            <span style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );

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
        submitText="Submit Evaluation"
      >
        <FormStep
          title="Intern Information"
          description="The immediate supervisor should evaluate the student objectively and thoroughly."
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label>Student Full Name</label>
              <input placeholder="Student Full Name" {...register('studentName')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <input placeholder="e.g. Software Engineering Intern" {...register('jobTitle')} disabled={isReadonly} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Semester</label>
              <input placeholder="e.g. Fall 2026" {...register('semester')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>Employer / Company Name</label>
              <input placeholder="e.g. Acme Corp" {...register('employerName')} disabled={isReadonly} />
            </div>
          </div>
        </FormStep>

        <FormStep
          title="Performance Evaluation"
          description="Evaluate the student's performance, relations with team members, and adaptability."
        >
          {renderRadioField('relations', '1. Relations with Others', [
            'Exceptionally well accepted',
            'Works well with others',
            'Gets along satisfactorily',
            'Has some difficulty working with others',
            'Works very poorly with others',
          ])}

          {renderRadioField('attitude', '2. Attitude / Application to Work', [
            'Outstanding in enthusiasm',
            'Very interested and industrious',
            'Average in diligence and interest',
            'Somewhat indifferent',
            'Definitely not interested',
          ])}

          {renderRadioField('judgement', '3. Judgement', [
            'Exceptionally mature',
            'Above average in making decisions',
            'Usually makes the right decision',
            'Often uses poor judgement',
            'Consistently uses bad judgement',
          ])}

          {renderRadioField('dependability', '4. Dependability', [
            'Completely dependable',
            'Above average in dependability',
            'Usually dependable',
            'Sometimes neglectful or careless',
            'Unreliable',
          ])}

          {renderRadioField('abilityToLearn', '5. Ability to Learn', [
            'Learns very quickly',
            'Learns readily',
            'Average in learning',
            'Rather slow to learn',
            'Very slow to learn',
          ])}

          {renderRadioField('qualityOfWork', '6. Quality of Work', [
            'Excellent',
            'Very good',
            'Average',
            'Below average',
            'Very poor',
          ])}
        </FormStep>

        <FormStep
          title="Attendance & Overall Rating"
          description="Evaluate regularity of attendance, punctuality, and overall internship performance."
        >
          <div className="form-grid-2">
            {renderRadioField('attendance', '7. Attendance', ['Regular', 'Irregular'])}
            {renderRadioField('punctuality', '8. Punctuality', ['Regular', 'Irregular'])}
          </div>

          {renderRadioField('overall', '9. Overall Performance', [
            'Outstanding',
            'Very Good',
            'Average',
            'Marginal',
            'Unsatisfactory',
          ])}
        </FormStep>

        <FormStep
          title="Remarks & Signatures"
          description="Provide final supervisor remarks and sign electronically."
        >
          <div className="form-group">
            <label>Supervisor Remarks</label>
            <textarea
              placeholder="Provide comments regarding student strengths and areas for improvement..."
              {...register('remarks')}
              disabled={isReadonly}
              rows={3}
            ></textarea>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: isReadonly ? 'default' : 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
              <input
                type="checkbox"
                {...register('discussedWithStudent')}
                disabled={isReadonly}
                style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }}
              /> 
              <span>This report has been discussed with the student</span>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: isReadonly ? 'default' : 'pointer', color: 'var(--text-main)', fontWeight: 600 }}>
              <input
                type="checkbox"
                {...register('supervisorSignature')}
                disabled={isReadonly}
                style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }}
              /> 
              <span>Supervisor Signature (Electronic) - I certify this evaluation is accurate and objective.</span>
            </label>
          </div>
        </FormStep>
      </FormWrapper>
    </form>
  );
}
