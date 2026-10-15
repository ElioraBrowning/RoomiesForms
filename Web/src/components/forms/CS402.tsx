import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS402({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
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
        submitText="Submit Agreement"
      >
        <FormStep
          title="Employer Agreement"
          description="This section should be completed by the student and reviewed with the employer."
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label>Student Full Name</label>
              <input placeholder="Student's Full Name" {...register('studentName')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>Company Name</label>
              <input placeholder="e.g. Acme Corp" {...register('companyName')} disabled={isReadonly} />
            </div>
          </div>
          
          <div className="form-grid-3">
            <div className="form-group">
              <label>Hours Per Week</label>
              <input type="number" placeholder="e.g. 20" {...register('hoursPerWeek')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" {...register('startDate')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" {...register('endDate')} disabled={isReadonly} />
            </div>
          </div>
        </FormStep>
        
        <FormStep
          title="Conditions of Agreement"
          description="Please review and acknowledge the internship terms and conditions."
        >
          <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.7' }}>
            <li>The employer must provide workers compensation coverage for the student intern.</li>
            <li>The student is expected to be employed 20 hours per week for three hours of credit during fall/spring, or 40 hours per week for summer.</li>
            <li>All employment transfers, withdrawals, or dismissals shall be made jointly by the Department Head, student, and employer.</li>
            <li>Students must submit all required evaluations, logs, and summaries by 4:00 p.m. on the last class day of the semester.</li>
          </ol>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: isReadonly ? 'default' : 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                {...register('agreed')}
                disabled={isReadonly}
                style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }}
              /> 
              <span>I agree to the above conditions and understand my responsibilities.</span>
            </label>
          </div>
        </FormStep>
      </FormWrapper>
    </form>
  );
}
