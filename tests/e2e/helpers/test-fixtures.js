/**
 * tests/e2e/helpers/test-fixtures.js
 *
 * Reusable mock data and contracts for E2E tests:
 * Users, Forms, Submissions, Approvals, Exit Survey, and Placements.
 */

export const FIXTURE_USERS = {
  studentEliora: {
    id: 1,
    fullName: 'Eliora Browning',
    email: 'eliora.browning@selu.edu',
    wNumber: 'W0712345',
    roles: ['Student'],
    department: 'Computer Science',
  },
  studentCade: {
    id: 3,
    fullName: 'Cade Sholar',
    email: 'cade.sholar@selu.edu',
    wNumber: 'W0765432',
    roles: ['Student'],
    department: 'Computer Science',
  },
  studentMarcus: {
    id: 6,
    fullName: 'Marcus Vance',
    email: 'marcus.vance@selu.edu',
    wNumber: 'W0798765',
    roles: ['Student'],
    department: 'Computer Science',
  },
  facultyAlkadi: {
    id: 4,
    fullName: 'Dr. Ghassan Alkadi',
    email: 'galkadi@selu.edu',
    roles: ['Faculty'],
    department: 'Computer Science',
    isDesignated: true,
  },
  facultyOther: {
    id: 5,
    fullName: 'Dr. Other Faculty',
    email: 'other.faculty@selu.edu',
    roles: ['Faculty'],
    department: 'Computer Science',
    isDesignated: false,
  },
  deptHeadBonnie: {
    id: 2,
    fullName: 'Dr. Bonnie Achée',
    email: 'bonnie.achee@southeastern.edu',
    roles: ['Department Head'],
    department: 'Computer Science',
  },
};

export const FIXTURE_FORMS = [
  {
    id: 1,
    formKey: 'CS401',
    title: 'CS 401: Internship Application',
    department: 'Computer Science',
    category: 'Internship',
    pages: [
      {
        pageNumber: 1,
        title: 'Student & Employer Information',
        questions: [
          { id: 'studentName', type: 'text', label: 'Student Full Name', required: true },
          { id: 'wNumber', type: 'text', label: 'W Number', required: true },
          { id: 'employerName', type: 'text', label: 'Company Name', required: true },
          { id: 'jobTitle', type: 'text', label: 'Internship Title', required: true },
          { id: 'hourlyWage', type: 'number', label: 'Hourly Wage ($)', required: true },
        ],
      },
      {
        pageNumber: 2,
        title: 'Job Description & Duties',
        questions: [
          { id: 'dutiesDescription', type: 'textarea', label: 'Description of Duties', required: true },
          { id: 'hoursPerWeek', type: 'number', label: 'Expected Hours per Week', required: true },
        ],
      },
    ],
  },
  {
    id: 2,
    formKey: 'CS410',
    title: 'CS 410: Degree Checklist Audit',
    department: 'Computer Science',
    category: 'Academic',
    pages: [
      {
        pageNumber: 1,
        title: 'Degree Concentration & Prereqs',
        questions: [
          { id: 'primaryTrack', type: 'choice', label: 'Primary Concentration Track', required: true, reviewRequired: true, options: ['Scientific', 'Information Technology', 'Data Science'] },
          { id: 'majorGpa', type: 'number', label: 'Major GPA', required: true, reviewRequired: true },
        ],
      },
    ],
  },
  {
    id: 3,
    formKey: 'CS420',
    title: 'CS 420: Senior Capstone Proposal',
    department: 'Computer Science',
    category: 'Capstone',
    pages: [
      {
        pageNumber: 1,
        title: 'Project Proposal Scope',
        questions: [
          { id: 'projectTitle', type: 'text', label: 'Project Title', required: true, reviewRequired: true },
          { id: 'facultyAdvisor', type: 'text', label: 'Faculty Advisor', required: true, reviewRequired: true },
          { id: 'objective', type: 'textarea', label: 'Project Objective', required: true, reviewRequired: true },
          { id: 'serverSpecs', type: 'textarea', label: 'Server & Hosting Specifications', required: false, reviewRequired: true },
        ],
      },
    ],
  },
  {
    id: 4,
    formKey: 'ExitSurvey',
    title: 'Senior Exit Survey',
    department: 'Computer Science',
    category: 'Assessment',
    pages: [
      {
        pageNumber: 1,
        title: 'Exit Feedback',
        questions: [
          { id: 'overallSatisfaction', type: 'choice', label: 'Overall Program Satisfaction', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'] },
          { id: 'postGradPlans', type: 'choice', label: 'Post-Graduation Plans', options: ['Employed Full-Time', 'Graduate School', 'Seeking Employment'] },
          { id: 'programComments', type: 'textarea', label: 'Qualitative Program Feedback' },
        ],
      },
    ],
  },
];

export const FIXTURE_SUBMISSIONS = [
  {
    id: 101,
    formId: 1,
    formKey: 'CS401',
    formTitle: 'CS 401: Internship Application',
    studentId: 1,
    studentName: 'Eliora Browning',
    studentEmail: 'eliora.browning@selu.edu',
    status: 'Pending',
    currentStepOrder: 1,
    currentStep: {
      stepOrder: 1,
      roleName: 'Faculty Evaluator',
      requiredRole: { name: 'Faculty Evaluator' },
    },
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Pending Review', actionDate: null, approvedBy: null },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Queued', actionDate: null, approvedBy: null },
    ],
    responses: {
      studentName: 'Eliora Browning',
      wNumber: 'W0712345',
      employerName: 'Acme Software',
      jobTitle: 'Junior QA Engineer',
      hourlyWage: 25,
      dutiesDescription: 'Automated test suite maintenance and CI pipelines.',
      hoursPerWeek: 20,
    },
    auditLogs: [],
  },
  {
    id: 102,
    formId: 2,
    formKey: 'CS410',
    formTitle: 'CS 410: Degree Checklist Audit',
    studentId: 3,
    studentName: 'Cade Sholar',
    studentEmail: 'cade.sholar@selu.edu',
    status: 'Pending',
    currentStepOrder: 1,
    currentStep: {
      stepOrder: 1,
      roleName: 'Faculty Evaluator',
      requiredRole: { name: 'Faculty Evaluator' },
    },
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Pending Review', actionDate: null, approvedBy: null },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Queued', actionDate: null, approvedBy: null },
    ],
    responses: {
      primaryTrack: 'Information Technology',
      majorGpa: 3.75,
    },
    auditLogs: [],
  },
  {
    id: 103,
    formId: 3,
    formKey: 'CS420',
    formTitle: 'CS 420: Senior Capstone Proposal',
    studentId: 3,
    studentName: 'Cade Sholar',
    studentEmail: 'cade.sholar@selu.edu',
    status: 'Rejected',
    currentStepOrder: 1,
    currentStep: {
      stepOrder: 1,
      roleName: 'Faculty Evaluator',
      requiredRole: { name: 'Faculty Evaluator' },
    },
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Rejected', actionDate: '2026-11-09T18:00:00Z', approvedBy: 'Dr. Ghassan Alkadi' },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Queued', actionDate: null, approvedBy: null },
    ],
    responses: {
      projectTitle: 'RoomiesForms Enterprise Portal',
      facultyAdvisor: 'Dr. Ghassan Alkadi',
      objective: 'A full-scale modern university forms review and workflow system.',
      serverSpecs: 'TBD',
    },
    auditLogs: [
      {
        id: 1,
        action: 'Rejected',
        actorEmail: 'galkadi@selu.edu',
        actorName: 'Dr. Ghassan Alkadi',
        reviewer: {
          fullName: 'Dr. Ghassan Alkadi',
          email: 'galkadi@selu.edu',
        },
        actionTimestamp: '2026-11-09T18:00:00Z',
        timestamp: '2026-11-09T18:00:00Z',
        comments: '[Changes Needed] Server & Hosting Specifications: Please specify exact server specifications and hosting architecture.\nGeneral remarks: Please refine the architecture details and resubmit.',
      },
    ],
  },
  {
    id: 104,
    formId: 2,
    formKey: 'CS410',
    formTitle: 'CS 410: Degree Checklist Audit',
    studentId: 1,
    studentName: 'Eliora Browning',
    studentEmail: 'eliora.browning@selu.edu',
    status: 'Completed',
    currentStepOrder: 2,
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Approved', actionDate: '2026-11-08T14:00:00Z', approvedBy: 'Dr. Ghassan Alkadi' },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Approved', actionDate: '2026-11-08T16:00:00Z', approvedBy: 'Dr. Bonnie Achée' },
    ],
    responses: {
      primaryTrack: 'Scientific',
      majorGpa: 3.88,
    },
    auditLogs: [
      { action: 'Approved', actorName: 'Dr. Ghassan Alkadi', timestamp: '2026-11-08T14:00:00Z', comments: 'Verified' },
      { action: 'Approved', actorName: 'Dr. Bonnie Achée', timestamp: '2026-11-08T16:00:00Z', comments: 'Authorized' },
    ],
  },
  {
    id: 105,
    formId: 1,
    formKey: 'CS401',
    formTitle: 'CS 401: Internship Application',
    studentId: 3,
    studentName: 'Marcus Vance',
    studentEmail: 'marcus.vance@selu.edu',
    status: 'Pending',
    currentStepOrder: 2,
    currentStep: {
      stepOrder: 2,
      roleName: 'Department Head Authorization',
      requiredRole: { name: 'Department Head Authorization' },
    },
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Approved', actionDate: '2026-11-09T10:00:00Z', approvedBy: 'Dr. Ghassan Alkadi' },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Pending Review', actionDate: null, approvedBy: null },
    ],
    responses: {
      studentName: 'Marcus Vance',
      wNumber: 'W0798765',
      employerName: 'DXC Technology',
      jobTitle: 'Software Engineer Intern',
      hourlyWage: 29.5,
      dutiesDescription: 'Cloud infrastructure engineering and microservices development.',
      hoursPerWeek: 20,
    },
    auditLogs: [
      {
        action: 'Approved',
        actorName: 'Dr. Ghassan Alkadi',
        reviewer: { fullName: 'Dr. Ghassan Alkadi', email: 'galkadi@selu.edu' },
        actionTimestamp: '2026-11-09T10:00:00Z',
        timestamp: '2026-11-09T10:00:00Z',
        comments: 'Prerequisites satisfied for CMPS 400.',
      },
    ],
  },
  {
    id: 106,
    formId: 1,
    formKey: 'CS401',
    formTitle: 'CS 401: Internship Application',
    studentId: 6,
    studentName: 'Sarah Jenkins',
    studentEmail: 'sarah.jenkins@selu.edu',
    status: 'Pending',
    currentStepOrder: 2,
    currentStep: {
      stepOrder: 2,
      roleName: 'Department Head Authorization',
      requiredRole: { name: 'Department Head Authorization' },
    },
    approvals: [
      { stepOrder: 1, roleName: 'Faculty Evaluator', status: 'Approved', actionDate: '2026-11-09T11:00:00Z', approvedBy: 'Dr. Ghassan Alkadi' },
      { stepOrder: 2, roleName: 'Department Head Authorization', status: 'Pending Review', actionDate: null, approvedBy: null },
    ],
    responses: {
      studentName: 'Sarah Jenkins',
      wNumber: 'W0788112',
      employerName: 'Blue Cross Blue Shield',
      jobTitle: 'Data Analyst Intern',
      hourlyWage: 26.0,
      dutiesDescription: 'Healthcare claims data pipeline analytics.',
      hoursPerWeek: 20,
    },
    auditLogs: [
      {
        action: 'Approved',
        actorName: 'Dr. Ghassan Alkadi',
        reviewer: { fullName: 'Dr. Ghassan Alkadi', email: 'galkadi@selu.edu' },
        actionTimestamp: '2026-11-09T11:00:00Z',
        timestamp: '2026-11-09T11:00:00Z',
        comments: 'Approved',
      },
    ],
  },
];

export const FIXTURE_SURVEY_RESPONSES = {
  formId: 4,
  formKey: 'ExitSurvey',
  title: 'Senior Exit Survey',
  responseCount: 14,
  assignedCount: 18,
  byQuestion: {
    overallSatisfaction: {
      questionId: 'overallSatisfaction',
      label: 'Overall Program Satisfaction',
      type: 'choice',
      totalAnswers: 14,
      distribution: [
        { label: 'Very Satisfied', count: 9, percentage: 64.3 },
        { label: 'Satisfied', count: 4, percentage: 28.6 },
        { label: 'Neutral', count: 1, percentage: 7.1 },
        { label: 'Dissatisfied', count: 0, percentage: 0 },
      ],
    },
    postGradPlans: {
      questionId: 'postGradPlans',
      label: 'Post-Graduation Plans',
      type: 'choice',
      totalAnswers: 14,
      distribution: [
        { label: 'Employed Full-Time', count: 11, percentage: 78.6 },
        { label: 'Graduate School', count: 2, percentage: 14.3 },
        { label: 'Seeking Employment', count: 1, percentage: 7.1 },
      ],
    },
    programComments: {
      questionId: 'programComments',
      label: 'Qualitative Program Feedback',
      type: 'textarea',
      quotes: [
        'The hands-on capstone project prepared me exceptionally well for industry work.',
        'Great mentorship from Dr. Alkadi and Dr. Achée during my internship search.',
        'More elective courses in cloud infrastructure would be fantastic.',
      ],
    },
  },
};

export const FIXTURE_PLACEMENTS = [
  { id: 1, studentName: 'Cade Sholar', employer: 'DXC Technology', role: 'Full Stack Software Engineer Intern', hourlyWage: 29.5, gpa: 3.75, classRank: 'Senior' },
  { id: 2, studentName: 'Eliora Browning', employer: 'Acme Software', role: 'Junior QA Engineer', hourlyWage: 25.0, gpa: 3.88, classRank: 'Senior' },
  { id: 3, studentName: 'Marcus Vance', employer: 'DXC Technology', role: 'Cloud Infrastructure Intern', hourlyWage: 29.5, gpa: 3.65, classRank: 'Junior' },
  { id: 4, studentName: 'Sarah Jenkins', employer: 'Blue Cross Blue Shield', role: 'Data Analyst Intern', hourlyWage: 26.0, gpa: 3.52, classRank: 'Junior' },
  { id: 5, studentName: 'Alex Rivera', employer: 'IBM', role: 'Software Developer Intern', hourlyWage: 31.0, gpa: 3.9, classRank: 'Senior' },
  { id: 6, studentName: 'Devon Lee', employer: 'DXC Technology', role: 'Cybersecurity Analyst Intern', hourlyWage: 28.0, gpa: 3.45, classRank: 'Junior' },
  { id: 7, studentName: 'Jordan Smith', employer: 'General Motors', role: 'Embedded Systems Intern', hourlyWage: 27.5, gpa: 3.58, classRank: 'Senior' },
  { id: 8, studentName: 'Taylor Casey', employer: 'IBM', role: 'Backend Engineer Intern', hourlyWage: 30.5, gpa: 3.7, classRank: 'Graduate' },
  { id: 9, studentName: 'Morgan Wright', employer: 'CGI Federal', role: 'Systems Analyst Intern', hourlyWage: 26.5, gpa: 3.4, classRank: 'Sophomore' },
  { id: 10, studentName: 'Sam Patel', employer: 'Blue Cross Blue Shield', role: 'Database Intern', hourlyWage: 25.5, gpa: 3.35, classRank: 'Sophomore' },
];
