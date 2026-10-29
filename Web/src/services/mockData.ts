import type { FormMeta, SubmissionSummary, SubmissionDetail, User } from '../types';

export const MOCK_FORMS: FormMeta[] = [
  {
    id: 1,
    title: 'CS 401: Pre-Internship Agreement',
    googleFormId: 'CS401',
    publicUrl: '/forms/CS401',
  },
  {
    id: 2,
    title: 'CS 402: Post-Internship Evaluation',
    googleFormId: 'CS402',
    publicUrl: '/forms/CS402',
  },
  {
    id: 3,
    title: 'CS 403: Internship Bi-Weekly Report',
    googleFormId: 'CS403',
    publicUrl: '/forms/CS403',
  },
  {
    id: 4,
    title: 'CS 404: Employer Midterm Evaluation',
    googleFormId: 'CS404',
    publicUrl: '/forms/CS404',
  },
  {
    id: 5,
    title: 'CS 405: Employer Final Evaluation',
    googleFormId: 'CS405',
    publicUrl: '/forms/CS405',
  },
  {
    id: 6,
    title: 'CS 410: Degree Evaluation & Graduation Checklist',
    googleFormId: 'CS410',
    publicUrl: '/forms/CS410',
  },
  {
    id: 7,
    title: 'CS 420: Senior Capstone Proposal',
    googleFormId: 'CS420',
    publicUrl: '/forms/CS420',
  },
  {
    id: 8,
    title: 'Department of Computer Science Exit Survey',
    googleFormId: 'ExitSurvey',
    publicUrl: '/forms/ExitSurvey',
  },
];

export const MOCK_SUBMISSIONS: SubmissionSummary[] = [
  {
    id: 101,
    formId: 1,
    formTitle: 'CS 401: Pre-Internship Agreement',
    status: 'Draft',
    studentName: 'Cade Sholar',
    createdAt: '2026-10-20T14:30:00Z',
    updatedAt: '2026-10-28T16:15:00Z',
    progress: 65,
    isResubmission: false,
    latestComment: null,
  },
  {
    id: 102,
    formId: 6,
    formTitle: 'CS 410: Degree Evaluation & Graduation Checklist',
    status: 'Pending',
    studentName: 'Cade Sholar',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-22T09:45:00Z',
    progress: 100,
    isResubmission: false,
    currentStepName: 'Faculty Evaluation',
    currentStepOrder: 1,
    approvals: [
      {
        stepOrder: 1,
        stepName: 'Initial Faculty Evaluation',
        roleName: 'Faculty Evaluator',
        reviewerName: 'Dr. Ghassan Alkadi',
        status: 'Pending Review',
        approvedBy: null,
        actionDate: null,
        comments: 'Application received and currently under curriculum review.',
      },
      {
        stepOrder: 2,
        stepName: 'Departmental Authorization',
        roleName: 'Department Head',
        reviewerName: 'Dr. Bonnie Achée',
        status: 'Awaiting Faculty Approval',
        approvedBy: null,
        actionDate: null,
        comments: null,
      },
    ],
  },
  {
    id: 103,
    formId: 7,
    formTitle: 'CS 420: Senior Capstone Proposal',
    status: 'Rejected',
    studentName: 'Cade Sholar',
    createdAt: '2026-10-15T11:20:00Z',
    updatedAt: '2026-10-26T13:10:00Z',
    progress: 80,
    isResubmission: true,
    latestComment: 'Please specify the exact hardware and server specifications in Section 3, and confirm faculty advisor availability before resubmitting.',
    currentStepName: 'Faculty Evaluation',
    currentStepOrder: 1,
    approvals: [
      {
        stepOrder: 1,
        stepName: 'Initial Faculty Evaluation',
        roleName: 'Faculty Evaluator',
        reviewerName: 'Dr. Ghassan Alkadi',
        status: 'Changes Requested',
        approvedBy: 'Dr. Ghassan Alkadi',
        actionDate: '2026-10-26T13:10:00Z',
        comments: 'Please specify the exact hardware and server specifications in Section 3, and confirm faculty advisor availability before resubmitting.',
      },
    ],
  },
  {
    id: 104,
    formId: 2,
    formTitle: 'CS 402: Post-Internship Evaluation',
    status: 'Completed',
    studentName: 'Cade Sholar',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-15T15:30:00Z',
    progress: 100,
    isResubmission: false,
    currentStepName: 'Completed',
    currentStepOrder: 2,
    approvals: [
      {
        stepOrder: 1,
        stepName: 'Initial Faculty Evaluation',
        roleName: 'Faculty Evaluator',
        reviewerName: 'Dr. Ghassan Alkadi',
        status: 'Approved',
        approvedBy: 'Dr. Ghassan Alkadi',
        actionDate: '2026-09-08T11:00:00Z',
        comments: 'Excellent internship performance and thoroughly documented outcomes.',
      },
      {
        stepOrder: 2,
        stepName: 'Departmental Authorization',
        roleName: 'Department Head',
        reviewerName: 'Dr. Bonnie Achée',
        status: 'Approved',
        approvedBy: 'Dr. Bonnie Achée',
        actionDate: '2026-09-15T15:30:00Z',
        comments: 'Final credit awarded for degree completion requirements.',
      },
    ],
  },
];

export const MOCK_SUBMISSION_DETAILS: Record<number, SubmissionDetail> = {
  101: {
    id: 101,
    form: MOCK_FORMS[0],
    student: {
      email: 'cade.sholar@selu.edu',
      fullName: 'Cade Sholar',
      wNumber: 'W0123456',
      roles: ['Student'],
    },
    status: 'Draft',
    responses: {
      name: 'Cade Sholar',
      wNumber: 'W0123456',
      email: 'cade.sholar@selu.edu',
      companyName: 'Acme Software Labs',
      supervisorName: 'Jane Smith',
      supervisorEmail: 'jsmith@acmelabs.io',
      jobTitle: 'Software Engineering Intern',
      startDate: '2027-01-15',
      endDate: '2027-05-15',
    },
  },
  102: {
    id: 102,
    form: MOCK_FORMS[5],
    student: {
      email: 'cade.sholar@selu.edu',
      fullName: 'Cade Sholar',
      wNumber: 'W0123456',
      roles: ['Student'],
    },
    status: 'Pending',
    responses: {
      studentName: 'Cade Sholar',
      wNumber: 'W0123456',
      email: 'cade.sholar@selu.edu',
      catalogYear: '2023-2024',
      anticipatedGraduation: 'May 2027',
      primaryTrack: 'Scientific',
      advisorName: 'Dr. Ghassan Alkadi',
    },
    approvals: MOCK_SUBMISSIONS[1].approvals,
    auditLogs: [
      {
        id: 1,
        action: 'Submitted',
        comments: 'Initial application submitted for review.',
        actionTimestamp: '2026-10-18T10:00:00Z',
      },
    ],
  },
  103: {
    id: 103,
    form: MOCK_FORMS[6],
    student: {
      email: 'cade.sholar@selu.edu',
      fullName: 'Cade Sholar',
      wNumber: 'W0123456',
      roles: ['Student'],
    },
    status: 'Rejected',
    responses: {
      projectTitle: 'RoomiesForms Enterprise Portal',
      facultyAdvisor: 'Dr. Ghassan Alkadi',
      studentName: 'Cade Sholar',
      wNumber: 'W0123456',
      email: 'cade.sholar@selu.edu',
      objective: 'A full-scale modern university administrative portal adhering strictly to Southeastern Louisiana University standards.',
    },
    approvals: MOCK_SUBMISSIONS[2].approvals,
    auditLogs: [
      {
        id: 1,
        action: 'Submitted',
        comments: 'Form submitted for initial faculty review.',
        actionTimestamp: '2026-10-15T11:20:00Z',
      },
      {
        id: 2,
        action: 'Rejected',
        comments: 'Please specify the exact hardware and server specifications in Section 3, and confirm faculty advisor availability before resubmitting.',
        actionTimestamp: '2026-10-26T13:10:00Z',
        reviewer: {
          fullName: 'Dr. Ghassan Alkadi',
          email: 'galkadi@selu.edu',
        },
      },
    ],
  },
  104: {
    id: 104,
    form: MOCK_FORMS[1],
    student: {
      email: 'cade.sholar@selu.edu',
      fullName: 'Cade Sholar',
      wNumber: 'W0123456',
      roles: ['Student'],
    },
    status: 'Completed',
    responses: {
      studentName: 'Cade Sholar',
      wNumber: 'W0123456',
      email: 'cade.sholar@selu.edu',
      employer: 'NASA Stennis Space Center',
      hoursCompleted: 320,
    },
    approvals: MOCK_SUBMISSIONS[3].approvals,
    auditLogs: [
      {
        id: 1,
        action: 'Approved',
        comments: 'Excellent internship performance and thoroughly documented outcomes.',
        actionTimestamp: '2026-09-08T11:00:00Z',
        reviewer: {
          fullName: 'Dr. Ghassan Alkadi',
          email: 'galkadi@selu.edu',
        },
      },
      {
        id: 2,
        action: 'Approved',
        comments: 'Final credit awarded for degree completion requirements.',
        actionTimestamp: '2026-09-15T15:30:00Z',
        reviewer: {
          fullName: 'Dr. Bonnie Achée',
          email: 'bonnie.achee@southeastern.edu',
        },
      },
    ],
  },
};

export function getMockUser(email: string): User {
  const clean = email.trim().toLowerCase();
  if (clean === 'galkadi@selu.edu') {
    return {
      email: 'galkadi@selu.edu',
      fullName: 'Dr. Ghassan Alkadi',
      wNumber: 'W0234567',
      roles: ['Faculty'],
    };
  }
  if (clean === 'bonnie.achee@southeastern.edu') {
    return {
      email: 'bonnie.achee@southeastern.edu',
      fullName: 'Dr. Bonnie Achée',
      wNumber: 'W0345678',
      roles: ['Department Head', 'Faculty'],
    };
  }
  if (clean === 'eliora.browning@selu.edu') {
    return {
      email: 'eliora.browning@selu.edu',
      fullName: 'Eliora Browning',
      wNumber: 'W0712345',
      roles: ['Student'],
    };
  }
  if (clean === 'cade.sholar@selu.edu') {
    return {
      email: 'cade.sholar@selu.edu',
      fullName: 'Cade Sholar',
      wNumber: 'W0123456',
      roles: ['Student'],
    };
  }

  // Generic fallback based on email prefix
  const prefix = clean.split('@')[0];
  const nameParts = prefix.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1));
  const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Test User';
  return {
    email: clean,
    fullName,
    wNumber: 'W0' + Math.floor(100000 + Math.random() * 900000),
    roles: ['Student'],
  };
}
