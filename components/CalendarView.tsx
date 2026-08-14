'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDays,
  formatDateRu,
  getCalendar,
  lifecycleStage,
  nightsBetween,
  todayIso,
  type CalendarEvent,
  type Property,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ST, type CalStatus } from '../lib/status';
import { useUi } from '../lib/ui';

const CW = 38;
const DAY_COUNT = 30;
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

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

  const today = todayIso();
  const from = useMemo(() => addDays(today, offset * 14), [today, offset]);
  const to = useMemo(() => addDays(from, DAY_COUNT), [from]);

  const load = useCallback(async () => {
    if (!token) return;
    setErr('');
    try {
      const r = await getCalendar(token, from, to);
      setProperties(r.properties);
      setEvents(r.events);
      setMProp((id) => id || r.properties[0]?.id || '');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить календарь');
    }
  }, [token, from, to]);

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

  const endDrag = () => {
    if (!drag) return;
    const a = Math.min(drag.a, drag.b);
    const b = Math.max(drag.a, drag.b);
    openDrawer({
      mode: 'booking',
      propertyId: drag.p,
      checkIn: isoFrom(from, a),
      checkOut: isoFrom(from, b + 1),
    });
    setDrag(null);
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
          <div className="cal-wrap desktop-cal" onMouseUp={endDrag} onMouseLeave={() => setDrag(null)}>
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
                        const inDrag =
                          drag && drag.p === p.id && i >= Math.min(drag.a, drag.b) && i <= Math.max(drag.a, drag.b);
                        return (
                          <div
                            key={d.iso}
                            className={`cal-cell${d.weekend ? ' we' : ''}${inDrag ? ' drag' : ''}`}
                            onMouseDown={() => setDrag({ p: p.id, a: i, b: i })}
                            onMouseEnter={() => setDrag((x) => (x && x.p === p.id ? { ...x, b: i } : x))}
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
              Выделите даты мышью, чтобы добавить бронь или блок
            </div>
          </div>

          <div className="m-chips">
            {properties.map((p) => (
              <button key={p.id} className={`m-chip${mProp === p.id ? ' on' : ''}`} onClick={() => setMProp(p.id)}>
                {p.title.split(',')[0]}
              </button>
            ))}
          </div>
          <div className="m-days">
            {days.slice(0, 16).map((dd, i) => {
              const b = mP
                ? events.find(
                    (e) =>
                      e.propertyId === mP.id &&
                      e.status !== 'cancelled' &&
                      dd.iso >= e.begin &&
                      dd.iso < e.end,
                  )
                : undefined;
              const st = b ? eventStatus(b, today) : null;
              const c = st ? ST[st] : null;
              return (
                <div
                  key={dd.iso}
                  className="m-day"
                  onClick={() => {
                    if (b) {
                      openDrawer({
                        mode: 'edit',
                        propertyId: b.propertyId,
                        checkIn: b.begin,
                        checkOut: b.end,
                        eventId: b.id,
                        kind: b.kind,
                      });
                    } else if (mP) {
                      openDrawer({
                        mode: 'booking',
                        propertyId: mP.id,
                        checkIn: dd.iso,
                        checkOut: isoFrom(from, i + 1),
                      });
                    }
                  }}
                >
                  <div className="dn">
                    <div className={`n${dd.today ? ' today' : ''}`}>{dd.num}</div>
                    <div className="w">{dd.wd}</div>
                  </div>
                  <div className="m-pill" style={c ? { background: c.bg, borderColor: c.bd, color: c.fg } : undefined}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 2,
                          background: c ? c.dot : 'oklch(0.8 0.008 250)',
                          flex: 'none',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {b ? (b.kind === 'block' ? b.guestName || 'Недоступно' : b.guestName || 'Бронь') : 'Свободно'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
