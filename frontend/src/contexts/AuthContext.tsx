import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  email_verified: boolean;
  phone_verified: boolean;
  onboarding_completed: boolean;
  profile?: {
    city?: string;
    state?: string;
    country?: string;
    purpose?: string;
  };
}

export const formatErrorMessage = (err: any): string => {
  if (!err) return 'An unexpected error occurred.';
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join(', ');
  }
  if (detail && typeof detail === 'object') {
    return Object.entries(detail).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  if (err.message) return err.message;
  return 'Request failed. Please try again.';
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (payload: any) => Promise<void>;
  register: (formData: any) => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cartrust_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/me');
        setUser(res.data);
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('cartrust_token');
        localStorage.removeItem('cartrust_refresh_token');
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    const data = res.data;
    localStorage.setItem('cartrust_token', data.access_token);
    localStorage.setItem('cartrust_refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser({
      id: data.user_id,
      email: data.email,
      first_name: data.email.split('@')[0],
      last_name: '',
      roles: data.roles || ['CUSTOMER'],
      email_verified: data.email_verified,
      phone_verified: data.phone_verified,
      onboarding_completed: data.onboarding_completed
    });
  };

  const loginWithGoogle = async (payload: any) => {
    const res = await api.post('/auth/google', payload);
    const data = res.data;
    localStorage.setItem('cartrust_token', data.access_token);
    localStorage.setItem('cartrust_refresh_token', data.refresh_token);
    setToken(data.access_token);
    setUser({
      id: data.user_id,
      email: data.email,
      first_name: payload.first_name || data.email.split('@')[0],
      last_name: payload.last_name || '',
      roles: data.roles || ['CUSTOMER'],
      email_verified: data.email_verified,
      phone_verified: data.phone_verified,
      onboarding_completed: data.onboarding_completed
    });
  };

  const register = async (formData: any) => {
    await api.post('/auth/register', formData);
    await login(formData.email, formData.password);
  };

  const logout = () => {
    localStorage.removeItem('cartrust_token');
    localStorage.removeItem('cartrust_refresh_token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (role: string) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role.toUpperCase()) || user.roles.includes('ADMIN');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, register, logout, setUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
