'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDays, formatDateRu, getCalendar, listApartments, todayIso, type CalendarEvent } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';

export function Today() {
  const { token } = useAuth();
  const { openDrawer, reloadTick, href } = useUi();
  const router = useRouter();
  const [ops, setOps] = useState<{ tag: 'заезд' | 'выезд'; obj: string; guest: string; time: string }[]>([]);
  const [pending, setPending] = useState<CalendarEvent[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [notReady, setNotReady] = useState(0);
  const [occ, setOcc] = useState('—');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    const today = todayIso();
    Promise.all([getCalendar(token, today, addDays(today, 30)), listApartments(token)])
      .then(([cal, list]) => {
        const byId = Object.fromEntries(cal.properties.map((p) => [p.id, p.title]));
        setTitles(byId);
        const rows: typeof ops = [];
        for (const e of cal.events) {
          if (e.kind !== 'booking' || e.status === 'cancelled') continue;
          if (e.begin === today) {
            rows.push({ tag: 'заезд', obj: byId[e.propertyId] ?? e.propertyId, guest: e.guestName ?? 'Гость', time: '14:00' });
          }
          if (e.end === today) {
            rows.push({ tag: 'выезд', obj: byId[e.propertyId] ?? e.propertyId, guest: e.guestName ?? 'Гость', time: '12:00' });
          }
        }
        setOps(rows);
        setPending(cal.events.filter((e) => e.kind === 'booking' && e.status === 'pending'));
        setNotReady(list.apartments.filter((a) => !a.archived && !a.ready).length);
        const booked = cal.events.filter((e) => e.kind === 'booking' && e.status !== 'cancelled').length;
        const slots = Math.max(cal.properties.length, 1);
        setOcc(`${Math.min(99, Math.round((booked / slots) * 20))}%`);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Ошибка загрузки'));
  }, [token, reloadTick]);

  return (
    <div>
      {err && (
        <div className="err-box" style={{ marginBottom: 12 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}
      <div className="kpi-grid">
        {[
          { label: 'Заезды сегодня', value: String(ops.filter((o) => o.tag === 'заезд').length), hint: 'по календарю' },
          { label: 'Выезды сегодня', value: String(ops.filter((o) => o.tag === 'выезд').length), hint: 'по календарю' },
          { label: 'Ждут подтверждения', value: String(pending.length), hint: 'pending', warn: true },
          { label: 'Нагрузка', value: occ, hint: 'оценка на 30 дней' },
        ].map((k) => (
          <div key={k.label} className="kpi">
            <div className="l">{k.label}</div>
            <div className="row">
              <div className="v" style={'warn' in k && k.warn ? { color: 'oklch(0.6 0.14 75)' } : undefined}>
                {k.value}
              </div>
              <div className="h">{k.hint}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="today-grid">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-h">Заезды и выезды сегодня</div>
          {ops.length === 0 ? (
            <div className="op-row" style={{ color: 'oklch(0.55 0.012 250)', fontSize: 13 }}>
              На сегодня пусто
            </div>
          ) : (
            ops.map((t, i) => (
              <div key={i} className="op-row">
                <div className={`op-tag ${t.tag === 'заезд' ? 'in' : 'out'}`}>{t.tag}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                    {t.obj}
                  </div>
                  <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>{t.guest}</div>
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {t.time}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h">Ждут подтверждения</div>
            {pending.length === 0 ? (
              <div className="op-row" style={{ color: 'oklch(0.55 0.012 250)', fontSize: 13 }}>
                Нет pending-броней
              </div>
            ) : (
              pending.map((b) => (
                <div key={b.id} className="op-row">
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: 'oklch(0.75 0.14 75)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                      {titles[b.propertyId]} · {b.guestName}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>
                      {formatDateRu(b.begin)} → {formatDateRu(b.end)}
                    </div>
                  </div>
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
              <span style={{ fontSize: 14 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {notReady} {notReady === 1 ? 'объект не готов' : 'объекта не готовы'} к продаже
                </div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.03 80)', marginTop: 3, lineHeight: 1.45 }}>
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
  );
}
