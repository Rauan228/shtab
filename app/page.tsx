'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Login } from '../components/Login';
import { useAuth } from '../lib/auth';

export default function Home() {
  const { ready, token } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && token) router.replace('/calendar');
  }, [ready, token, router]);
  if (!ready || token) return <div className="boot" />;
  return <Login />;
}
