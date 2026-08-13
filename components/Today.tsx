'use client';

import { useRouter } from 'next/navigation';
import { TODAY_OPS } from '../lib/demo';
import { fmtKzt } from '../lib/format';
import { drawerDates, useStore } from '../lib/store';

export function Today() {
  const router = useRouter();
  const { bookings, properties, days, openBooking } = useStore();
  const pending = bookings.filter((b) => b.st === 'pending');
  const notReady = properties.filter((p) => !p.ready).length;

  return (
    <div>
      <div className="kpi-grid">
        {[
          { label: 'Заезды сегодня', value: '3', hint: 'после 14:00' },
          { label: 'Выезды сегодня', value: '2', hint: 'до 12:00' },
          { label: 'Ждут подтверждения', value: String(pending.length), hint: 'бот держит даты', warn: true },
          { label: 'Занятость на 30 дней', value: '68%', hint: '+6% к июлю' },
        ].map((k) => (
          <div key={k.label} className="kpi">
            <div className="l">{k.label}</div>
            <div className="row">
              <div className="v" style={k.warn ? { color: 'oklch(0.6 0.14 75)' } : undefined}>
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
          {TODAY_OPS.map((t) => (
            <div key={t.obj + t.time} className="op-row">
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
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Ждут подтверждения</span>
              <span style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)', fontWeight: 400 }}>
                бот держит даты 2 часа
              </span>
            </div>
            {pending.map((b) => {
              const p = properties.find((x) => x.id === b.p);
              const dates = drawerDates(days, b.s, b.n);
              return (
                <div key={b.id} className="op-row">
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: 'oklch(0.75 0.14 75)', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                      {p?.title} · {b.name}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>
                      {dates.inDate} → {b.n} ночи · {fmtKzt(b.price || 0)} ₸
                    </div>
                  </div>
                  <button className="btn btn-xs" onClick={() => openBooking(b)}>
                    Открыть
                  </button>
                </div>
              );
            })}
          </div>
          {notReady > 0 && (
            <div className="warn-card">
              <span style={{ fontSize: 14 }}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {notReady} объекта не готовы к продаже
                </div>
                <div style={{ fontSize: 12, color: 'oklch(0.45 0.03 80)', marginTop: 3, lineHeight: 1.45 }}>
                  Бот их не предлагает: нет цены или инструкций для заезда.
                </div>
                <button className="btn btn-xs" style={{ marginTop: 10 }} onClick={() => router.push('/objects')}>
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
