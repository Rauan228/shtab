'use client';

import { useEffect, useState } from 'react';
import { getSubscription, type Subscription } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BookingConnect } from './BookingConnect';

/**
 * The «Интеграции» section of the cabinet.
 *
 * Gated twice: the menu item only appears when ops turned on the `integrations`
 * feature, and this page re-checks the flag so a bookmarked URL can't reach the
 * wizard on a client who wasn't granted it.
 */
export function Integrations() {
  const { token } = useAuth();
  const [data, setData] = useState<Subscription | null>(null);
  const [err, setErr] = useState('');

  const load = () => {
    if (!token) return;
    getSubscription(token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось загрузить'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (err) {
    return (
      <div className="err-box">
        <span className="err-dot" />
        {err}
      </div>
    );
  }
  if (!data) return <div className="skel" style={{ height: 180 }} />;

  if (!data.integrations) {
    return (
      <div className="card card-pad" style={{ maxWidth: 640 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Интеграции недоступны</div>
        <div style={{ fontSize: 13, color: 'oklch(0.5 0.01 250)', marginTop: 8, lineHeight: 1.55 }}>
          Раздел подключается по запросу. Напишите нам — включим импорт броней из Booking.com для вашего кабинета.
        </div>
      </div>
    );
  }

  return (
    <div className="set" style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 13, color: 'oklch(0.5 0.01 250)', lineHeight: 1.55 }}>
        Подключите площадки, где вы уже принимаете брони, — их занятые даты попадут в ваш календарь, и бот
        не продаст занятую квартиру.
      </div>
      <BookingConnect token={token ?? ''} booking={data.booking} onChanged={load} />
    </div>
  );
}
