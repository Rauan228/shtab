'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';
import { Shell } from './Shell';

export function Guard({ children }: { children: ReactNode }) {
  const { authed } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!authed) router.replace('/');
  }, [authed, router]);
  if (!authed) return <div className="boot" />;
  return <Shell>{children}</Shell>;
}
