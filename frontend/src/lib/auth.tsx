'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User { id: string; email: string; name?: string; }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authApi.me().then(r => setUser(r.data.user)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const r = await authApi.register(email, password, name);
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
  };

  const loginDemo = async () => {
    const r = await authApi.demo();
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return <AuthContext.Provider value={{ user, loading, login, register, loginDemo, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
