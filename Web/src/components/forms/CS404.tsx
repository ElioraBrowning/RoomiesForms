import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS404({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, getValues } = useForm({ defaultValues });


  const handleSaveDraft = (progress: number) => {
    if (onSaveDraft) onSaveDraft({ ...getValues(), __progress: progress });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormWrapper getValues={getValues} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit(onSubmit)} isReadonly={isReadonly}>
      <FormStep>
        <h3>Time & Wage Report</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
          Please enter your cumulative hours and wages for the semester.
        </p>
        <div className="form-group"><label>Student Name</label><input placeholder="e.g. Jane Doe" {...register('studentName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Employer Name</label><input placeholder="e.g. Acme Corp" {...register('employerName')} disabled={isReadonly} /></div>
        
        <div className="form-grid-2">
          <div className="form-group"><label>Total Hours for Semester</label><input type="number" placeholder="e.g. 300" {...register('totalHours')} disabled={isReadonly} /></div>
          <div className="form-group"><label>Total Wages (before deductions)</label><input type="number" step="0.01" placeholder="e.g. 4500.00" {...register('totalWages')} disabled={isReadonly} /></div>
          <div className="form-group"><label>Average Hours per Week</label><input type="number" step="0.1" placeholder="e.g. 20" {...register('hoursPerWeek')} disabled={isReadonly} /></div>
          <div className="form-group"><label>Hourly Wage</label><input type="number" step="0.01" placeholder="e.g. 15.00" {...register('hourlyWage')} disabled={isReadonly} /></div>
        </div>
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
