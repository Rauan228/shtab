'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  addDays,
  cabinetCalendarWindow,
  formatDateLong,
  formatDateRu,
  formatKzt,
  getCalendar,
  listApartments,
  listDialogs,
  nightsBetween,
  todayIso,
  waitingPayHint,
  type CalendarEvent,
  type Property,
} from '../lib/api';
import { mondayIndex } from '../lib/cal';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';
import {
  AlertIcon,
  BanIcon,
  CalendarIcon,
  ChevronDown,
  DoorInIcon,
  DoorOutIcon,
  HomeIcon,
  UsersIcon,
} from './icons';

type Period = 'today' | 'yesterday' | 'tomorrow' | 'week';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Сегодня' },
  { id: 'yesterday', label: 'Вчера' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'week', label: 'Неделя' },
];

function periodWindow(kind: Period, today: string): { from: string; to: string; days: string[]; label: string } {
  if (kind === 'week') {
    const from = addDays(today, -mondayIndex(today));
    const to = addDays(from, 7);
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    return { from, to, days, label: `${formatDateRu(from)} — ${formatDateRu(addDays(to, -1))}` };
  }
  const day = kind === 'yesterday' ? addDays(today, -1) : kind === 'tomorrow' ? addDays(today, 1) : today;
  return { from: day, to: addDays(day, 1), days: [day], label: formatDateLong(day) };
}

function isStay(e: CalendarEvent, day: string): boolean {
  return e.kind === 'booking' && e.status !== 'cancelled' && e.begin <= day && day < e.end;
}

function nightlyShare(e: CalendarEvent): number {
  const n = nightsBetween(e.begin, e.end);
  if (n <= 0 || !e.totalPrice) return 0;
  return e.totalPrice / n;
}

export function Today() {
  const { token } = useAuth();
  const { openDrawer, reloadTick, href, readOnly } = useUi();
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('today');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [notReady, setNotReady] = useState(0);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [aptsOpen, setAptsOpen] = useState(false);
  const [chatByBooking, setChatByBooking] = useState<Record<string, string>>({});

  const today = todayIso();
  const win = useMemo(() => periodWindow(period, today), [period, today]);
  const snapDay = win.days.includes(today) ? today : win.from;

  useEffect(() => {
    if (!token) return;
    let live = true;
    const { from, to } = cabinetCalendarWindow(today);
    setLoading(true);
    getCalendar(token, from, to)
      .then((cal) => {
        if (!live) return;
        setProperties(cal.properties);
        setEvents(cal.events);
        setErr('');
      })
      .catch((e) => {
        if (live) setErr(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    listDialogs(token)
      .then((r) => {
        if (!live) return;
        const map: Record<string, string> = {};
        for (const d of r.dialogs) if (d.booking) map[d.booking.id] = d.chatId;
        setChatByBooking(map);
      })
      .catch(() => {});

    listApartments(token)
      .then((list) => {
        if (live) setNotReady(list.apartments.filter((a) => !a.archived && !a.ready).length);
      })
      .catch(() => {});

    return () => {
      live = false;
    };
  }, [token, reloadTick, today]);

  const titles = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p.title])),
    [properties],
  );

  const stats = useMemo(() => {
    const apts = properties.filter((p) => !p.archived);
    const aptN = Math.max(apts.length, 1);
    const byProp = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = byProp.get(e.propertyId);
      if (list) list.push(e);
      else byProp.set(e.propertyId, [e]);
    }
    const rows = (id: string) => byProp.get(id) ?? [];
    const stayOn = (id: string, day: string) => rows(id).find((e) => isStay(e, day));
    const blockOn = (id: string, day: string) =>
      rows(id).find((e) => e.kind === 'block' && e.begin <= day && day < e.end);

    let guestNights = 0;
    let blockNights = 0;
    let revenue = 0;
    const occByDay: { iso: string; pct: number }[] = [];
    const occByApt = apts.map((p) => {
      const stay = stayOn(p.id, snapDay);
      const blocked = !stay && blockOn(p.id, snapDay);
      return {
        id: p.id,
        title: p.title,
        state: (stay ? 'busy' : blocked ? 'block' : 'free') as 'busy' | 'free' | 'block',
        guest: stay?.guestName,
      };
    });

    for (const day of win.days) {
      let occ = 0;
      for (const p of apts) {
        const stay = stayOn(p.id, day);
        if (stay) {
          occ += 1;
          guestNights += 1;
          revenue += nightlyShare(stay);
        } else if (blockOn(p.id, day)) {
          blockNights += 1;
        }
      }
      occByDay.push({ iso: day, pct: Math.round((occ / aptN) * 100) });
    }

    const sellable = Math.max(apts.length * win.days.length - blockNights, 0);
    const occPct = sellable > 0 ? Math.round((guestNights / sellable) * 100) : 0;
    const adr = guestNights > 0 ? revenue / guestNights : 0;
    const revpar = apts.length * win.days.length > 0 ? revenue / (apts.length * win.days.length) : 0;

    const ins = events.filter((e) => e.kind === 'booking' && e.status !== 'cancelled' && win.days.includes(e.begin));
    const outs = events.filter((e) => e.kind === 'booking' && e.status !== 'cancelled' && win.days.includes(e.end));
    const staying = events.filter((e) => isStay(e, snapDay));
    const pending = events.filter((e) => e.kind === 'booking' && e.status === 'pending');
    const free = apts.filter(
      (p) =>
        !events.some((e) => e.propertyId === p.id && e.status !== 'cancelled' && e.begin <= snapDay && snapDay < e.end),
    );
    const blocked = events.filter((e) => e.kind === 'block' && e.begin < win.to && win.from < e.end);

    const ops: { tag: 'заезд' | 'выезд'; obj: string; guest: string; time: string; day: string; event: CalendarEvent }[] =
      [];
    for (const e of ins) {
      ops.push({
        tag: 'заезд',
        obj: titles[e.propertyId] ?? e.propertyId,
        guest: e.guestName ?? 'Гость',
        time: '14:00',
        day: e.begin,
        event: e,
      });
    }
    for (const e of outs) {
      ops.push({
        tag: 'выезд',
        obj: titles[e.propertyId] ?? e.propertyId,
        guest: e.guestName ?? 'Гость',
        time: '12:00',
        day: e.end,
        event: e,
      });
    }
    ops.sort((a, b) => a.day.localeCompare(b.day) || (a.tag === 'выезд' ? -1 : 1));

    return {
      apts,
      occPct,
      adr,
      revpar,
      revenue,
      occByDay,
      occByApt,
      ins,
      outs,
      staying,
      pending,
      free,
      blocked,
      ops,
    };
  }, [events, properties, win, snapDay, titles]);

  const tiles: { label: string; value: number; hint: string; tone: string; icon: ReactNode }[] = [
    { label: 'Заезд', value: stats.ins.length, hint: 'по календарю', tone: 'in', icon: <DoorInIcon size={18} /> },
    { label: 'Выезд', value: stats.outs.length, hint: 'по календарю', tone: 'out', icon: <DoorOutIcon size={18} /> },
    { label: 'Проживают', value: stats.staying.length, hint: formatDateRu(snapDay), tone: 'stay', icon: <UsersIcon size={18} /> },
    { label: 'Ждут', value: stats.pending.length, hint: 'оплата', tone: 'wait', icon: <AlertIcon size={18} /> },
    { label: 'Свободно', value: stats.free.length, hint: formatDateRu(snapDay), tone: 'free', icon: <HomeIcon size={18} /> },
    { label: 'Блоки', value: stats.blocked.length, hint: 'сняты с продажи', tone: 'block', icon: <BanIcon size={18} /> },
  ];

  return (
    <div className="dash">
      {err && (
        <div className="err-box" style={{ marginBottom: 12 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}

      <div className="dash-hello">
        <h1>Сводка</h1>
        <p>Как дела по квартирам за период — заезды, загрузка и деньги с броней.</p>
        <div className="dash-period">
          <div className="seg">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" className={period === p.id ? 'on' : ''} onClick={() => setPeriod(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="dash-date">{win.label}</div>
        </div>
      </div>

      <div className="dash-sec">
        <div className="dash-sec-h">
          <span>Операционные показатели</span>
          {!readOnly && (
            <button
              type="button"
              className="dash-link"
              onClick={() =>
                openDrawer({
                  mode: 'booking',
                  propertyId: stats.apts[0]?.id ?? '',
                  checkIn: snapDay,
                  checkOut: addDays(snapDay, 1),
                })
              }
            >
              Добавить бронь
            </button>
          )}
        </div>
        <div className="card dash-ops-wrap">
          <div className="dash-ops">
            {tiles.map((t) => (
              <div key={t.label} className="dash-tile">
                <span className={`dash-tile-ic ${t.tone}`}>{t.icon}</span>
                <div>
                  <div className="dash-tile-n">{t.value}</div>
                  <div className="dash-tile-l">{t.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dash-sec">
        <div className="dash-sec-h">
          <span>Загрузка и деньги</span>
          <Link href={href('/calendar')} className="dash-link">
            Календарь
          </Link>
        </div>
        <div className="dash-fin">
          <div className="card dash-occ">
            <div className="dash-occ-ring">
              <svg viewBox="0 0 36 36" aria-hidden>
                <circle className="dash-occ-bg" cx="18" cy="18" r="15.5" />
                <circle
                  className="dash-occ-fg"
                  cx="18" cy="18" r="15.5"
                  pathLength="100"
                  strokeDasharray={`${stats.occPct} ${100 - stats.occPct}`}
                />
              </svg>
              <div className="dash-occ-val">{stats.occPct}%</div>
            </div>
            <div className="dash-occ-meta">
              <div className="dash-occ-title">Загрузка</div>
              <div className="dash-occ-sub">
                {stats.staying.length} из {stats.apts.length}{' '}
                {stats.apts.length === 1 ? 'квартиры' : 'квартир'} на {formatDateRu(snapDay)}
              </div>
              {stats.occByDay.length > 1 ? (
                <div className="dash-bars" aria-hidden>
                  {stats.occByDay.map((d) => (
                    <div key={d.iso} className="dash-bar">
                      <div className="dash-bar-track">
                        <i style={{ height: `${Math.max(d.pct, d.pct > 0 ? 8 : 0)}%` }} />
                      </div>
                      <span>{d.iso.slice(8)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="card dash-money">
            <div className="dash-money-row">
              <span>Доход</span>
              <strong className="ok">{formatKzt(stats.revenue)}</strong>
            </div>
            <div className="dash-money-row faint">
              <span>по броням периода</span>
              <span>{stats.occByDay.length === 1 ? '1 ночь' : `${stats.occByDay.length} ночей`}</span>
            </div>
            <div className="dash-money-split">
              <div>
                <div className="dash-money-k">ADR</div>
                <div className="dash-money-v">{stats.adr ? formatKzt(stats.adr) : '—'}</div>
                <div className="dash-money-h">средняя цена занятой ночи</div>
              </div>
              <div>
                <div className="dash-money-k">RevPAR</div>
                <div className="dash-money-v">{stats.revpar ? formatKzt(stats.revpar) : '—'}</div>
                <div className="dash-money-h">доход на квартиру за ночь</div>
              </div>
            </div>
          </div>
        </div>
        <div className="card dash-apts">
          <button
            type="button"
            className={`dash-apts-toggle${aptsOpen ? ' open' : ''}`}
            aria-expanded={aptsOpen}
            onClick={() => setAptsOpen((v) => !v)}
          >
            <span className="dash-apts-toggle-l">
              <ChevronDown size={16} />
              Квартиры
              <em>{stats.occByApt.length}</em>
            </span>
            <span className="dash-apts-sum">
              <i className="busy" />
              {stats.occByApt.filter((a) => a.state === 'busy').length} занято
              <i className="free" />
              {stats.occByApt.filter((a) => a.state === 'free').length} свободно
            </span>
          </button>
          {aptsOpen &&
            (stats.occByApt.length === 0 ? (
              <div className="op-row" style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
                {loading ? 'Загрузка…' : 'Нет объектов'}
              </div>
            ) : (
              stats.occByApt.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="dash-apt"
                  onClick={() => router.push(href('/calendar'))}
                >
                  <span className="dash-apt-txt">
                    <span className="trunc">{a.title}</span>
                    {a.guest ? <span className="dash-apt-guest">{a.guest}</span> : null}
                  </span>
                  <span className={`dash-st ${a.state}`}>
                    {a.state === 'busy' ? 'Занято' : a.state === 'block' ? 'Блок' : 'Свободно'}
                  </span>
                </button>
              ))
            ))}
        </div>
      </div>

      <div className="dash-sec">
        <div className="dash-sec-h">
          <span>В работе</span>
        </div>
        <div className="today-grid">
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h">Заезды и выезды</div>
            {stats.ops.length === 0 ? (
              <div className="op-row" style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
                На период пусто
              </div>
            ) : (
              stats.ops.map((t, i) => (
                <button
                  key={`${t.event.id}-${t.tag}-${i}`}
                  type="button"
                  className="op-row dash-op"
                  onClick={() =>
                    openDrawer({
                      mode: 'edit',
                      propertyId: t.event.propertyId,
                      checkIn: t.event.begin,
                      checkOut: t.event.end,
                      eventId: t.event.id,
                      kind: 'booking',
                    })
                  }
                >
                  <div className={`op-tag ${t.tag === 'заезд' ? 'in' : 'out'}`}>{t.tag}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                      {t.obj}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                      {t.guest}
                      {period === 'week' ? ` · ${formatDateRu(t.day)}` : ''}
                    </div>
                  </div>
                  <div className="op-time mono" style={{ fontSize: 12 }}>
                    {t.time}
                  </div>
                </button>
              ))
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-h">Ждут подтверждения</div>
              {stats.pending.length === 0 ? (
                <div className="op-row" style={{ color: 'var(--fg-muted)', fontSize: 13 }}>
                  Нет броней в ожидании оплаты
                </div>
              ) : (
                stats.pending.map((b) => (
                  <div key={b.id} className="op-row">
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: 'oklch(0.75 0.14 75)', flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                        {titles[b.propertyId]} · {b.guestName}
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        {formatDateRu(b.begin)} → {formatDateRu(b.end)} · {waitingPayHint(b.paymentPhase)}
                      </div>
                    </div>
                    {chatByBooking[b.id] ? (
                      <Link href={href(`/dialogs/${chatByBooking[b.id]}`)} className="btn btn-xs">
                        Чат
                      </Link>
                    ) : null}
                    <button
                      className="btn btn-xs"
                      onClick={() =>
                        openDrawer({
                          mode: 'edit',
                          propertyId: b.propertyId,
                          checkIn: b.begin,
                          checkOut: b.end,
                          eventId: b.id,
                          kind: 'booking',
                        })
                      }
                    >
                      Открыть
                    </button>
                  </div>
                ))
              )}
            </div>
            {notReady > 0 && (
              <div className="warn-card">
                <CalendarIcon size={16} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {notReady} {notReady === 1 ? 'объект не готов' : 'объекта не готовы'} к продаже
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--warn-fg)', marginTop: 3, lineHeight: 1.45 }}>
                    Бот их слабо продаёт: нет цены или инструкций заезда.
                  </div>
                  <button className="btn btn-xs" style={{ marginTop: 10 }} onClick={() => router.push(href('/objects'))}>
                    Проверить объекты
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
