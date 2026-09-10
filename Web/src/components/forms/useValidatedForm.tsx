import { useForm } from 'react-hook-form';
import type { FieldValues, RegisterOptions, UseFormProps } from 'react-hook-form';

/**
 * Validation rules keyed by field name.
 *
 * The eight CS4xx forms share most of their field names, so the rules live
 * here once instead of being repeated in every form. A form opts in by
 * importing useValidatedForm instead of useForm; nothing else changes.
 */

const REQUIRED = 'This field is required.';

const rules: Record<string, RegisterOptions<FieldValues, string>> = {
  // Identity
  name: { required: REQUIRED, minLength: { value: 2, message: 'Enter your full name.' } },
  studentName: { required: REQUIRED, minLength: { value: 2, message: 'Enter your full name.' } },
  wNumber: {
    required: REQUIRED,
    pattern: { value: /^[Ww]\d{7,8}$/, message: 'A W# looks like W0000000.' },
  },
  email: {
    required: REQUIRED,
    pattern: {
      value: /^[^\s@]+@(selu\.edu|southeastern\.edu)$/i,
      message: 'Use your Southeastern address, ending in @selu.edu.',
    },
  },
  cellPhone: {
    required: REQUIRED,
    pattern: {
      value: /^[\d\s().+-]{10,20}$/,
      message: 'Enter a phone number, e.g. (555) 555-5555.',
    },
  },
  presentAddress: { required: REQUIRED },
  permanentAddress: { required: REQUIRED },
  degree: { required: REQUIRED },
  semester: { required: REQUIRED },

  gpa: {
    required: REQUIRED,
    validate: (v) => {
      if (v === '' || v === undefined || v === null) return REQUIRED;
      const n = Number(v);
      if (Number.isNaN(n)) return 'Enter a number.';
      if (n < 0 || n > 4) return 'GPA must be between 0.00 and 4.00.';
      return true;
    },
  },

  graduationDate: { required: REQUIRED },

  // Employer
  employerName: { required: REQUIRED },
  companyName: { required: REQUIRED },
  employerAddress: { required: REQUIRED },
  jobTitle: { required: REQUIRED },
  employmentType: { required: REQUIRED },
  jobResponsibilities: {
    required: REQUIRED,
    minLength: { value: 20, message: 'Give a bit more detail - at least 20 characters.' },
  },

  supervisorName: { required: REQUIRED },
  supervisorEmail: {
    required: REQUIRED,
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' },
  },
  supervisorPhone: {
    required: REQUIRED,
    pattern: {
      value: /^[\d\s().+-]{10,20}$/,
      message: 'Enter a phone number, e.g. (555) 555-5555.',
    },
  },

  // Dates and hours
  startDate: { required: REQUIRED },
  endDate: {
    required: REQUIRED,
    validate: (v, values) => {
      const start = (values as FieldValues)?.startDate;
      if (!v || !start) return true;
      return new Date(v as string) > new Date(start as string)
        ? true
        : 'The end date must come after the start date.';
    },
  },
  hoursPerWeek: {
    required: REQUIRED,
    validate: (v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return 'Enter a number.';
      if (n < 1 || n > 60) return 'Enter between 1 and 60 hours per week.';
      return true;
    },
  },
  totalHours: {
    validate: (v) =>
      v === '' || v === undefined || Number(v) >= 0 ? true : 'Hours cannot be negative.',
  },

  // Money
  hourlyWage: {
    validate: (v) =>
      v === '' || v === undefined || Number(v) >= 0 ? true : 'Wage cannot be negative.',
  },
  totalWages: {
    validate: (v) =>
      v === '' || v === undefined || Number(v) >= 0 ? true : 'Wages cannot be negative.',
  },
  relatedAmount: {
    validate: (v) =>
      v === '' || v === undefined || Number(v) >= 0 ? true : 'Amount cannot be negative.',
  },

  // Sign-off
  studentSignature: { required: 'Type your name to sign.' },
  supervisorSignature: { required: 'Type the supervisor name to sign.' },
  agreed: { required: 'You must agree before submitting.' },
};

/** "supervisorEmail" -> "Supervisor Email", for the error summary. */
export function labelFor(field: string) {
  const spaced = field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  return spaced.replace('W Number', 'W#').replace('Gpa', 'GPA').trim();
}

/**
 * Drop-in replacement for useForm. The returned register() applies the rule
 * for that field name automatically and marks the input aria-invalid when it
 * fails, which the stylesheet uses to outline it.
 */
export function useValidatedForm<T extends FieldValues = FieldValues>(props?: UseFormProps<T>) {
  const form = useForm<T>({ mode: 'onBlur', ...props });

  const register = ((name: string, extra?: RegisterOptions) => ({
    ...form.register(name as never, { ...(rules[name] ?? {}), ...(extra ?? {}) } as never),
    'aria-invalid': form.formState.errors[name] ? true : undefined,
  })) as unknown as typeof form.register;

  return { ...form, register };
}

export default useValidatedForm;