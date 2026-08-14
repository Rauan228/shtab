'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { MUST_CHANGE_KEY, TOKEN_KEY, getToken, login as apiLogin } from './api';

interface Auth {
  ready: boolean;
  token: string | null;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearMustChange: () => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({
  children,
  tokenOverride,
}: {
  children: ReactNode;
  tokenOverride?: string;
}) {
  const [token, setToken] = useState<string | null>(tokenOverride ?? null);
  const [mustChangePassword, setMustChange] = useState(false);
  const [ready, setReady] = useState(Boolean(tokenOverride));

  useEffect(() => {
    if (tokenOverride !== undefined) {
      setToken(tokenOverride);
      setReady(true);
      return;
    }
    setToken(getToken());
    setMustChange(typeof window !== 'undefined' && localStorage.getItem(MUST_CHANGE_KEY) === '1');
    setReady(true);
    const sync = () => setToken(getToken());
    window.addEventListener('kz-auth-lost', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('kz-auth-lost', sync);
      window.removeEventListener('storage', sync);
    };
  }, [tokenOverride]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email.trim(), password);
    if (!session) return false;
    localStorage.setItem(TOKEN_KEY, session.token);
    if (session.mustChangePassword) localStorage.setItem(MUST_CHANGE_KEY, '1');
    else localStorage.removeItem(MUST_CHANGE_KEY);
    setMustChange(session.mustChangePassword);
    setToken(session.token);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MUST_CHANGE_KEY);
    setMustChange(false);
    setToken(null);
  }, []);

  const clearMustChange = useCallback(() => {
    localStorage.removeItem(MUST_CHANGE_KEY);
    setMustChange(false);
  }, []);

  return (
    <Ctx.Provider value={{ ready, token, mustChangePassword, login, logout, clearMustChange }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): Auth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
