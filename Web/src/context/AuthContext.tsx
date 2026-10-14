import { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser !== 'undefined') {
        try {
          setUser(JSON.parse(savedUser));
          return;
        } catch (e) {
          console.error('Failed to parse user from local storage');
        }
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.role
          ? (Array.isArray(payload.role) ? payload.role : [payload.role])
          : [];
        const restoredUser: User = {
          email: payload.email || '',
          fullName: payload.name || payload.unique_name || 'User',
          wNumber: payload.wNumber || '',
          roles
        };
        setUser(restoredUser);
        localStorage.setItem('user', JSON.stringify(restoredUser));
      } catch (e) {
        console.error('Failed to decode token on mount', e);
      }
    }
  }, [token]);

  const login = async (email: string) => {
    try {
      const res = await api.post('/auth/login', { email });
      const { token, user: apiUser } = res.data;
      setToken(token);
      localStorage.setItem('token', token);
      
      let userData: User;
      if (apiUser) {
        userData = {
          email: apiUser.email || email,
          fullName: apiUser.fullName || 'User',
          wNumber: apiUser.wNumber || '',
          roles: Array.isArray(apiUser.roles) ? apiUser.roles : []
        };
      } else {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.role
          ? (Array.isArray(payload.role) ? payload.role : [payload.role])
          : [];
        userData = {
          email: payload.email || email,
          fullName: payload.name || payload.unique_name || 'User',
          wNumber: payload.wNumber || '',
          roles
        };
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
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
