import React, { useEffect, useCallback } from 'react';

interface FormWrapperProps {
  children: React.ReactNode;
  onSaveDraft?: (progress: number) => void;
  onSubmit?: () => void;
  isReadonly?: boolean;
  getValues?: () => any;
}

export function FormWrapper({ children, onSaveDraft, onSubmit, isReadonly, getValues }: FormWrapperProps) {
  const steps = React.Children.toArray(children).filter(
    (c): c is React.ReactElement => React.isValidElement(c) && (c.type === FormStep || (c.props as any).__isStep)
  );
  
  const totalSteps = steps.length;
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  const calculateProgress = useCallback(() => {
    if (!getValues) return Math.round(((currentStep + 1) / totalSteps) * 100);
    
    const values = getValues();
    if (!values) return 0;

    let filledCount = 0;
    let totalFields = 0;

    for (const key of Object.keys(values)) {
      if (key === '__progress' || key === 'studentName') continue; // studentName is just display
      
      const val = values[key];
      totalFields++;
      
      if (val !== undefined && val !== null && val !== '') {
        if (Array.isArray(val)) {
           if (val.length > 0) filledCount++;
        } else {
          filledCount++;
        }
      }
    }
    
    if (totalFields === 0) return 0;
    return Math.round((filledCount / totalFields) * 100);
  }, [getValues, currentStep, totalSteps]);

  useEffect(() => {
    setProgress(calculateProgress());
  }, [currentStep, calculateProgress]);

  const handleNext = () => {
    setCurrentStep(c => Math.min(totalSteps - 1, c + 1));
  };

  const handlePrev = () => {
    setCurrentStep(c => Math.max(0, c - 1));
  };

  useEffect(() => {
    if (!isReadonly && currentStep > 0 && onSaveDraft) {
      onSaveDraft(progress);
    }
  }, [currentStep, isReadonly, onSaveDraft, progress]);

  const handleBlur = useCallback((_e: React.FocusEvent) => {
    if (!isReadonly && onSaveDraft) {
      // Allow react-hook-form to update state before calculating
      setTimeout(() => {
        const p = calculateProgress();
        setProgress(p);
        onSaveDraft(p);
      }, 200);
    }
  }, [isReadonly, onSaveDraft, calculateProgress]);

  return (
    <div className="card" onBlur={handleBlur}>
      {totalSteps > 1 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-help)', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <span>Section {currentStep + 1} of {totalSteps}</span>
            <span>{progress}% Complete</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {steps.map((_, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: 1, 
                  height: '8px', 
                  backgroundColor: i <= currentStep ? 'var(--slu-gold)' : 'var(--border-card)', 
                  borderRadius: '4px',
                  transition: 'background-color 0.3s ease'
                }} 
              />
            ))}
          </div>
        </div>
      )}
      
      {React.Children.map(steps, (step, index) => 
        React.isValidElement(step) ? React.cloneElement(step as React.ReactElement<any>, { isActive: index === currentStep }) : step
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-card)' }}>
        {totalSteps > 1 && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handlePrev} 
            disabled={currentStep === 0}
          >
            Previous
          </button>
        )}
        
        {currentStep < totalSteps - 1 ? (
          <button type="button" className="btn" onClick={handleNext} style={{ marginLeft: 'auto' }}>
            Next Section
          </button>
        ) : (
          !isReadonly && <button type="button" className="btn" onClick={onSubmit} style={{ marginLeft: 'auto', backgroundColor: 'var(--slu-green)', color: 'white' }}>Submit Application</button>
        )}
      </div>
    </div>
  );
}

interface FormStepProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  isActive?: boolean;
  __isStep?: boolean;
}

export function FormStep({ children, title, description, isActive = true }: FormStepProps) {
  return (
    <div 
      className="form-section" 
      style={{ 
        display: isActive ? 'block' : 'none', 
        border: 'none', 
        padding: 0, 
        backgroundColor: 'transparent',
        marginBottom: 0
      }}
    >
      {title && <h3 style={{ borderBottom: '2px solid var(--slu-gold)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-heading)' }}>{title}</h3>}
      {description && <p style={{ color: 'var(--text-help)', marginBottom: '1.5rem' }}>{description}</p>}
      {children}
    </div>
  );
}

FormStep.defaultProps = {
  __isStep: true
};
