/**
 * Extracts accurate initials from a user's full name or email address.
 * Automatically filters out honorifics (e.g. Dr., Prof.) and falls back to
 * email prefix if name is generic (e.g. "Test User" / "User").
 */
export function getInitials(name?: string, email?: string): string {
  let cleanName = (name || '').trim();

  // If the name is generic or missing, try deriving from email
  const isGeneric = !cleanName || cleanName.toLowerCase() === 'test user' || cleanName.toLowerCase() === 'user';
  if (isGeneric && email) {
    const prefix = email.split('@')[0];
    const stripped = prefix.replace(/[-_]?\d+$/, '');
    const parts = stripped.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
  }

  if (!cleanName) return 'U';

  // Strip common titles/honorifics
  const titles = ['dr.', 'dr', 'prof.', 'prof', 'mr.', 'mr', 'mrs.', 'mrs', 'ms.', 'ms', 'dean'];
  const words = cleanName.split(/\s+/).filter(w => !titles.includes(w.toLowerCase().trim()));

  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  if (words.length === 1 && words[0].length > 0) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return cleanName.substring(0, 2).toUpperCase();
}
