'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Login } from '../components/Login';
import { useStore } from '../lib/store';

export default function Home() {
  const { authed } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (authed) router.replace('/calendar');
  }, [authed, router]);
  if (authed) return <div className="boot" />;
  return <Login />;
}
