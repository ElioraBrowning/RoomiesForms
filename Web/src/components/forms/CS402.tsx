import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS402({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <div className="form-section">
        <h3>Employer Agreement</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
          This section should be completed by the student and reviewed by the employer.
        </p>
        <div className="form-group"><label>Student Name</label><input placeholder="Student's Full Name" {...register('studentName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Company Name</label><input placeholder="e.g. Acme Corp" {...register('companyName')} disabled={isReadonly} /></div>
        
        <div className="form-grid-3">
          <div className="form-group"><label>Hours Per Week</label><input type="number" placeholder="e.g. 20" {...register('hoursPerWeek')} disabled={isReadonly} /></div>
          <div className="form-group"><label>Start Date</label><input type="date" {...register('startDate')} disabled={isReadonly} /></div>
          <div className="form-group"><label>End Date</label><input type="date" {...register('endDate')} disabled={isReadonly} /></div>
        </div>
      </div>
      
      <div className="form-section">
        <h3 style={{ marginBottom: '1rem' }}>Conditions of Agreement</h3>
        <ol style={{ marginLeft: '1.5rem', marginBottom: '1.5rem' }}>
          <li>The employer must provide workers compensation coverage for the student intern.</li>
          <li>The student is expected to be employed 20 hours per week for three hours of credit during fall/spring, or 40 hours per week for summer.</li>
          <li>All employment transfers, withdrawals, or dismissals shall be made jointly by the Department Head, student, and employer.</li>
          <li>Students must submit all required evaluations, logs, and summaries by 4:00 p.m. on the last class day of the semester.</li>
        </ol>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('agreed')} disabled={isReadonly} required style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }} /> 
            I agree to the above conditions.
          </label>
        </div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Agreement</button>}
    </form>
  );
}
