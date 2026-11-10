export interface QuickNote {
  id: string;
  label: string;
  text: string;
}

export const DEFAULT_QUICK_NOTES: QuickNote[] = [
  {
    id: 'qn-duties',
    label: 'Unqualified Duties',
    text: 'The submitted job description does not satisfy the advanced technical computing criteria required for CMPS 400 course credit. Please provide more detailed software/engineering responsibilities.',
  },
  {
    id: 'qn-email',
    label: 'Missing Supervisor Work Email',
    text: 'Please provide an official corporate/work email address for your internship supervisor (generic personal domains like Gmail or Yahoo cannot be accepted).',
  },
  {
    id: 'qn-gpa',
    label: 'GPA Prerequisite',
    text: 'Your major GPA does not currently satisfy the minimum 2.50 threshold required for internship elective credit.',
  },
  {
    id: 'qn-hours',
    label: 'Dates / Hours Mismatch',
    text: 'The internship dates or weekly hours listed do not meet the minimum requirement (typically 150-200 hours) for the enrolled semester.',
  },
];

const STORAGE_KEY = 'selu_dept_head_quick_notes';

export function getQuickNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUICK_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_QUICK_NOTES;
  } catch {
    return DEFAULT_QUICK_NOTES;
  }
}

export function saveQuickNotes(notes: QuickNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save quick notes:', e);
  }
}
