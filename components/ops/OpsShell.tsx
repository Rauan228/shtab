'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useOpsAuth } from '../../lib/ops-auth';
import { BrandMark, Wordmark } from '../BrandMark';
import { LayoutIcon, LogoutIcon, UsersIcon } from '../icons';

export function OpsShell({ children }: { children: ReactNode }) {
  const { ready, token, logout } = useOpsAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (ready && !token) router.replace('/ops/login');
  }, [ready, token, router]);

  if (!ready || !token) return <div className="boot" />;

  const on = (href: string) => path === href || path.startsWith(`${href}/`);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="side-brand">
          <BrandMark size={32} />
          <div>
            <Wordmark />
            <div style={{ fontSize: 10, color: 'var(--fg-faint)', marginTop: 2 }}>Админка AmanAI</div>
          </div>
        </div>
        <div className="nav">
          <Link href="/ops" className={`nav-btn${path === '/ops' ? ' on' : ''}`}>
            <span className="nav-ic">
              <LayoutIcon />
            </span>
            Сводка
          </Link>
          <Link href="/ops/clients" className={`nav-btn${on('/ops/clients') ? ' on' : ''}`}>
            <span className="nav-ic">
              <UsersIcon />
            </span>
            Клиенты
          </Link>
        </div>
        <div className="nav-sep" />
        <div className="nav">
          <button
            className="nav-btn"
            onClick={() => {
              logout();
              router.push('/ops/login');
            }}
          >
            <span className="nav-ic">
              <LogoutIcon />
            </span>
            Выйти
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="top-l">
            <div className="top-title">
              {path === '/ops' ? 'Сводка' : path.startsWith('/ops/clients') ? 'Клиенты' : 'Админка'}
            </div>
            <div className="top-meta">WaveSpeed один · WhatsApp у каждого свой</div>
          </div>
        </header>
        <div className="content fade">{children}</div>
      </div>
    </div>
  );
}
