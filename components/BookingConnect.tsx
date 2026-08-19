'use client';

import { useState } from 'react';
import {
  bookingLogin,
  bookingSync,
  bookingUnbind,
  bookingVerify,
  type BookingStatusPublic,
} from '../lib/api';

/**
 * Booking.com connect wizard — the owner's own flow, run from the cabinet.
 *
 * Booking has no partner API for us, so we log in as the owner through their
 * site in a server-side browser, pass the 2FA code they text, and read the same
 * internal endpoint their extranet uses. Login is a two-step handshake:
 * credentials → (Booking texts a code) → code. The server parks the half-open
 * browser and hands back a ticket, so this is a small state machine over it,
 * mirroring the ops Telegram wizard.
 */
type Step = 'idle' | 'code' | 'done';

export function BookingConnect({
  token,
  booking,
  onChanged,
}: {
  token: string;
  booking?: BookingStatusPublic;
  onChanged: () => void;
}) {
  const connected = Boolean(booking?.connected);
  const dead = booking?.status === 'session_dead';

  const [step, setStep] = useState<Step>('idle');
  const [ticket, setTicket] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const reset = () => {
    setStep('idle');
    setTicket('');
    setPassword('');
    setCode('');
  };

  const start = async () => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await bookingLogin(token, email.trim(), password);
      if ('needsCode' in res) {
        setTicket(res.ticket);
        setStep('code');
        setOk('Booking отправил код — на почту или в приложение. Введите его ниже.');
        return;
      }
      // Connected without a 2FA step.
      setStep('done');
      setOk(`Подключено. Подтянули броней: ${res.reservations}.`);
      reset();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не удалось войти');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await bookingVerify(token, ticket, code.trim());
      setStep('done');
      setOk(`Подключено. Подтянули броней: ${res.reservations}.`);
      reset();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'код не принят');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await bookingSync(token);
      setOk(`Обновлено: +${res.imported}, снято ${res.removed}, всего активных ${res.total}.`);
      onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'не обновилось';
      setErr(msg === 'session_dead' ? 'Вход в Booking истёк — подключите заново.' : msg);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const unbind = async () => {
    if (!window.confirm('Отключить Booking? Календарь перестанет обновляться из Booking.')) return;
    setBusy(true);
    setErr('');
    try {
      await bookingUnbind(token);
      setOk('Booking отключён');
      reset();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не отключилось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Booking.com · импорт броней</div>
        <span
          style={{
            fontSize: 12,
            color: dead
              ? 'oklch(0.55 0.14 55)'
              : connected
                ? 'var(--brand-deep)'
                : 'oklch(0.5 0.01 250)',
          }}
        >
          {dead ? 'вход истёк' : connected ? 'подключён' : 'не подключён'}
        </span>
      </div>

      {connected && !dead ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.38 0.012 250)' }}>
          {booking?.email && (
            <div>
              Аккаунт: <span className="mono">{booking.email}</span>
            </div>
          )}
          {booking?.lastSyncAt && (
            <div style={{ fontSize: 11, color: 'oklch(0.5 0.01 250)', marginTop: 4 }}>
              Обновлено {new Date(booking.lastSyncAt).toLocaleString('ru-RU')}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.01 250)', marginTop: 6 }}>
            Календарь обновляется автоматически каждые ~30 минут. Кнопка ниже — чтобы подтянуть прямо сейчас.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" disabled={busy} onClick={() => void sync()}>
              {busy ? '…' : 'Обновить сейчас'}
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => void unbind()}>
              Отключить
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: 'oklch(0.45 0.012 250)' }}>
            {dead
              ? 'Вход в Booking истёк — войдите заново, чтобы календарь снова обновлялся.'
              : 'Введите логин и пароль от кабинета Booking (extranet). Booking пришлёт код — введите его на следующем шаге. Мы только читаем брони; ничего в Booking не меняем.'}
          </div>

          {step === 'idle' && (
            <>
              <label className="field">
                <span>Логин Booking (email)</span>
                <input
                  className="inp"
                  placeholder="hotel@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Пароль</span>
                <input
                  className="inp"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="btn btn-primary"
                disabled={busy || !email.trim() || !password}
                onClick={() => void start()}
              >
                {busy ? '…' : 'Войти в Booking'}
              </button>
            </>
          )}

          {step === 'code' && (
            <>
              <label className="field">
                <span>Код из Booking</span>
                <input
                  className="inp mono"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={busy || !code.trim()} onClick={() => void confirm()}>
                  {busy ? '…' : 'Подтвердить'}
                </button>
                <button className="btn" disabled={busy} onClick={reset}>
                  Отмена
                </button>
              </div>
            </>
          )}
        </>
      )}

      {ok && <div style={{ fontSize: 13, color: 'var(--brand-deep)' }}>{ok}</div>}
      {err && (
        <div className="err-box">
          <span className="err-dot" />
          {err}
        </div>
      )}
    </div>
  );
}
