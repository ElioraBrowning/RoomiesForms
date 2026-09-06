import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS404({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <div className="form-section">
        <h3>Time & Wage Report</h3>
        <div className="form-group"><label>Student Name</label><input {...register('studentName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Employer Name</label><input {...register('employerName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Total Hours for Semester</label><input type="number" {...register('totalHours')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Total Wages (before deductions)</label><input type="number" step="0.01" {...register('totalWages')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Average Hours per Week</label><input type="number" step="0.1" {...register('hoursPerWeek')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Hourly Wage</label><input type="number" step="0.01" {...register('hourlyWage')} disabled={isReadonly} /></div>
      </div>

      <div className="form-section">
        <h3>Signatures</h3>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('studentSignature')} disabled={isReadonly} required style={{ width: '1.2rem', height: '1.2rem', margin: 0 }} /> 
            Student Signature (Electronic)
          </label>
        </div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Report</button>}
    </form>
  );
}
