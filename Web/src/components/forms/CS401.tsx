import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS401({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <div className="form-section">
        <h3>Student Information</h3>
        <div className="form-group"><label>Name</label><input {...register('name')} disabled={isReadonly} /></div>
        <div className="form-group"><label>W#</label><input {...register('wNumber')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Email</label><input type="email" {...register('email')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Cell Phone</label><input {...register('cellPhone')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Present Address</label><textarea {...register('presentAddress')} disabled={isReadonly}></textarea></div>
        <div className="form-group"><label>Permanent Address</label><textarea {...register('permanentAddress')} disabled={isReadonly}></textarea></div>
        <div className="form-group"><label>Degree & Concentration</label><input {...register('degree')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Major GPA</label><input type="number" step="0.01" {...register('gpa')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Expected Graduation Date</label><input type="date" {...register('graduationDate')} disabled={isReadonly} /></div>
      </div>

      <div className="form-section">
        <h3>Employer Information</h3>
        <div className="form-group"><label>Employer's Name</label><input {...register('employerName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Employer's Address</label><textarea {...register('employerAddress')} disabled={isReadonly}></textarea></div>
        <div className="form-group"><label>Immediate Supervisor Name & Title</label><input {...register('supervisorName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Supervisor's Email</label><input type="email" {...register('supervisorEmail')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Supervisor's Phone</label><input {...register('supervisorPhone')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Proposed Start Date</label><input type="date" {...register('startDate')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Proposed End Date</label><input type="date" {...register('endDate')} disabled={isReadonly} /></div>
        <div className="form-group">
          <label>Employment Type</label>
          <select {...register('employmentType')} disabled={isReadonly}>
            <option value="Part-Time">Part-Time</option>
            <option value="Full-Time">Full-Time</option>
          </select>
        </div>
        <div className="form-group"><label>Job Title</label><input {...register('jobTitle')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Job Responsibilities</label><textarea {...register('jobResponsibilities')} disabled={isReadonly}></textarea></div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Application</button>}
    </form>
  );
}
