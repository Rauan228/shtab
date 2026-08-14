'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { OPS_TOKEN_KEY, getOpsToken, opsLogin } from './ops-api';

interface OpsAuth {
  ready: boolean;
  token: string | null;
  login: (email: string, password: string, ownerToken: string) => Promise<'ok' | 'denied' | 'bad'>;
  logout: () => void;
}

const Ctx = createContext<OpsAuth | null>(null);

export function OpsAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(getOpsToken());
    setReady(true);
    const sync = () => setToken(getOpsToken());
    window.addEventListener('kz-ops-lost', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('kz-ops-lost', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const login = useCallback(async (email: string, password: string, ownerToken: string) => {
    const result = await opsLogin(email, password, ownerToken);
    if (result === 'ok') setToken(getOpsToken());
    return result;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(OPS_TOKEN_KEY);
    setToken(null);
  }, []);

  return <Ctx.Provider value={{ ready, token, login, logout }}>{children}</Ctx.Provider>;
}

export function useOpsAuth(): OpsAuth {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOpsAuth outside OpsAuthProvider');
  return v;
}
