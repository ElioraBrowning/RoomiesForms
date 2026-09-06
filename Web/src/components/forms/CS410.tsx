import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS410({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3>Student's Evaluation of Internship Employer</h3>
      
      <div className="form-section">
        <h3>Employer Details</h3>
        <div className="form-group"><label>Employer's Name</label><input {...register('employerName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Job Title</label><input {...register('jobTitle')} disabled={isReadonly} /></div>
      </div>

      <div className="form-section">
        <h3>Evaluation</h3>
        <div className="form-group">
          <label>Overall Rating of Employer</label>
          <select {...register('ratingEmployer')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="Excellent">Excellent</option><option value="Good">Good</option>
            <option value="Fair">Fair</option><option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Overall Rating of Work Experience</label>
          <select {...register('ratingExperience')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="Excellent">Excellent</option><option value="Good">Good</option>
            <option value="Fair">Fair</option><option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>How much of your work experience was related to your studies in CS?</label>
          <select {...register('relatedAmount')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="100%">100%</option><option value="75%">75%</option>
            <option value="50%">50%</option><option value="25%">25%</option>
          </select>
        </div>
        <div className="form-group">
          <label>Rating of learning as a result of your internship experience</label>
          <select {...register('ratingLearning')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="Excellent">Excellent</option><option value="Good">Good</option>
            <option value="Fair">Fair</option><option value="Poor">Poor</option>
          </select>
        </div>
        <div className="form-group">
          <label>Would you repeat your work experience with the same employer?</label>
          <select {...register('repeatExperience')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="Yes">Yes</option><option value="No">No</option>
          </select>
        </div>
        <div className="form-group">
          <label>If not, explain why:</label>
          <textarea {...register('repeatExplain')} disabled={isReadonly}></textarea>
        </div>
        <div className="form-group">
          <label>Would you recommend your employer to other internship students?</label>
          <select {...register('recommendEmployer')} disabled={isReadonly}>
            <option value="">--Select--</option>
            <option value="Yes">Yes</option><option value="No">No</option>
          </select>
        </div>
        <div className="form-group">
          <label>If not, explain why:</label>
          <textarea {...register('recommendExplain')} disabled={isReadonly}></textarea>
        </div>
      </div>
      
      <div className="form-section">
        <h3>Feedback</h3>
        <div className="form-group">
          <label>Based upon your work experience, what additional instructional content or revisions should be included within the Curriculum?</label>
          <textarea {...register('curriculumRevisions')} disabled={isReadonly} rows={3}></textarea>
        </div>
        <div className="form-group">
          <label>Any additional comments?</label>
          <textarea {...register('additionalComments')} disabled={isReadonly} rows={3}></textarea>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('studentSignature')} disabled={isReadonly} required style={{ width: '1.2rem', height: '1.2rem', margin: 0 }} /> 
            Student Signature (Electronic)
          </label>
        </div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Evaluation</button>}
    </form>
  );
}
