'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  dayOfWeek,
  formatDateRu,
  formatMonthYear,
  getCalendar,
  lifecycleStage,
  nightsBetween,
  startOfMonth,
  todayIso,
  type CalendarEvent,
  type Property,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ST, type CalStatus } from '../lib/status';
import { useUi } from '../lib/ui';
import { ChevronLeft, ChevronRight } from './icons';

const CW = 38;
const DAY_COUNT = 30;
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WD_MON = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function mondayIndex(iso: string): number {
  const sun = dayOfWeek(iso);
  return sun === 0 ? 6 : sun - 1;
}

function monthCells(monthStart: string): { iso: string; num: number; inMonth: boolean }[] {
  const lead = mondayIndex(monthStart);
  const start = addDays(monthStart, -lead);
  const next = addMonths(monthStart, 1);
  return Array.from({ length: 42 }, (_, i) => {
    const iso = addDays(start, i);
    return { iso, num: Number(iso.slice(8, 10)), inMonth: iso >= monthStart && iso < next };
  });
}

function isoFrom(start: string, i: number): string {
  return addDays(start, i);
}

function eventStatus(e: CalendarEvent, today: string): CalStatus | null {
  if (e.status === 'cancelled') return null;
  if (e.kind === 'block') return 'block';
  const st = lifecycleStage(e, today);
  if (st === 'instay') return 'in_stay';
  if (st === 'done') return 'done';
  if (st === 'pending') return 'pending';
  return 'confirmed';
}

export function CalendarView() {
  const { token } = useAuth();
  const { openDrawer, reloadTick } = useUi();
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<'all' | CalStatus>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState<{ p: string; a: number; b: number } | null>(null);
  const [mProp, setMProp] = useState('');
  const [monthOffset, setMonthOffset] = useState(0);
  const dragRef = useRef(drag);
  const movedRef = useRef(false);
  dragRef.current = drag;

  const today = todayIso();
  const from = useMemo(() => addDays(today, offset * 14), [today, offset]);
  const to = useMemo(() => addDays(from, DAY_COUNT), [from]);
  const monthStart = useMemo(() => addMonths(startOfMonth(today), monthOffset), [today, monthOffset]);
  const mCells = useMemo(() => monthCells(monthStart), [monthStart]);
  const loadFrom = from < mCells[0]!.iso ? from : mCells[0]!.iso;
  const loadTo = to > addDays(mCells[41]!.iso, 1) ? to : addDays(mCells[41]!.iso, 1);

  const load = useCallback(async () => {
    if (!token) return;
    setErr('');
    try {
      const r = await getCalendar(token, loadFrom, loadTo);
      setProperties(r.properties);
      setEvents(r.events);
      setMProp((id) => id || r.properties[0]?.id || '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить календарь');
    }
  }, [token, loadFrom, loadTo]);

  useEffect(() => {
    void load();
  }, [load, reloadTick]);

  const days = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, i) => {
        const iso = isoFrom(from, i);
        const d = new Date(`${iso}T12:00:00Z`);
        return {
          iso,
          num: d.getUTCDate(),
          wd: WD[d.getUTCDay()]!,
          weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6,
          today: iso === today,
        };
      }),
    [from, today],
  );

  const finishRange = useCallback(
    (p: string, i0: number, i1: number) => {
      const a = Math.min(i0, i1);
      const b = Math.max(i0, i1);
      openDrawer({
        mode: 'booking',
        propertyId: p,
        checkIn: isoFrom(from, a),
        checkOut: isoFrom(from, b + 1),
      });
      setDrag(null);
    },
    [from, openDrawer],
  );

  useEffect(() => {
    const up = () => {
      const d = dragRef.current;
      if (!d) return;
      if (movedRef.current && d.a !== d.b) {
        finishRange(d.p, d.a, d.b);
        return;
      }
      setDrag(null);
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [finishRange]);

  const onCellDown = (p: string, i: number) => (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    movedRef.current = false;
    setDrag({ p, a: i, b: i });
  };

  const onCellEnter = (p: string, i: number) => {
    setDrag((x) => {
      if (!x || x.p !== p) return x;
      if (x.b !== i) movedRef.current = true;
      return { ...x, b: i };
    });
  };

  const onCellClick = (p: string, i: number) => {
    if (movedRef.current) return;
    finishRange(p, i, i);
  };

  const filters: { id: 'all' | CalStatus; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'pending', label: 'Ждут' },
    { id: 'confirmed', label: 'Подтв.' },
    { id: 'in_stay', label: 'Живут' },
    { id: 'block', label: 'Блоки' },
  ];

  const mP = properties.find((p) => p.id === mProp) ?? properties[0];

  return (
    <div>
      {err && (
        <div className="err-box" style={{ marginBottom: 12 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}

      <div className="cal-toolbar desktop-cal">
        <div className="cal-nav">
          <button className="btn btn-icon" onClick={() => setOffset((n) => n - 1)}>
            ‹
          </button>
          <button className="btn btn-icon" onClick={() => setOffset((n) => n + 1)}>
            ›
          </button>
          <div className="cal-range">
            {formatDateRu(from)} — {formatDateRu(addDays(to, -1))}
          </div>
          <button className="btn btn-xs" onClick={() => setOffset(0)} style={{ marginLeft: 4 }}>
            Сегодня
          </button>
        </div>
        <div className="filters">
          {filters.map((f) => {
            const on = filter === f.id;
            const c = f.id === 'all' ? null : ST[f.id];
            return (
              <button key={f.id} className={`fbtn${on ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
                {c ? <span className="fdot" style={{ background: c.dot }} /> : null}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {properties.length === 0 && !err ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Пока нет объектов</div>
          <div style={{ fontSize: 13, color: 'oklch(0.55 0.012 250)', maxWidth: 340 }}>
            Добавьте квартиру в разделе «Объекты» — бот начнёт продавать её в WhatsApp.
          </div>
        </div>
      ) : (
        <>
          <div className="cal-wrap desktop-cal">
            <div className="cal-scroll">
              <div className="cal-names">
                <div className="cal-h">Объекты</div>
                {properties.map((p) => (
                  <div key={p.id} className="cal-name">
                    <div style={{ minWidth: 0 }}>
                      <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                        {p.title}
                      </div>
                      <div className="trunc" style={{ fontSize: 10, color: 'oklch(0.6 0.01 250)' }}>
                        {p.basePrice > 0 ? `${p.basePrice.toLocaleString('ru-RU')} ₸` : 'нет цены'} · до {p.maxGuests}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cal-days" style={{ width: days.length * CW }}>
                <div className="cal-days-h">
                  {days.map((d) => (
                    <div key={d.iso} className={`cal-dh${d.today ? ' today' : ''}${d.weekend ? ' we' : ''}`}>
                      <div className="wd">{d.wd}</div>
                      <div className="num">{d.num}</div>
                    </div>
                  ))}
                </div>
                {properties.map((p) => (
                  <div key={p.id} className="cal-track" style={{ width: days.length * CW }}>
                    <div className="cal-cells">
                      {days.map((d, i) => {
                        const inRange = !!(
                          drag &&
                          drag.p === p.id &&
                          i >= Math.min(drag.a, drag.b) &&
                          i <= Math.max(drag.a, drag.b)
                        );
                        return (
                          <div
                            key={d.iso}
                            className={`cal-cell${d.weekend ? ' we' : ''}${inRange ? ' drag' : ''}`}
                            onPointerDown={onCellDown(p.id, i)}
                            onPointerEnter={() => onCellEnter(p.id, i)}
                            onClick={() => onCellClick(p.id, i)}
                          />
                        );
                      })}
                    </div>
                    {events
                      .filter((e) => e.propertyId === p.id && e.status !== 'cancelled')
                      .map((e) => {
                        const st = eventStatus(e, today);
                        if (!st) return null;
                        if (filter !== 'all' && st !== filter) return null;
                        const s = nightsBetween(from, e.begin);
                        const n = nightsBetween(e.begin < from ? from : e.begin, e.end);
                        if (n <= 0 || s >= DAY_COUNT) return null;
                        const left = Math.max(0, s);
                        const width = Math.min(DAY_COUNT - left, n + Math.min(0, s));
                        const c = ST[st];
                        return (
                          <div
                            key={e.id}
                            className="cal-bar"
                            onClick={() =>
                              openDrawer({
                                mode: 'edit',
                                propertyId: e.propertyId,
                                checkIn: e.begin,
                                checkOut: e.end,
                                eventId: e.id,
                                kind: e.kind,
                              })
                            }
                            style={{
                              left: left * CW + 3,
                              width: Math.max(width * CW - 6, 20),
                              background: c.bg,
                              border: `1px solid ${c.bd}`,
                              borderLeft: `3px solid ${c.bd}`,
                              color: c.fg,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: 2, background: c.dot, flex: 'none' }} />
                            <span className="trunc" style={{ flex: 1, fontWeight: 500 }}>
                              {e.kind === 'block' ? e.guestName || 'Недоступно' : e.guestName || 'Бронь'}
                            </span>
                            {e.kind !== 'block' && e.totalPrice ? (
                              <span className="mono" style={{ opacity: 0.75, flex: 'none' }}>
                                {Math.round(e.totalPrice / 1000)}к
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                ))}
                {days.findIndex((d) => d.today) >= 0 && (
                  <div className="today-line" style={{ left: days.findIndex((d) => d.today) * CW + CW / 2 }} />
                )}
              </div>
            </div>
          </div>

          <div className="legend desktop-cal">
            {(Object.keys(ST) as CalStatus[]).map((id) => {
              const c = ST[id];
              return (
                <div key={id} className="leg">
                  <span className="sw" style={{ background: c.bg, border: `1px solid ${c.bd}` }} />
                  {c.label}
                </div>
              );
            })}
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'oklch(0.6 0.01 250)' }}>
              Потяните мышью диапазон — или кликните день и поправьте даты в форме.
            </div>
          </div>

          <div className="m-cal">
            <div className="m-cal-nav">
              <button type="button" className="btn btn-icon" aria-label="Предыдущий месяц" onClick={() => setMonthOffset((n) => n - 1)}>
                <ChevronLeft />
              </button>
              <div className="m-cal-title">{formatMonthYear(monthStart)}</div>
              <button type="button" className="btn btn-icon" aria-label="Следующий месяц" onClick={() => setMonthOffset((n) => n + 1)}>
                <ChevronRight />
              </button>
              <button type="button" className="btn btn-xs" onClick={() => setMonthOffset(0)}>
                Сегодня
              </button>
            </div>
            <label className="m-cal-apt">
              <span>Квартира</span>
              <select
                className="inp"
                value={mP?.id ?? ''}
                onChange={(e) => setMProp(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title.replace(/\s+/g, ' ').trim()}
                  </option>
                ))}
              </select>
            </label>
            <div className="m-cal-wd">
              {WD_MON.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="m-cal-grid">
              {mCells.map((cell) => {
                const b = mP
                  ? events.find(
                      (e) =>
                        e.propertyId === mP.id &&
                        e.status !== 'cancelled' &&
                        cell.iso >= e.begin &&
                        cell.iso < e.end,
                    )
                  : undefined;
                const st = b ? eventStatus(b, today) : null;
                const c = st ? ST[st] : null;
                const isToday = cell.iso === today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className={`m-cal-cell${cell.inMonth ? '' : ' out'}${isToday ? ' today' : ''}${c ? ' busy' : ''}`}
                    style={
                      c
                        ? { background: c.bg, borderColor: c.bd, color: c.fg }
                        : undefined
                    }
                    onClick={() => {
                      if (!mP) return;
                      if (b) {
                        openDrawer({
                          mode: 'edit',
                          propertyId: b.propertyId,
                          checkIn: b.begin,
                          checkOut: b.end,
                          eventId: b.id,
                          kind: b.kind,
                        });
                      } else if (cell.inMonth) {
                        openDrawer({
                          mode: 'booking',
                          propertyId: mP.id,
                          checkIn: cell.iso,
                          checkOut: addDays(cell.iso, 1),
                        });
                      }
                    }}
                  >
                    <span className="m-cal-num">{cell.num}</span>
                    {b ? (
                      <span className="m-cal-dot" style={{ background: c?.dot }} />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="m-cal-leg">
              {(Object.keys(ST) as CalStatus[]).map((id) => (
                <span key={id} className="m-cal-leg-i">
                  <i style={{ background: ST[id].dot }} />
                  {ST[id].short}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
