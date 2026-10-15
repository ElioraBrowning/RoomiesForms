import { useValidatedForm } from './useValidatedForm';
import type { FormSubmitProps } from './FormSubmitProps';
import { FormWrapper, FormStep } from './FormWrapper';

export default function CS410({ onSubmit, defaultValues, isReadonly, onSaveDraft }: FormSubmitProps) {
  const { register, handleSubmit, getValues, formState } = useValidatedForm({ defaultValues });

  const handleSaveDraft = (progress: number) => {
    if (onSaveDraft) onSaveDraft({ ...getValues(), __progress: progress });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormWrapper
        getValues={getValues}
        onSaveDraft={handleSaveDraft}
        onSubmit={handleSubmit(onSubmit)}
        isReadonly={isReadonly}
        errors={formState.errors}
        submitText="Submit Evaluation"
      >
        <FormStep
          title="Employer & Position Details"
          description="Identify your employer and the position held during your internship."
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label>Employer's Name</label>
              <input placeholder="e.g. Acme Corp" {...register('employerName')} disabled={isReadonly} />
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <input placeholder="e.g. Software Engineering Intern" {...register('jobTitle')} disabled={isReadonly} />
            </div>
          </div>
        </FormStep>

        <FormStep
          title="Internship Experience Evaluation"
          description="Rate your overall experience and the relevance to your Computer Science studies."
        >
          <div className="form-grid-2">
            <div className="form-group">
              <label>Overall Rating of Employer</label>
              <select {...register('ratingEmployer')} disabled={isReadonly}>
                <option value="">-- Select Rating --</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div className="form-group">
              <label>Overall Rating of Work Experience</label>
              <select {...register('ratingExperience')} disabled={isReadonly}>
                <option value="">-- Select Rating --</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>How much of your work was related to CS studies?</label>
              <select {...register('relatedAmount')} disabled={isReadonly}>
                <option value="">-- Select Percentage --</option>
                <option value="100%">100%</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="25%">25%</option>
              </select>
            </div>
            <div className="form-group">
              <label>Rating of learning as a result of internship</label>
              <select {...register('ratingLearning')} disabled={isReadonly}>
                <option value="">-- Select Rating --</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Would you repeat your work experience with this employer?</label>
              <select {...register('repeatExperience')} disabled={isReadonly}>
                <option value="">-- Select Option --</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>If not, explain why:</label>
              <input placeholder="Optional explanation..." {...register('repeatExplain')} disabled={isReadonly} />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Would you recommend this employer to other interns?</label>
              <select {...register('recommendEmployer')} disabled={isReadonly}>
                <option value="">-- Select Option --</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>If not, explain why:</label>
              <input placeholder="Optional explanation..." {...register('recommendExplain')} disabled={isReadonly} />
            </div>
          </div>
        </FormStep>
        
        <FormStep
          title="Curriculum Feedback & Signature"
          description="Provide feedback to help improve the curriculum and sign electronically."
        >
          <div className="form-group">
            <label>Based upon your experience, what curriculum revisions or topics should be added?</label>
            <textarea
              placeholder="Suggest courses, tools, or topics that would have helped..."
              {...register('curriculumRevisions')}
              disabled={isReadonly}
              rows={3}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Any additional comments?</label>
            <textarea
              placeholder="Any other comments or suggestions..."
              {...register('additionalComments')}
              disabled={isReadonly}
              rows={3}
            ></textarea>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: isReadonly ? 'default' : 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                {...register('studentSignature')}
                disabled={isReadonly}
                style={{ width: '1.2rem', height: '1.2rem', margin: 0, cursor: isReadonly ? 'default' : 'pointer' }}
              /> 
              <span>Student Signature (Electronic) - I certify this evaluation is accurate.</span>
            </label>
          </div>
        </FormStep>
      </FormWrapper>
    </form>
  );
}
