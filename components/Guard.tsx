'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Shell } from './Shell';

export function Guard({ children }: { children: ReactNode }) {
  const { ready, token, mustChangePassword } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !token) router.replace('/');
    else if (ready && token && mustChangePassword) router.replace('/welcome-password');
  }, [ready, token, mustChangePassword, router]);
  if (!ready || !token || mustChangePassword) return <div className="boot" />;
  return <Shell>{children}</Shell>;
}
