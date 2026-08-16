'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { addDays, getCalendar, listDialogs, todayIso } from '../lib/api';
import { useUi } from '../lib/ui';
import { BrandMark, Wordmark } from './BrandMark';
import { Confirm, Drawer } from './Drawer';

/** Russian plural: 1 диалог, 2 диалога, 5 диалогов. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { token, logout } = useAuth();
  const { toast, openDrawer, readOnly, navPrefix, href } = useUi();
  const logical =
    navPrefix && path.startsWith(navPrefix) ? path.slice(navPrefix.length) || '/calendar' : path;
  const [pending, setPending] = useState(0);
  const [objCount, setObjCount] = useState(0);
  const [unread, setUnread] = useState(0);
  const [liveChats, setLiveChats] = useState(0);

  useEffect(() => {
    if (!token) return;
    const from = todayIso();
    getCalendar(token, from, addDays(from, 45))
      .then((r) => {
        setObjCount(r.properties.length);
        setPending(r.events.filter((e) => e.kind === 'booking' && e.status === 'pending').length);
      })
      .catch(() => {});
    listDialogs(token)
      .then((r) => {
        setUnread(r.dialogs.filter((d) => d.unread).length);
        setLiveChats(r.dialogs.length);
      })
      .catch(() => {});
  }, [token, path]);

  const isObj = logical.startsWith('/objects') || logical.startsWith('/apartments');
  const isCal = logical.startsWith('/calendar') || logical === '/';
  const isToday = logical === '/today';
  const isDlg = logical.startsWith('/dialogs');
  const isSet = logical.startsWith('/settings');
  const isPlan = logical.startsWith('/plan');
  const isDs = logical.startsWith('/ds');
  const isCard = /\/(objects|apartments)\/.+/.test(logical);

  const title = isToday
    ? 'Сегодня'
    : isDlg
      ? 'Диалоги'
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
    : isDlg
      ? unread > 0
        ? `${unread} ${plural(unread, 'новый', 'новых', 'новых')}`
        : liveChats > 0
          ? `${liveChats} ${plural(liveChats, 'диалог', 'диалога', 'диалогов')}`
          : 'нет новых'
      : isCal
      ? `${objCount} объектов`
      : isCard
        ? 'данные, по которым отвечает бот'
        : isObj
          ? 'PMS агента'
          : isPlan
            ? 'лимиты и подписка'
            : '';

  const nav = (to: string, icon: string, label: string, on: boolean, count?: number) => (
    <Link href={href(to)} className={`nav-btn${on ? ' on' : ''}`}>
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
          {nav('/dialogs', '◐', 'Диалоги', isDlg, unread)}
          {nav('/calendar', '▤', 'Календарь', isCal)}
          {nav('/objects', '◫', 'Объекты', isObj)}
          {nav('/plan', '◎', 'Тариф', isPlan)}
        </div>
        <div className="nav-sep" />
        <div className="nav">
          {nav('/settings', '⚙', 'Настройки', isSet)}
          {!readOnly && nav('/ds', '◈', 'Дизайн-система', isDs)}
          <button
            className="nav-btn"
            onClick={() => {
              if (readOnly) {
                const org = navPrefix.split('/').pop();
                router.push(org ? `/ops/clients/${org}` : '/ops/clients');
                return;
              }
              logout();
              router.push('/');
            }}
          >
            <span className="nav-ic">⇥</span>
            <span>{readOnly ? 'Закрыть просмотр' : 'Выйти'}</span>
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
        <Link href={href('/today')} className={isToday ? 'on' : ''}>
          <span className="ic">◧</span>
          Сегодня
        </Link>
        {/* On the move the owner checks what the bot answered, so Диалоги takes
            a bar slot and Объекты moves under «Ещё» (§1). */}
        <Link href={href('/dialogs')} className={isDlg ? 'on' : ''}>
          <span className="ic">◐</span>
          Диалоги
        </Link>
        <Link href={href('/calendar')} className={isCal ? 'on' : ''}>
          <span className="ic">▤</span>
          Календарь
        </Link>
        <Link href={href('/settings')} className={isSet || isObj ? 'on' : ''}>
          <span className="ic">⚙</span>
          Ещё
        </Link>
        {!readOnly && !isDlg && (
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
