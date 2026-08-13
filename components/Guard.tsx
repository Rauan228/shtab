'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { Shell } from './Shell';

export function Guard({ children }: { children: ReactNode }) {
  const { ready, token } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !token) router.replace('/');
  }, [ready, token, router]);
  if (!ready || !token) return <div className="boot" />;
  return <Shell>{children}</Shell>;
}
