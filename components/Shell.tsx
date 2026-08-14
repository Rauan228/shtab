'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { addDays, getCalendar, todayIso } from '../lib/api';
import { useUi } from '../lib/ui';
import { BrandMark, Wordmark } from './BrandMark';
import { Confirm, Drawer } from './Drawer';

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { token, logout } = useAuth();
  const { toast, openDrawer, readOnly } = useUi();
  const [pending, setPending] = useState(0);
  const [objCount, setObjCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const from = todayIso();
    getCalendar(token, from, addDays(from, 45))
      .then((r) => {
        setObjCount(r.properties.length);
        setPending(r.events.filter((e) => e.kind === 'booking' && e.status === 'pending').length);
      })
      .catch(() => {});
  }, [token, path]);

  const isObj = path.startsWith('/objects') || path.startsWith('/apartments');
  const isCal = path.startsWith('/calendar');
  const isToday = path === '/today';
  const isSet = path.startsWith('/settings');
  const isPlan = path.startsWith('/plan');
  const isDs = path.startsWith('/ds');
  const isCard = /\/(objects|apartments)\/.+/.test(path);

  const title = isToday
    ? 'Сегодня'
    : isCal
      ? 'Календарь занятости'
      : isCard
        ? 'Карточка объекта'
        : isObj
          ? 'Объекты'
          : isPlan
            ? 'Тариф'
            : isSet
              ? 'Настройки'
              : isDs
                ? 'Дизайн-система'
                : 'Кабинет';

  const pageMeta = isToday
    ? `${todayIso()} · Asia/Almaty`
    : isCal
      ? `${objCount} объектов`
      : isCard
        ? 'данные, по которым отвечает бот'
        : isObj
          ? 'PMS агента'
          : isPlan
            ? 'лимиты и подписка'
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
          <BrandMark size={32} />
          <Wordmark />
        </div>
        <div className="nav">
          {nav('/today', '◧', 'Сегодня', isToday, pending)}
          {nav('/calendar', '▤', 'Календарь', isCal)}
          {nav('/objects', '◫', 'Объекты', isObj)}
          {nav('/plan', '◎', 'Тариф', isPlan)}
        </div>
        <div className="nav-sep" />
        <div className="nav">
          {nav('/settings', '⚙', 'Настройки', isSet)}
          {nav('/ds', '◈', 'Дизайн-система', isDs)}
          <button
            className="nav-btn"
            onClick={() => {
              if (readOnly) return;
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
            Агент на VPS
          </div>
          <div className="s">Один PMS: кабинет и WhatsApp читают одни квартиры</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-l">
            <span className="m-only">
              <BrandMark size={24} />
            </span>
            <div className="top-title">{title}</div>
            {pageMeta ? <div className="top-meta">{pageMeta}</div> : null}
          </div>
          <div className="top-r">
            {readOnly ? (
              <span className="badge badge-warn">только просмотр</span>
            ) : (
              <button
                className="btn btn-sm btn-primary"
                onClick={() =>
                  openDrawer({
                    mode: 'booking',
                    propertyId: '',
                    checkIn: todayIso(),
                    checkOut: addDays(todayIso(), 2),
                  })
                }
              >
                + Бронь
              </button>
            )}
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
          Объекты
        </Link>
        <Link href="/today" className={isToday ? 'on' : ''}>
          <span className="ic">◧</span>
          Сегодня
        </Link>
        <Link href="/settings" className={isSet ? 'on' : ''}>
          <span className="ic">⚙</span>
          Ещё
        </Link>
        {!readOnly && (
          <button
            type="button"
            className="fab"
            aria-label="Новая бронь"
            onClick={() =>
              openDrawer({
                mode: 'booking',
                propertyId: '',
                checkIn: todayIso(),
                checkOut: addDays(todayIso(), 2),
              })
            }
          >
            +
          </button>
        )}
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
