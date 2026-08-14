'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  bindOpsWhatsapp,
  checkOpsWhatsapp,
  getOpsOrg,
  unbindOpsWhatsapp,
  type OpsOrgDetail,
  type PublicWhatsapp,
} from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';

export function OpsClientDetail({ id }: { id: string }) {
  const { token } = useOpsAuth();
  const [data, setData] = useState<OpsOrgDetail | null>(null);
  const [err, setErr] = useState('');
  const [waErr, setWaErr] = useState('');
  const [waOk, setWaOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ apiUrl: '', idInstance: '', apiTokenInstance: '', label: '' });

  const load = () => {
    if (!token) return;
    getOpsOrg(token, id)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'ошибка'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  if (err) return <div className="err-box">{err}</div>;
  if (!data) return <div className="skel" style={{ height: 160 }} />;

  const o = data.org;
  const wa: PublicWhatsapp = o.whatsapp ?? { connected: false };

  const bind = async () => {
    if (!token) return;
    setBusy(true);
    setWaErr('');
    setWaOk('');
    try {
      const res = await bindOpsWhatsapp(token, id, {
        apiUrl: form.apiUrl,
        idInstance: form.idInstance,
        apiTokenInstance: form.apiTokenInstance,
        ...(form.label.trim() ? { label: form.label.trim() } : {}),
      });
      setForm({ apiUrl: '', idInstance: '', apiTokenInstance: '', label: form.label });
      const phone = res.whatsapp.phone ? `+${res.whatsapp.phone}` : 'номер получен';
      setWaOk(
        res.live
          ? `Подключено ${phone}. Бот уже слушает этот WhatsApp.`
          : `Сохранено ${phone}. На VPS процесс не в режиме Green API — перезапусти агент.`,
      );
      load();
    } catch (e) {
      setWaErr(e instanceof Error ? e.message : 'не подключилось');
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    if (!token) return;
    setBusy(true);
    setWaErr('');
    setWaOk('');
    try {
      const res = await checkOpsWhatsapp(token, id);
      if (res.ok) setWaOk(res.whatsapp.phone ? `Авторизован · +${res.whatsapp.phone}` : 'Авторизован');
      else setWaErr(res.error ?? 'Instance не авторизован');
      load();
    } catch (e) {
      setWaErr(e instanceof Error ? e.message : 'проверка не прошла');
    } finally {
      setBusy(false);
    }
  };

  const unbind = async () => {
    if (!token) return;
    if (!window.confirm('Отвязать WhatsApp от этого кабинета? Бот перестанет отвечать на этом номере.')) return;
    setBusy(true);
    setWaErr('');
    setWaOk('');
    try {
      await unbindOpsWhatsapp(token, id);
      setWaOk('WhatsApp отвязан');
      load();
    } catch (e) {
      setWaErr(e instanceof Error ? e.message : 'не отвязалось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="set" style={{ maxWidth: 800 }}>
      <Link href="/ops/clients" style={{ fontSize: 12 }}>
        ← все клиенты
      </Link>
      <div className="card card-pad plan-hero">
        <div>
          <div className="kicker">{o.id}</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>{o.name}</div>
          <div style={{ fontSize: 13, color: 'oklch(0.5 0.01 250)', marginTop: 4 }}>
            {o.planName} · {o.priceKzt.toLocaleString('ru-RU')} ₸/мес · {o.status}
          </div>
        </div>
        <Link href={`/ops/preview/${o.id}/calendar`} className="btn btn-primary">
          Открыть кабинет (просмотр)
        </Link>
      </div>
      <div className="g2">
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Объекты</div>
          <div className="mono" style={{ marginTop: 8, fontSize: 18 }}>
            {data.usage.properties.used} / {data.usage.properties.max}
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Диалоги в этом месяце</div>
          <div className="mono" style={{ marginTop: 8, fontSize: 18 }}>
            {data.usage.dialogs.used} / {data.usage.dialogs.max}
          </div>
          {o.limits.extraDialogs > 0 && (
            <div style={{ fontSize: 11, marginTop: 6 }}>в т.ч. докуплено {o.limits.extraDialogs}</div>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp · Green API</div>
          {wa.connected ? (
            <span style={{ fontSize: 12, color: wa.authorized ? 'var(--brand-deep)' : 'oklch(0.55 0.14 55)' }}>
              {wa.authorized ? 'авторизован' : 'нужен QR'}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'oklch(0.5 0.01 250)' }}>не подключён</span>
          )}
        </div>

        {wa.connected && (
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.38 0.012 250)' }}>
            <div>
              Номер:{' '}
              <span className="mono">{wa.phone ? `+${wa.phone}` : 'ещё не получен'}</span>
            </div>
            <div>
              Instance: <span className="mono">{wa.instanceId}</span>
            </div>
            {wa.label && <div>Метка: {wa.label}</div>}
            {wa.checkedAt && (
              <div style={{ fontSize: 11, color: 'oklch(0.5 0.01 250)', marginTop: 4 }}>
                Проверено {new Date(wa.checkedAt).toLocaleString('ru-RU')}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn" disabled={busy} onClick={() => void recheck()}>
                Проверить сейчас
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={() => void unbind()}>
                Отвязать
              </button>
            </div>
          </div>
        )}

        <div style={{ fontSize: 12, lineHeight: 1.55, color: 'oklch(0.45 0.012 250)' }}>
          В Green API → инстанс клиента → вкладка API. Копируешь три поля. Телефон и статус
          «Авторизован» сервер заберёт сам. <code>mediaUrl</code> не нужен.
          {!wa.connected && ' Пока QR не отсканирован — не сохраняем, бот не поднимется вхолостую.'}
        </div>

        <div className="g2">
          <label className="field">
            <span>apiUrl</span>
            <input
              className="inp"
              placeholder="https://7107.api.greenapi.com"
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>idInstance</span>
            <input
              className="inp"
              placeholder="710722694379"
              value={form.idInstance}
              onChange={(e) => setForm({ ...form, idInstance: e.target.value })}
              autoComplete="off"
            />
          </label>
        </div>
        <label className="field">
          <span>apiTokenInstance</span>
          <input
            className="inp"
            type="password"
            placeholder="полный токен из кабинета Green API"
            value={form.apiTokenInstance}
            onChange={(e) => setForm({ ...form, apiTokenInstance: e.target.value })}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Метка (необяз.)</span>
          <input
            className="inp"
            placeholder="WhatsApp Алматы, основной"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </label>
        <button className="btn btn-primary" disabled={busy} onClick={() => void bind()}>
          {busy ? '…' : wa.connected ? 'Перепривязать и включить' : 'Проверить и подключить'}
        </button>
        {waOk && (
          <div style={{ fontSize: 13, color: 'var(--brand-deep)' }}>{waOk}</div>
        )}
        {waErr && (
          <div className="err-box">
            <span className="err-dot" />
            {waErr}
          </div>
        )}
      </div>

      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>Квартиры клиента</div>
        <ul className="plan-list">
          {data.apartments.map((a) => (
            <li key={a.id}>
              {a.title}
              {a.archived ? ' · скрыта' : ''} · {a.basePrice.toLocaleString('ru-RU')} ₸
            </li>
          ))}
        </ul>
        {data.apartments.length === 0 && (
          <div style={{ fontSize: 13, color: 'oklch(0.5 0.01 250)', marginTop: 8 }}>Пока пусто</div>
        )}
      </div>
    </div>
  );
}
