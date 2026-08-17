'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPayout, savePayout, type PayoutMethod } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';
import { BuildingIcon, CardIcon, ChartIcon, ChevronRight } from './icons';

export function Settings() {
  const { href, flash, readOnly } = useUi();
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
    <div className="set">
      <Link href={href('/reports')} className="card card-pad more-row">
        <span className="more-ic">
          <ChartIcon />
        </span>
        <span>
          <div className="more-t">Отчёты</div>
          <div className="more-s">Загрузка, доход, отмены и откуда пришла бронь</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>
      <Link href={href('/objects')} className="card card-pad more-row">
        <span className="more-ic">
          <BuildingIcon />
        </span>
        <span>
          <div className="more-t">Объекты</div>
          <div className="more-s">Квартиры, цены, фото и инструкции заезда</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>
      <Link href={href('/plan')} className="card card-pad more-row">
        <span className="more-ic">
          <CardIcon />
        </span>
        <span>
          <div className="more-t">Тариф и лимиты</div>
          <div className="more-s">Сколько квартир и диалогов осталось в подписке</div>
        </span>
        <span className="more-go">
          <ChevronRight />
        </span>
      </Link>

      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Как гости платят</div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)', marginTop: 4 }}>
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
              <div style={{ fontSize: 12, color: 'oklch(0.55 0.08 55)', lineHeight: 1.45 }}>
                Пока не сохраните — бот не сможет сказать гостю, куда платить.
              </div>
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

      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Контур</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)' }}>
          Кабинет <b>AmanAI</b> пишет в PMS агента. WhatsApp-бот читает те же квартиры, цены, фото и брони.
        </div>
        <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
          Это ваш личный кабинет: квартиры, календарь и брони видны только вам.
        </div>
      </div>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Регион</div>
        <div className="g2">
          <label className="field">
            <span>Часовой пояс</span>
            <div className="inp">Asia/Almaty (UTC+5)</div>
          </label>
          <label className="field">
            <span>Валюта</span>
            <div className="inp">Тенге, ₸</div>
          </label>
        </div>
      </div>
    </div>
  );
}
