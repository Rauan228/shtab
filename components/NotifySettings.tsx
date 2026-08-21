'use client';

import { useState } from 'react';
import { saveNotify, testNotify, type OwnerNotify } from '../lib/api';

/**
 * Where the owner gets operational reminders.
 *
 * Two routes, and the difference matters to the owner:
 *  - WhatsApp goes out through their own connected number, nothing to set up
 *    beyond typing the phone they actually read.
 *  - Telegram goes through the shared AmanAI bot, and Telegram forbids a bot
 *    writing first — so they must press Start before we can save a chat id.
 */
export function NotifySettings({
  token,
  notify,
  botUsername,
  onChanged,
}: {
  token: string;
  notify: OwnerNotify;
  botUsername: string;
  onChanged: () => void;
}) {
  const [channel, setChannel] = useState<OwnerNotify['channel']>(notify.channel);
  const [phone, setPhone] = useState(notify.whatsappPhone ?? '');
  const [username, setUsername] = useState(notify.telegramUsername ?? '');
  const [onPayLink, setOnPayLink] = useState(notify.onPayLink !== false);
  const [onLimits, setOnLimits] = useState(notify.onLimits !== false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');
  const [err, setErr] = useState('');

  const save = async () => {
    setBusy(true);
    setOk('');
    setErr('');
    try {
      await saveNotify(token, {
        channel,
        ...(channel === 'whatsapp' ? { whatsappPhone: phone } : {}),
        ...(channel === 'telegram' ? { telegramUsername: username } : {}),
        onPayLink,
        onLimits,
      });
      setOk('Сохранено');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setOk('');
    setErr('');
    try {
      const res = await testNotify(token);
      setOk(`Отправили тестовое сообщение${res.via ? ` в ${res.via === 'telegram' ? 'Telegram' : 'WhatsApp'}` : ''}. Проверьте.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не отправилось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad">
      <div style={{ fontSize: 13, fontWeight: 600 }}>Уведомления хозяину</div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
        Куда писать, когда агент отправил гостю реквизиты и когда заканчивается оплаченный месяц.
      </div>

      <div className="nights-row" style={{ marginTop: 12 }}>
        <button type="button" className={channel === 'whatsapp' ? 'on' : ''} onClick={() => setChannel('whatsapp')}>
          WhatsApp
        </button>
        <button type="button" className={channel === 'telegram' ? 'on' : ''} onClick={() => setChannel('telegram')}>
          Telegram
        </button>
        <button type="button" className={channel === 'off' ? 'on' : ''} onClick={() => setChannel('off')}>
          Выключить
        </button>
      </div>

      {channel === 'whatsapp' && (
        <label className="field" style={{ marginTop: 12 }}>
          <span>Ваш WhatsApp</span>
          <input
            className="inp mono"
            placeholder="+7 701 000 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      )}

      {channel === 'telegram' && (
        <>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Ваш @username в Telegram</span>
            <input
              className="inp mono"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Сначала напишите{' '}
            <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer">
              @{botUsername}
            </a>{' '}
            и нажмите Start — Telegram не разрешает боту писать первым.
          </div>
        </>
      )}

      {channel !== 'off' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={onPayLink} onChange={(e) => setOnPayLink(e.target.checked)} />
            Когда агент отправил гостю реквизиты на оплату
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={onLimits} onChange={(e) => setOnLimits(e.target.checked)} />
            Когда заканчивается оплаченный период
          </label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>
          {busy ? '…' : 'Сохранить'}
        </button>
        {notify.channel !== 'off' && (
          <button className="btn" disabled={busy} onClick={() => void test()}>
            Проверить
          </button>
        )}
      </div>

      {ok && <div style={{ fontSize: 13, color: 'var(--brand-deep)', marginTop: 10 }}>{ok}</div>}
      {err && (
        <div className="err-box" style={{ marginTop: 10 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}
    </div>
  );
}
