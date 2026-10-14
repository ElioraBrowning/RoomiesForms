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
  auditLogs?: AuditLogEntry[];
}
