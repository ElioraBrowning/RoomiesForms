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
}

export interface ApprovalStepStatus {
  stepOrder: number;
  stepName: string;
  roleName: string;
  reviewerName: string;
  status: string; // "Approved" | "Pending Review" | "Changes Requested" | "Awaiting Faculty Approval" | "Not Submitted"
  approvedBy?: string | null;
  actionDate?: string | null;
  comments?: string | null;
}

export interface SubmissionSummary {
  id: number;
  formId?: number;
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
}

export interface AuditLogEntry {
  id: number;
  action: string;
  comments: string | null;
  actionTimestamp: string;
  reviewer?: {
    fullName: string;
    email: string;
  };
}

export interface SubmissionDetail {
  id: number;
  form: FormMeta;
  student: User;
  status: string;
  responses: any;
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
}
