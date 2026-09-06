import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS401({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <div className="form-section">
        <h3>Student Information</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
          Please provide your personal and academic details.
        </p>
        <div className="form-group">
          <label>Full Name</label>
          <input placeholder="e.g. Jane Doe" {...register('name')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>W# (University ID)</label>
          <input placeholder="W0000000" {...register('wNumber')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>University Email</label>
          <input type="email" placeholder="jane.doe@selu.edu" {...register('email')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Cell Phone</label>
          <input type="tel" placeholder="(555) 555-5555" {...register('cellPhone')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Present Address</label>
          <textarea placeholder="Where you currently reside..." {...register('presentAddress')} disabled={isReadonly} rows={2}></textarea>
        </div>
        <div className="form-group">
          <label>Permanent Address</label>
          <textarea placeholder="Your permanent home address..." {...register('permanentAddress')} disabled={isReadonly} rows={2}></textarea>
        </div>
        <div className="form-group">
          <label>Degree & Concentration</label>
          <input placeholder="e.g. B.S. in Computer Science, Data Science Concentration" {...register('degree')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Major GPA</label>
          <input type="number" step="0.01" placeholder="3.5" {...register('gpa')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Expected Graduation Date</label>
          <input type="date" {...register('graduationDate')} disabled={isReadonly} />
        </div>
      </div>

      <div className="form-section">
        <h3>Employer Information</h3>
        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>
          Please provide details about the company where you will be interning.
        </p>
        <div className="form-group">
          <label>Employer's Name</label>
          <input placeholder="e.g. Acme Corp" {...register('employerName')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Employer's Address</label>
          <textarea placeholder="Full address of the company or primary office..." {...register('employerAddress')} disabled={isReadonly} rows={2}></textarea>
        </div>
        <div className="form-group">
          <label>Immediate Supervisor Name & Title</label>
          <input placeholder="e.g. John Smith, Senior Developer" {...register('supervisorName')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Supervisor's Email</label>
          <input type="email" placeholder="john.smith@acmecorp.com" {...register('supervisorEmail')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Supervisor's Phone</label>
          <input type="tel" placeholder="(555) 555-5555" {...register('supervisorPhone')} disabled={isReadonly} />
        </div>
        
        <div className="form-grid-2">
          <div className="form-group">
            <label>Proposed Start Date</label>
            <input type="date" {...register('startDate')} disabled={isReadonly} />
          </div>
          <div className="form-group">
            <label>Proposed End Date</label>
            <input type="date" {...register('endDate')} disabled={isReadonly} />
          </div>
        </div>

        <div className="form-group">
          <label>Employment Type</label>
          <select {...register('employmentType')} disabled={isReadonly}>
            <option value="">-- Select Type --</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Full-Time">Full-Time</option>
          </select>
        </div>
        <div className="form-group">
          <label>Job Title</label>
          <input placeholder="e.g. Software Engineering Intern" {...register('jobTitle')} disabled={isReadonly} />
        </div>
        <div className="form-group">
          <label>Job Responsibilities</label>
          <textarea placeholder="Briefly describe what you will be doing..." {...register('jobResponsibilities')} disabled={isReadonly} rows={3}></textarea>
          <span className="help-text">List the primary tasks and technologies you'll be working with.</span>
        </div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Application</button>}
    </form>
  );
}
