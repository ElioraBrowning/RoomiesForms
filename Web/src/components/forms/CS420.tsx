import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS420({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  const renderRadioGroup = (name: string, label: string, options: string[]) => (
    <div className="form-section">
      <label style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', display: 'block', color: '#005a3c' }}>
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'normal', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input 
              type="radio" 
              value={opt} 
              {...register(name)} 
              disabled={isReadonly} 
              style={{ margin: 0, width: '1.2rem', height: '1.2rem', cursor: isReadonly ? 'default' : 'pointer' }} 
            />
            <span style={{ fontSize: '1rem' }}>{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>Employer's Evaluation of the Computer Science Internship Student</h2>
      
      <div className="form-section">
        <h3>Intern Information</h3>
        <div className="form-group"><label>Student Name</label><input {...register('studentName')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Job Title</label><input {...register('jobTitle')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Semester</label><input {...register('semester')} disabled={isReadonly} /></div>
        <div className="form-group"><label>Employer</label><input {...register('employerName')} disabled={isReadonly} /></div>
        
        <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#555' }}>
          <strong>Instructions:</strong> The immediate supervisor will evaluate the student objectively, comparing him/her with other students of comparable academic level or other personnel assigned the same or similarly classified jobs.
        </p>
      </div>

      {renderRadioGroup('relations', '1. Relations with Others', ['Exceptionally well accepted', 'Works well with others', 'Gets along satisfactorily', 'Has some difficulty working with others', 'Works very poorly with others'])}
      {renderRadioGroup('attitude', '2. Attitude / Application to Work', ['Outstanding in enthusiasm', 'Very interested and industrious', 'Average in diligence and interest', 'Somewhat indifferent', 'Definitely not interested'])}
      {renderRadioGroup('judgement', '3. Judgement', ['Exceptionally mature', 'Above average in making decisions', 'Usually makes the right decision', 'Often uses poor judgement', 'Consistently uses bad judgement'])}
      {renderRadioGroup('dependability', '4. Dependability', ['Completely dependable', 'Above average in dependability', 'Usually dependable', 'Sometimes neglectful or careless', 'Unreliable'])}
      {renderRadioGroup('abilityToLearn', '5. Ability to Learn', ['Learns very quickly', 'Learns readily', 'Average in learning', 'Rather slow to learn', 'Very slow to learn'])}
      {renderRadioGroup('qualityOfWork', '6. Quality of Work', ['Excellent', 'Very good', 'Average', 'Below average', 'Very poor'])}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {renderRadioGroup('attendance', '7. Attendance', ['Regular', 'Irregular'])}
        {renderRadioGroup('punctuality', '8. Punctuality', ['Regular', 'Irregular'])}
      </div>

      {renderRadioGroup('overall', '9. Overall Performance', ['Outstanding', 'Very Good', 'Average', 'Marginal', 'Unsatisfactory'])}

      <div className="form-section">
        <h3>Final Comments & Signatures</h3>
        <div className="form-group">
          <label>Remarks</label>
          <textarea {...register('remarks')} disabled={isReadonly} rows={3}></textarea>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('discussedWithStudent')} disabled={isReadonly} style={{ width: '1.2rem', height: '1.2rem', margin: 0 }} /> 
            This report has been discussed with the student
          </label>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isReadonly ? 'default' : 'pointer' }}>
            <input type="checkbox" {...register('supervisorSignature')} disabled={isReadonly} required style={{ width: '1.2rem', height: '1.2rem', margin: 0 }} /> 
            Supervisor Signature (Electronic)
          </label>
        </div>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Evaluation</button>}
    </form>
  );
}
