'use client';

import { useState } from 'react';
import {
  confirmOpsTelegram,
  startOpsTelegram,
  unbindOpsTelegram,
  type PublicTelegram,
} from '../../lib/ops-api';

/**
 * Telegram login, driven from the browser.
 *
 * MTProto login is a handshake, not a form: request a code, send the code back
 * on the same connection, and possibly answer a 2FA password. The server parks
 * the half-open client and hands us a ticket, so this component is a small state
 * machine over that ticket.
 */
type Step = 'idle' | 'code' | 'password' | 'done';

export function TelegramConnect({
  orgId,
  token,
  telegram,
  onChanged,
}: {
  orgId: string;
  token: string;
  telegram: PublicTelegram;
  onChanged: () => void;
}) {
  const [step, setStep] = useState<Step>('idle');
  const [ticket, setTicket] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const reset = () => {
    setStep('idle');
    setTicket('');
    setCode('');
    setPassword('');
  };

  const start = async () => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await startOpsTelegram(token, orgId, { phone });
      setTicket(res.ticket);
      setStep('code');
      setOk(`Код отправлен в Telegram на ${res.phone}. Он приходит в приложение, не по SMS.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не удалось отправить код');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (withPassword: boolean) => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      const res = await confirmOpsTelegram(token, orgId, {
        ticket,
        ...(withPassword ? { password } : { code }),
        ...(label.trim() ? { label: label.trim() } : {}),
      });
      if (res.needsPassword) {
        setStep('password');
        setOk('У аккаунта включена двухфакторка — введите облачный пароль.');
        return;
      }
      setStep('done');
      setOk(
        res.live
          ? 'Подключено. Агент уже слушает этот Telegram.'
          : 'Сохранено, но аккаунт не поднялся — проверьте логи сервера.',
      );
      reset();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не подтвердилось');
    } finally {
      setBusy(false);
    }
  };

  const unbind = async () => {
    if (
      !window.confirm('Отвязать Telegram? Агент перестанет отвечать в этом аккаунте.')
    ) {
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await unbindOpsTelegram(token, orgId);
      setOk('Telegram отвязан');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не отвязалось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Telegram · живой аккаунт</div>
        <span
          style={{
            fontSize: 12,
            color: telegram.connected ? 'var(--brand-deep)' : 'oklch(0.5 0.01 250)',
          }}
        >
          {telegram.connected ? 'подключён' : 'не подключён'}
        </span>
      </div>

      {telegram.connected ? (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.38 0.012 250)' }}>
          {telegram.username && (
            <div>
              Аккаунт: <span className="mono">@{telegram.username}</span>
            </div>
          )}
          {telegram.label && <div>Метка: {telegram.label}</div>}
          {telegram.checkedAt && (
            <div style={{ fontSize: 11, color: 'oklch(0.5 0.01 250)', marginTop: 4 }}>
              Подключён {new Date(telegram.checkedAt).toLocaleString('ru-RU')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-danger" disabled={busy} onClick={() => void unbind()}>
              Отвязать
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, lineHeight: 1.55, color: 'oklch(0.45 0.012 250)' }}>
            Вводите номер клиента — код придёт <b>в приложение Telegram</b> на этот номер.
            Гость будет видеть обычного человека, а не бота.
          </div>

          {step === 'idle' && (
            <>
              <label className="field">
                <span>Телефон аккаунта</span>
                <input
                  className="inp mono"
                  placeholder="+7 775 839 34 64"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Метка (необяз.)</span>
                <input
                  className="inp"
                  placeholder="Telegram Алматы"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" disabled={busy || !phone.trim()} onClick={() => void start()}>
                {busy ? '…' : 'Выслать код'}
              </button>
            </>
          )}

          {step === 'code' && (
            <>
              <label className="field">
                <span>Код из Telegram</span>
                <input
                  className="inp mono"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" disabled={busy || !code.trim()} onClick={() => void confirm(false)}>
                  {busy ? '…' : 'Подтвердить'}
                </button>
                <button className="btn" disabled={busy} onClick={reset}>
                  Отмена
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <label className="field">
                <span>Пароль двухфакторки</span>
                <input
                  className="inp"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  disabled={busy || !password}
                  onClick={() => void confirm(true)}
                >
                  {busy ? '…' : 'Войти'}
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

      {!telegram.connected && (
        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'oklch(0.55 0.012 250)' }}>
          Свежий номер нельзя сразу пускать в поток: заполните аватар и имя, первые
          2–3 дня — единицы диалогов. Иначе Telegram банит аккаунт.
        </div>
      )}
    </div>
  );
}
