import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { getMockUser } from '../services/mockData';
import type { User } from '../types';
import {
  ADMIN_EMAILS,
  EXIT_SURVEY_EMAILS,
  normalizeUserEmail,
  sanitizeRoles,
} from '../utils/roles';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (parsed: User): User => {
  const email = normalizeUserEmail(parsed.email);
  const mockProfile = email ? getMockUser(email) : null;
  const isAdmin = ADMIN_EMAILS.includes(email) || parsed.roles?.includes('Admin');
  const isKnownReviewer =
    mockProfile && (mockProfile.roles.includes('Faculty') || mockProfile.roles.includes('Department Head'));
  const isExitSurveyReviewer = EXIT_SURVEY_EMAILS.includes(email);

  const sanitized = sanitizeRoles(parsed.roles);
  const roles = isAdmin
    ? Array.from(new Set(['Admin', 'Department Head', 'Faculty', ...sanitized]))
    : isExitSurveyReviewer
      ? ['Exit Survey Reviewer']
      : isKnownReviewer
        ? sanitizeRoles(mockProfile.roles)
        : sanitized.length > 0
          ? sanitized
          : ['Student'];

  return {
    ...parsed,
    email: parsed.email || email,
    fullName: isAdmin
      ? (parsed.fullName && parsed.fullName !== 'Cs' && parsed.fullName !== 'User'
          ? parsed.fullName
          : 'CS Department Admin')
      : isExitSurveyReviewer
        ? 'Dr. Kazim Sekeroglu'
        : isKnownReviewer
          ? mockProfile.fullName
          : (parsed.fullName || 'User'),
    wNumber: parsed.wNumber || mockProfile?.wNumber || '',
    roles,
    isDesignated: isAdmin || (mockProfile?.isDesignated ?? parsed.isDesignated),
  };
};

function restoreInitialUser(): User | null {
  const savedToken = localStorage.getItem('token');
  if (!savedToken) return null;

  try {
    const saved = localStorage.getItem('user');
    if (saved && saved !== 'undefined') {
      const parsed = JSON.parse(saved) as User;
      if (parsed && typeof parsed === 'object') {
        return normalizeUser({
          ...parsed,
          roles: sanitizeRoles(parsed.roles),
        });
      }
    }
  } catch {
    // Ignore malformed localStorage user
  }

  if (savedToken.includes('.')) {
    try {
      const parts = savedToken.split('.');
      if (parts[1]) {
        const payload = JSON.parse(atob(parts[1]));
        const roles = sanitizeRoles(payload.role);
        const isEliora = normalizeUserEmail(payload.email) === 'eliora.browning@selu.edu';
        const restoredUser = normalizeUser({
          email: payload.email || '',
          fullName: payload.name || payload.unique_name || 'User',
          wNumber: payload.wNumber || (isEliora ? 'W0712345' : ''),
          roles,
        });
        localStorage.setItem('user', JSON.stringify(restoredUser));
        return restoredUser;
      }
    } catch {
      // Ignore malformed token payload
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreInitialUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = async (email: string) => {
    try {
      const res = await api.login(email);
      const { token: newToken, user: apiUser } = res;
      setToken(newToken);
      localStorage.setItem('token', newToken);

      let userData: User;
      if (apiUser) {
        const isEliora = normalizeUserEmail(apiUser.email || email) === 'eliora.browning@selu.edu';
        userData = normalizeUser({
          email: apiUser.email || email,
          fullName: apiUser.fullName || 'User',
          wNumber: isEliora ? (apiUser.wNumber || 'W0712345') : (apiUser.wNumber || ''),
          roles: sanitizeRoles(apiUser.roles),
          isDesignated: apiUser.isDesignated,
        });
      } else {
        userData = normalizeUser({
          email,
          fullName: 'User',
          wNumber: '',
          roles: ['Student'],
        });
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!(token && user) }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
