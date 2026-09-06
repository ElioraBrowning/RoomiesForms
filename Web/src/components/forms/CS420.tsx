import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function CS420({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  const renderRadioGroup = (name: string, label: string, options: string[]) => (
    <div className="form-group" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
      <label style={{ fontWeight: 'bold' }}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
            <input type="radio" value={opt} {...register(name)} disabled={isReadonly} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3>Employer's Evaluation of the Computer Science Internship Student</h3>
      
      <div className="form-group"><label>Student Name</label><input {...register('studentName')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Job Title</label><input {...register('jobTitle')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Semester</label><input {...register('semester')} disabled={isReadonly} /></div>
      <div className="form-group"><label>Employer</label><input {...register('employerName')} disabled={isReadonly} /></div>

      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#555' }}>
        Instructions: The immediate supervisor will evaluate the student objectively, comparing him/her with other students of comparable academic level or other personnel assigned the same or similarly classified jobs.
      </p>

      {renderRadioGroup('relations', 'Relations with Others', ['Exceptionally well accepted', 'Works well with others', 'Gets along satisfactorily', 'Has some difficulty working with others', 'Works very poorly with others'])}
      {renderRadioGroup('attitude', 'Attitude / Application to Work', ['Outstanding in enthusiasm', 'Very interested and industrious', 'Average in diligence and interest', 'Somewhat indifferent', 'Definitely not interested'])}
      {renderRadioGroup('judgement', 'Judgement', ['Exceptionally mature', 'Above average in making decisions', 'Usually makes the right decision', 'Often uses poor judgement', 'Consistently uses bad judgement'])}
      {renderRadioGroup('dependability', 'Dependability', ['Completely dependable', 'Above average in dependability', 'Usually dependable', 'Sometimes neglectful or careless', 'Unreliable'])}
      {renderRadioGroup('abilityToLearn', 'Ability to Learn', ['Learns very quickly', 'Learns readily', 'Average in learning', 'Rather slow to learn', 'Very slow to learn'])}
      {renderRadioGroup('qualityOfWork', 'Quality of Work', ['Excellent', 'Very good', 'Average', 'Below average', 'Very poor'])}
      
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>{renderRadioGroup('attendance', 'Attendance', ['Regular', 'Irregular'])}</div>
        <div style={{ flex: 1 }}>{renderRadioGroup('punctuality', 'Punctuality', ['Regular', 'Irregular'])}</div>
      </div>

      {renderRadioGroup('overall', 'Overall Performance', ['Outstanding', 'Very Good', 'Average', 'Marginal', 'Unsatisfactory'])}

      <div className="form-group">
        <label>Remarks</label>
        <textarea {...register('remarks')} disabled={isReadonly} rows={3}></textarea>
      </div>

      <div className="form-group">
        <label><input type="checkbox" {...register('discussedWithStudent')} disabled={isReadonly} /> This report has been discussed with the student</label>
      </div>

      <div className="form-group">
        <label><input type="checkbox" {...register('supervisorSignature')} disabled={isReadonly} required /> Supervisor Signature (Electronic)</label>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Evaluation</button>}
    </form>
  );
}
