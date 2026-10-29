import type { FormSchema } from '../forms/types';

export interface User {
  email: string;
  fullName: string;
  wNumber: string;
  roles: string[];
}

export interface FormMeta {
  id: number;
  title: string;
  googleFormId: string;
  publicUrl: string;
  anonymous?: boolean;
  hasEmployerStep?: boolean;
  department?: string;
  category?: string;
}

export interface FormDetail extends FormMeta {
  schema: FormSchema | null;
  assignment?: { dueDate?: string | null; note?: string | null; completedOn?: string | null } | null;
}

/** "Approved" | "Pending Review" | "Changes Requested" | "Waiting" | "Not Submitted" */
export type StepStatus = string;

export interface ApprovalStepStatus {
  stepOrder: number;
  stepName: string;
  roleName: string;
  reviewerName: string;
  status: StepStatus;
  approvedBy?: string | null;
  actionDate?: string | null;
  comments?: string | null;
}

export interface EmployerReview {
  employerEmail: string;
  employerName?: string | null;
  status: string;
  accessToken?: string | null;
  signedAt?: string | null;
  expiresAt?: string | null;
  expired?: boolean;
}

export interface SubmissionSummary {
  id: number;
  formId?: number;
  formKey?: string;
  formTitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  progress?: number;
  isResubmission?: boolean;
  latestComment?: string | null;
  currentStepName?: string;
  currentStepOrder?: number;
  approvals?: ApprovalStepStatus[];
  employerReview?: EmployerReview | null;
  /** Only on the "previously reviewed" list. */
  reviewedAction?: string | null;
  reviewedAt?: string | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  comments?: string | null;
  actionTimestamp: string;
  stepId?: number;
  reviewer?: {
    fullName: string;
    email: string;
  };
}

export interface SubmissionDetail {
  id: number;
  form: FormMeta;
  student: User & { id?: number };
  status: string;
  responses: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  currentStep?: {
    id: number;
    stepOrder: number;
    actionName: string;
    requiredRole?: {
      id: number;
      name: string;
    };
  };
  auditLogs?: AuditLogEntry[];
  approvals?: ApprovalStepStatus[];
  employerReview?: EmployerReview | null;
}

export interface Assignment {
  id: number;
  formId: number;
  formKey: string;
  formTitle: string;
  studentId: number;
  studentName: string;
  studentEmail: string;
  assignedByName?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  note?: string | null;
  anonymous: boolean;
  description?: string | null;
  needs?: string[] | null;
  department: string;
  category: string;
  /** "Not started" | "Draft" | "Pending" | "Rejected" | "Completed" | "Submitted" */
  status: string;
  submissionId?: number | null;
  progress?: number | null;
}

export interface Student {
  id: number;
  fullName: string;
  email: string;
}