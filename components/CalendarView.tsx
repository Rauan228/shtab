'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  formatDateRu,
  formatKzt,
  formatMonthYear,
  getCalendar,
  lifecycleStage,
  nightsBetween,
  startOfMonth,
  todayIso,
  type CalendarEvent,
  type Property,
} from '../lib/api';
import { monthCells, staySegLen, staySpan, lastNight, WD_MON } from '../lib/cal';
import { useAuth } from '../lib/auth';
import { ST, type CalStatus } from '../lib/status';
import { useUi } from '../lib/ui';
import { BuildingIcon, CheckIcon, ChevronDown, ChevronLeft, ChevronRight } from './icons';

const CW = 38;
const DAY_COUNT = 30;
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function isoFrom(start: string, i: number): string {
  return addDays(start, i);
}

function aptTitle(p: Property): string {
  return p.title.replace(/\s+/g, ' ').trim();
}

function aptMeta(p: Property): string {
  const price = p.basePrice > 0 ? formatKzt(p.basePrice) : 'нет цены';
  return `${price} · до ${p.maxGuests} гостей`;
}

function stayLabel(e: CalendarEvent): string {
  if (e.kind === 'block') return (e.guestName || 'Блок').replace(/\s+/g, ' ').trim();
  return (e.guestName || 'Бронь').replace(/\s+/g, ' ').trim();
}

function AptPicker({
  properties,
  value,
  onChange,
}: {
  properties: Property[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const selected = properties.find((p) => p.id === value) ?? properties[0];

  useEffect(() => {
    if (!open) return;
    const i = properties.findIndex((p) => p.id === selected?.id);
    setHi(i < 0 ? 0 : i);
    const onDoc = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, properties, selected?.id]);

  useEffect(() => {
    if (!open) return;
    const el = wrapRef.current?.querySelector<HTMLElement>(`[data-idx="${hi}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const p = properties[hi];
        if (p) pick(p.id);
      }
      if (e.key === 'ArrowDown') setHi((i) => (i + 1) % properties.length);
    }
    if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setHi((i) => (i - 1 + properties.length) % properties.length);
    }
  };

  if (!selected) return null;

  return (
    <div className="m-cal-apt" ref={wrapRef}>
      <span id="m-cal-apt-lbl">Квартира</span>
      <button
        ref={btnRef}
        type="button"
        className={`m-cal-apt-btn${open ? ' open' : ''}`}
        aria-labelledby="m-cal-apt-lbl"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
      >
        <span className="m-cal-apt-ic" aria-hidden>
          <BuildingIcon size={16} />
        </span>
        <span className="m-cal-apt-txt">
          <span className="m-cal-apt-name">{aptTitle(selected)}</span>
          <span className="m-cal-apt-meta">{aptMeta(selected)}</span>
        </span>
        <span className="m-cal-apt-chev" aria-hidden>
          <ChevronDown size={16} />
        </span>
      </button>
      {open && (
        <ul className="m-cal-apt-menu" role="listbox" aria-labelledby="m-cal-apt-lbl">
          {properties.map((p, i) => {
            const on = p.id === selected.id;
            return (
              <li key={p.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-idx={i}
                  className={`m-cal-apt-opt${on ? ' on' : ''}${i === hi ? ' hi' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(p.id)}
                >
                  <span className="m-cal-apt-ic" aria-hidden>
                    <BuildingIcon size={15} />
                  </span>
                  <span className="m-cal-apt-txt">
                    <span className="m-cal-apt-name">{aptTitle(p)}</span>
                    <span className="m-cal-apt-meta">{aptMeta(p)}</span>
                  </span>
                  {on ? (
                    <span className="m-cal-apt-check" aria-hidden>
                      <CheckIcon size={16} />
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
          <div style={{ fontSize: 13, color: 'var(--fg-muted)', maxWidth: 340 }}>
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
                      <div className="trunc" style={{ fontSize: 10, color: 'var(--fg-faint)' }}>
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
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--fg-faint)' }}>
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
            <AptPicker properties={properties} value={mP?.id ?? ''} onChange={setMProp} />
            <div className="m-cal-wd">
              {WD_MON.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="m-cal-grid">
              {mCells.map((cell, i) => {
                const col = i % 7;
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
                const last = b ? lastNight(b.end) : '';
                const span = b && last ? staySpan(cell.iso, b.begin, last, col) : null;
                const showName = span === 'start' || span === 'single';
                const segLen = b && last && showName ? staySegLen(cell.iso, last, col) : 0;
                const isToday = cell.iso === today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className={`m-cal-cell${cell.inMonth ? '' : ' out'}${isToday ? ' today' : ''}${c ? ' busy' : ''}${span ? ` span-${span}` : ''}`}
                    style={c ? { color: c.fg } : undefined}
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
                    <span
                      className="m-cal-fill"
                      style={c ? { background: c.bg, boxShadow: `inset 0 0 0 1px ${c.bd}` } : undefined}
                    />
                    <span className="m-cal-num">{cell.num}</span>
                    {showName && b ? (
                      <span
                        className="m-cal-guest"
                        style={{ width: `calc(${segLen} * 100% - 12px)` }}
                      >
                        {stayLabel(b)}
                      </span>
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
