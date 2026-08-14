'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { TOKEN_KEY, getToken, login as apiLogin } from './api';

interface Auth {
  ready: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getToken());
    setReady(true);
    const sync = () => setToken(getToken());
    window.addEventListener('kz-auth-lost', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('kz-auth-lost', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email.trim(), password);
    if (!session) return false;
    localStorage.setItem(TOKEN_KEY, session);
    setToken(session);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  return <Ctx.Provider value={{ ready, token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
