import React, { useEffect, useCallback, useRef } from "react";
import { labelFor } from "./useValidatedForm";

interface FormWrapperProps {
  children: React.ReactNode;
  onSaveDraft?: (progress: number) => void;
  onSubmit?: () => void;
  isReadonly?: boolean;
  getValues?: () => any;
  errors?: Record<string, any>;
  submitText?: string;
}

export function FormWrapper({
  children,
  onSaveDraft,
  onSubmit,
  isReadonly,
  getValues,
  errors,
  submitText = "Submit Form",
}: FormWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const steps = React.Children.toArray(children).filter(
    (c): c is React.ReactElement =>
      React.isValidElement(c) &&
      (c.type === FormStep || (c.props as any).__isStep),
  );

  const totalSteps = steps.length;
  const [currentStep, setCurrentStep] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const isSubmittingRef = useRef(false);

  const calculateProgress = useCallback(() => {
    if (!getValues) return Math.round(((currentStep + 1) / totalSteps) * 100);

    const values = getValues();
    if (!values) return 0;

    let filledCount = 0;
    let totalFields = 0;

    for (const key of Object.keys(values)) {
      if (key === "__progress" || key === "studentName") continue;

      const val = values[key];
      totalFields++;

      if (val !== undefined && val !== null && val !== "") {
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
    setCurrentStep((c) => Math.min(totalSteps - 1, c + 1));
  };

  const handlePrev = () => {
    setCurrentStep((c) => Math.max(0, c - 1));
  };

  useEffect(() => {
    if (
      !isReadonly &&
      !isSubmittingRef.current &&
      currentStep > 0 &&
      onSaveDraft
    ) {
      onSaveDraft(progress);
    }
  }, [currentStep, isReadonly, onSaveDraft, progress]);

  const handleBlur = useCallback(
    (_e: React.FocusEvent) => {
      if (!isReadonly && !isSubmittingRef.current && onSaveDraft) {
        setTimeout(() => {
          if (isSubmittingRef.current) return;
          const p = calculateProgress();
          setProgress(p);
          onSaveDraft(p);
        }, 200);
      }
    },
    [isReadonly, onSaveDraft, calculateProgress],
  );

  // Release submission lock whenever validation errors are received
  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      isSubmittingRef.current = false;
    }
  }, [errors]);

  // When validation errors occur, auto-navigate to the step containing the first error
  useEffect(() => {
    const errorKeys = Object.keys(errors ?? {});
    if (errorKeys.length === 0 || totalSteps <= 1) return;

    const firstKey = errorKeys[0];
    const cardEl = containerRef.current;
    if (!cardEl) return;

    const formEl = cardEl.closest("form") || cardEl;
    const targetInput = formEl.querySelector(
      `[name="${firstKey}"], [name^="${firstKey}."]`,
    );

    if (targetInput) {
      const stepEl = targetInput.closest(".form-section");
      if (stepEl) {
        const allStepEls = Array.from(cardEl.querySelectorAll(".form-section"));
        const stepIdx = allStepEls.indexOf(stepEl);
        if (stepIdx !== -1 && stepIdx !== currentStep) {
          setCurrentStep(stepIdx);
        }
      }
      setTimeout(() => {
        targetInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [errors, totalSteps, currentStep]);

  const handleSubmitClick = () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    onSubmit?.();
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 1000);
  };

  const errorList = Object.entries(errors ?? {});

  return (
    <div ref={containerRef} className="card" onBlur={handleBlur}>
      {!isReadonly && errorList.length > 0 && (
        <div className="form-errors" role="alert">
          <p className="form-errors-title">
            {errorList.length === 1
              ? "One field needs attention before you can submit:"
              : `${errorList.length} fields need attention before you can submit:`}
          </p>
          <ul>
            {errorList.map(([field, err]) => (
              <li key={field}>
                <strong>{labelFor(field)}</strong>
                {err?.message ? ` - ${err.message}` : ""}
              </li>
            ))}
          </ul>
          <p className="form-errors-hint">
            Some of these may be in another section. Use Previous and Next to
            find them.
          </p>
        </div>
      )}
      {totalSteps > 1 && (
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.5rem",
              color: "var(--text-help)",
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
          >
            <span>
              Section {currentStep + 1} of {totalSteps}
            </span>
            <span>{progress}% Complete</span>
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "8px",
                  backgroundColor:
                    i <= currentStep ? "var(--slu-gold)" : "var(--border-card)",
                  borderRadius: "4px",
                  transition: "background-color 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {React.Children.map(steps, (step, index) =>
        React.isValidElement(step)
          ? React.cloneElement(step as React.ReactElement<any>, {
              isActive: index === currentStep,
            })
          : step,
      )}

      <div
        className="step-actions form-wizard-actions"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "2rem",
          paddingTop: "2rem",
          borderTop: "1px solid var(--border-card)",
        }}
      >
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
          <button
            type="button"
            className="btn"
            onClick={handleNext}
            style={{ marginLeft: "auto" }}
          >
            Next Section
          </button>
        ) : (
          !isReadonly && (
            <button
              type="button"
              className="btn"
              onClick={handleSubmitClick}
              style={{
                marginLeft: "auto",
                backgroundColor: "var(--slu-green)",
                color: "white",
              }}
            >
              {submitText}
            </button>
          )
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

export function FormStep({
  children,
  title,
  description,
  isActive = true,
}: FormStepProps) {
  return (
    <div
      className="form-section"
      style={{
        display: isActive ? "block" : "none",
        border: "none",
        padding: 0,
        backgroundColor: "transparent",
        marginBottom: 0,
      }}
    >
      {title && (
        <h3
          style={{
            borderBottom: "2px solid var(--slu-gold)",
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            color: "var(--text-heading)",
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p style={{ color: "var(--text-help)", marginBottom: "1.5rem" }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

FormStep.defaultProps = {
  __isStep: true,
};
