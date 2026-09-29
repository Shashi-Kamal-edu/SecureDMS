import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSession, Session } from '../services/auth';
import * as api from '../services/api';
import { can, Permission } from '../utils/permissions';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const s = await api.login(email, password, remember);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setSession(null);
  }, []);

  const canFn = useCallback((permission: Permission) => can(session?.role, permission), [session]);

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, can: canFn }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
