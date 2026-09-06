import { useForm } from 'react-hook-form';
import type { FormSubmitProps } from './FormSubmitProps';

export default function ExitSurvey({ onSubmit, defaultValues, isReadonly }: FormSubmitProps) {
  const { register, handleSubmit } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="card">
      <h3>Computer Science Program Feedback Survey</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#555' }}>
        The purpose of this survey is to help the department evaluate how effectively your prior computer science coursework prepared you. Your feedback is critical. Please answer honestly based on your academic preparation from coursework only. Do not include knowledge or skills gained through work experience.
      </p>

      <div className="form-group" style={{ border: '2px solid #005a3c', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: '#fdfdfd' }}>
        <label style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '1rem', display: 'block', color: '#005a3c' }}>
          1. Preparation Level: How well prepared did you feel to undertake the project assigned in this course?
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
          {['(1) Not prepared at all', '(2) Somewhat prepared', '(3) Adequately prepared', '(4) More than adequately prepared', '(5) Extremely well prepared'].map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 'normal', cursor: isReadonly ? 'default' : 'pointer' }}>
              <input 
                type="radio" 
                value={opt} 
                {...register('preparationLevel')} 
                disabled={isReadonly}
                style={{ margin: 0, width: '1.2rem', height: '1.2rem', cursor: isReadonly ? 'default' : 'pointer' }} 
              />
              <span style={{ fontSize: '1rem' }}>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ border: '2px solid #005a3c', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: '#fdfdfd' }}>
        <label style={{ fontWeight: 'bold', color: '#005a3c' }}>2. Areas Needing Improvement: In what areas did you feel less than adequately prepared? (e.g., concepts, tools, programming techniques, or skills that prior coursework did not cover or did not prepare you to learn easily.)</label>
        <textarea {...register('improvementAreas')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </div>

      <div className="form-group" style={{ border: '2px solid #005a3c', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: '#fdfdfd' }}>
        <label style={{ fontWeight: 'bold', color: '#005a3c' }}>3. Areas of Strength: In what areas did you feel adequately or more than adequately prepared?</label>
        <textarea {...register('strengthAreas')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </div>

      <div className="form-group" style={{ border: '2px solid #005a3c', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', backgroundColor: '#fdfdfd' }}>
        <label style={{ fontWeight: 'bold', color: '#005a3c' }}>4. Additional Comments: Please share any other feedback or suggestions that could help improve the Computer Science program.</label>
        <textarea {...register('additionalComments')} disabled={isReadonly} rows={4} style={{ marginTop: '0.5rem' }}></textarea>
      </div>

      {!isReadonly && <button type="submit" className="btn">Submit Survey</button>}
    </form>
  );
}
