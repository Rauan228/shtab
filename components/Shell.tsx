'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useStore } from '../lib/store';
import { Confirm, Drawer } from './Drawer';

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { logout, objectsLabel, bookings, quickAdd, toast, properties } = useStore();

  const pending = bookings.filter((b) => b.st === 'pending').length;
  const isObj = path.startsWith('/objects') || path.startsWith('/apartments');
  const isCal = path.startsWith('/calendar');
  const isToday = path === '/today';
  const isSet = path.startsWith('/settings');
  const isDs = path.startsWith('/ds');

  const title = isToday
    ? 'Сегодня'
    : isCal
      ? 'Календарь занятости'
      : path.match(/\/objects\/.+/) || path.match(/\/apartments\/.+/)
        ? 'Карточка объекта'
        : isObj
          ? objectsLabel
          : isSet
            ? 'Настройки'
            : isDs
              ? 'Дизайн-система'
              : 'Кабинет';

  const readyCount = properties.filter((p) => p.ready).length;
  const pageMeta = isToday
    ? '13 авг 2026 · Asia/Almaty'
    : isCal
      ? `${properties.length} объектов · 30 дней`
      : isObj && !path.match(/\/(objects|apartments)\/.+/)
        ? `${readyCount} из ${properties.length} готовы к продаже`
        : path.match(/\/(objects|apartments)\/.+/)
          ? 'изменения применяются к ответам бота'
          : isSet
            ? 'кабинет владельца'
            : isDs
              ? 'токены и компоненты'
              : '';

  const nav = (href: string, icon: string, label: string, on: boolean, count?: number) => (
    <Link href={href} className={`nav-btn${on ? ' on' : ''}`}>
      <span className="nav-ic">{icon}</span>
      <span>{label}</span>
      {count ? <span className="nav-count">{count}</span> : null}
    </Link>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="side-brand">
          <div className="mark mark-sm">B</div>
          <div>
            <div className="t">Brand</div>
            <div className="s">Кабинет владельца</div>
          </div>
        </div>
        <div className="nav">
          {nav('/today', '◧', 'Сегодня', isToday, pending)}
          {nav('/calendar', '▤', 'Календарь', isCal)}
          {nav('/objects', '◫', objectsLabel, isObj)}
        </div>
        <div className="nav-sep" />
        <div className="nav">
          {nav('/settings', '⚙', 'Настройки', isSet)}
          {nav('/ds', '◈', 'Дизайн-система', isDs)}
          <button
            className="nav-btn"
            onClick={() => {
              logout();
              router.push('/');
            }}
          >
            <span className="nav-ic">⇥</span>
            <span>Выйти</span>
          </button>
        </div>
        <div className="wa-box">
          <div className="t">
            <span className="pulse" />
            WhatsApp подключён
          </div>
          <div className="s">+7 701 234 56 78 · бот отвечает 24/7</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-l">
            <div className="mark mark-xs m-only">B</div>
            <div className="top-title">{title}</div>
            {pageMeta ? <div className="top-meta">{pageMeta}</div> : null}
          </div>
          <div className="top-r">
            <button className="btn btn-sm btn-primary" onClick={quickAdd}>
              + Бронь
            </button>
          </div>
        </header>
        <div className="content fade">{children}</div>
      </div>

      <nav className="mbar">
        <Link href="/calendar" className={isCal ? 'on' : ''}>
          <span className="ic">▤</span>
          Календарь
        </Link>
        <Link href="/objects" className={isObj ? 'on' : ''}>
          <span className="ic">◫</span>
          {objectsLabel}
        </Link>
        <Link href="/today" className={isToday ? 'on' : ''}>
          <span className="ic">◧</span>
          Сегодня
        </Link>
        <Link href="/settings" className={isSet ? 'on' : ''}>
          <span className="ic">⚙</span>
          Ещё
        </Link>
        <button type="button" className="fab" onClick={quickAdd} aria-label="Новая бронь">
          +
        </button>
      </nav>

      <Drawer />
      <Confirm />
      {toast ? (
        <div className="toast">
          <span style={{ color: 'oklch(0.8 0.14 155)' }}>✓</span>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
