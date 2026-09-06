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
  formTitle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  studentName: string;
  progress?: number;
}

export interface SubmissionDetail {
  id: number;
  form: FormMeta;
  student: User;
  status: string;
  responses: any;
}
