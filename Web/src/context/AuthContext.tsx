import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { getMockUser } from '../services/mockData';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const sanitizeRoles = (rawRoles: unknown): string[] => {
  const rolesArray = Array.isArray(rawRoles)
    ? rawRoles
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];
  return rolesArray.filter((r): r is string => typeof r === 'string' && r !== 'Dean');
};

const normalizeUser = (parsed: User): User => {
  const email = (parsed.email || '').trim().toLowerCase();
  const mockProfile = email ? getMockUser(email) : null;
  const isKnownReviewer =
    mockProfile && (mockProfile.roles.includes('Faculty') || mockProfile.roles.includes('Department Head'));
  const sanitized = sanitizeRoles(parsed.roles);
  const roles = isKnownReviewer
    ? sanitizeRoles(mockProfile.roles)
    : sanitized.length > 0
      ? sanitized
      : ['Student'];

  return {
    ...parsed,
    email: parsed.email || email,
    fullName: isKnownReviewer ? mockProfile.fullName : (parsed.fullName || 'User'),
    wNumber: parsed.wNumber || mockProfile?.wNumber || '',
    roles,
    isDesignated: mockProfile?.isDesignated ?? parsed.isDesignated,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (!localStorage.getItem('token')) return null;
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
      return null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token && !user) {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined') {
        try {
          const parsed = JSON.parse(savedUser) as User;
          if (parsed && typeof parsed === 'object') {
            setUser(normalizeUser({
              ...parsed,
              roles: sanitizeRoles(parsed.roles),
            }));
            return;
          }
        } catch {
          console.error('Failed to parse user from local storage');
        }
      }

      if (token && token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts[1]) {
            const payload = JSON.parse(atob(parts[1]));
            const roles = sanitizeRoles(payload.role);
            const isEliora = (payload.email || '').trim().toLowerCase() === 'eliora.browning@selu.edu';
            const restoredUser = normalizeUser({
              email: payload.email || '',
              fullName: payload.name || payload.unique_name || 'User',
              wNumber: payload.wNumber || (isEliora ? 'W0712345' : ''),
              roles
            });
            setUser(restoredUser);
            localStorage.setItem('user', JSON.stringify(restoredUser));
          }
        } catch (e) {
          console.error('Failed to decode token on mount', e);
        }
      }
    }
  }, [token]);

  const login = async (email: string) => {
    try {
      const res = await api.login(email);
      const { token, user: apiUser } = res;
      setToken(token);
      localStorage.setItem('token', token);
      
      let userData: User;
      if (apiUser) {
        const isEliora = (apiUser.email || email).trim().toLowerCase() === 'eliora.browning@selu.edu';
        userData = normalizeUser({
          email: apiUser.email || email,
          fullName: apiUser.fullName || 'User',
          wNumber: isEliora ? (apiUser.wNumber || 'W0712345') : (apiUser.wNumber || ''),
          roles: sanitizeRoles(apiUser.roles)
        });
      } else {
        userData = normalizeUser({
          email,
          fullName: 'User',
          wNumber: '',
          roles: ['Student']
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
