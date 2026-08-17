'use client';

import { useEffect, useState } from 'react';
import { getPayout, savePayout, type PayoutMethod } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';

/** Org-level Kaspi / pay-link — bot sends guests exactly this, nothing invented. */
export function GuestPay() {
  const { flash, readOnly } = useUi();
  const { token } = useAuth();
  const [method, setMethod] = useState<PayoutMethod>('kaspi_phone');
  const [kaspiPhone, setKaspiPhone] = useState('');
  const [payLink, setPayLink] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    getPayout(token)
      .then((r) => {
        if (r.payout) {
          setMethod(r.payout.method);
          setKaspiPhone(r.payout.kaspiPhone ?? '');
          setPayLink(r.payout.payLink ?? '');
          setSaved(true);
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось загрузить оплату'))
      .finally(() => setLoaded(true));
  }, [token]);

  const save = async () => {
    if (!token || readOnly) return;
    setBusy(true);
    setErr('');
    try {
      await savePayout(token, {
        method,
        ...(method === 'kaspi_phone' ? { kaspiPhone } : { payLink }),
      });
      setSaved(true);
      flash('Способ оплаты сохранён — бот уже шлёт его гостям');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad guest-pay">
      <div>
        <div className="guest-pay-h">Как гости платят</div>
        <div className="guest-pay-s">
          Бот отправит гостю ровно то, что вы укажете: номер для перевода или вашу ссылку. Без своего
          варианта он не выдумает Kaspi.
        </div>
      </div>
      {!loaded ? (
        <div className="skel" style={{ height: 88 }} />
      ) : (
        <>
          <div className="pay-method">
            <button
              type="button"
              className={`pay-opt${method === 'kaspi_phone' ? ' on' : ''}`}
              disabled={readOnly}
              onClick={() => setMethod('kaspi_phone')}
            >
              <b>Перевод на номер / карту</b>
              <span>Гость переводит депозит и остаток на ваш Kaspi или карту.</span>
            </button>
            <button
              type="button"
              className={`pay-opt${method === 'pay_link' ? ' on' : ''}`}
              disabled={readOnly}
              onClick={() => setMethod('pay_link')}
            >
              <b>Ссылка на оплату</b>
              <span>Своя страница Kaspi / QR / платёжка — бот пришлёт её как есть.</span>
            </button>
          </div>
          {method === 'kaspi_phone' ? (
            <label className="field">
              <span>Номер телефона или карты</span>
              <input
                className="inp"
                value={kaspiPhone}
                onChange={(e) => setKaspiPhone(e.target.value)}
                placeholder="+7 777 000 11 22"
                disabled={readOnly}
                autoComplete="tel"
              />
            </label>
          ) : (
            <label className="field">
              <span>Ссылка, которую отправит бот</span>
              <input
                className="inp"
                value={payLink}
                onChange={(e) => setPayLink(e.target.value)}
                placeholder="https://…"
                disabled={readOnly}
                inputMode="url"
              />
            </label>
          )}
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
          {!saved && loaded && (
            <div className="guest-pay-warn">Пока не сохраните — бот не сможет сказать гостю, куда платить.</div>
          )}
          {!readOnly && (
            <div>
              <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
                {busy ? 'Сохраняю…' : 'Сохранить'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
