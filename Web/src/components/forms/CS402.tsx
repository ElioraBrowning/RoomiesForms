import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS402({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3>Employer Agreement</h3>
      <div className="form-group"><label>Student Name</label><input {...register('studentName')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Company Name</label><input {...register('companyName')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Hours Per Week</label><input type="number" {...register('hoursPerWeek')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Start Date</label><input type="date" {...register('startDate')} disabled={isReadonly} /></div>
      <div className="form-group"><label>End Date</label><input type="date" {...register('endDate')} disabled={isReadonly} /></div>
      
      <div className="conditions" style={{ backgroundColor: '#f9f9f9', padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
        <h4>Conditions of Agreement</h4>
        <ol>
          <li>The employer must provide workers compensation coverage for the student intern.</li>
          <li>The student is expected to be employed 20 hours per week for three hours of credit during fall/spring, or 40 hours per week for summer.</li>
          <li>All employment transfers, withdrawals, or dismissals shall be made jointly by the Department Head, student, and employer.</li>
          <li>Students must submit all required evaluations, logs, and summaries by 4:00 p.m. on the last class day of the semester.</li>
        </ol>
      </div>

      <div className="form-group">
        <label><input type="checkbox" {...register('agreed')} disabled={isReadonly} required /> I agree to the above conditions.</label>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Agreement</button>}
    </form>
  );
}
