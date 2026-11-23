import type { User } from '../types';

export const REVIEWER_ROLES = ['Admin', 'Department Head', 'Faculty'] as const;
export const ADMIN_ROLES = ['Admin', 'Department Head'] as const;
export const EXIT_SURVEY_ROLE = 'Exit Survey Reviewer';

export const EXIT_SURVEY_EMAILS = [
  'kazim.sekeroglu@selu.edu',
  'kazim.sekeroglu@southeastern.edu',
  'ksekeroglu@selu.edu',
  'ksekeroglu@southeastern.edu',
];

export const ADMIN_EMAILS = [
  'cs@southeastern.edu',
  'cs@selu.edu',
];

export function sanitizeRoles(rawRoles: unknown): string[] {
  const rolesArray = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];
  return rolesArray.filter((r): r is string => typeof r === 'string' && r !== 'Dean');
}

export function normalizeUserEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const email = normalizeUserEmail(user.email);
  return Boolean(user.roles?.includes('Admin')) || ADMIN_EMAILS.includes(email);
}

export function isDepartmentHeadUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return isAdminUser(user) || Boolean(user.roles?.includes('Department Head'));
}

export function hasReviewerRole(roles?: string[]): boolean {
  return Boolean(roles?.some((r) => (REVIEWER_ROLES as readonly string[]).includes(r)));
}

export function isExitSurveyOnly(roles?: string[]): boolean {
  return Boolean(roles?.includes(EXIT_SURVEY_ROLE) && !hasReviewerRole(roles));
}

/**
 * Validates whether the signed-in user is authorized to access the Computer Science
 * placement and outcomes analytics console:
 * - Admin (cs@southeastern.edu / 'Admin' role)
 * - CS Department Head ('Department Head' role)
 * - Designated CS Faculty (user.isDesignated === true)
 */
export function canAccessAnalytics(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isDepartmentHeadUser(user)) return true;
  if (user.roles?.includes('Faculty') && Boolean(user.isDesignated)) return true;
  return false;
}
