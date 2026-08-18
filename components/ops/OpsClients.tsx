'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createOpsOrg, listOpsOrgs, type OpsOrgRow } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';

export function OpsClients() {
  const { token } = useOpsAuth();
  const [rows, setRows] = useState<OpsOrgRow[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'start',
    ownerName: '',
  });

  const load = () => {
    if (!token) return;
    listOpsOrgs(token)
      .then((r) => setRows(r.orgs))
      .catch((e) => setErr(e instanceof Error ? e.message : 'ошибка'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const create = async () => {
    if (!token) return;
    setBusy(true);
    setErr('');
    try {
      await createOpsOrg(token, {
        name: form.name,
        email: form.email,
        password: form.password,
        plan: form.plan,
        ...(form.ownerName ? { ownerName: form.ownerName } : {}),
      });
      setOpen(false);
      setForm({ name: '', email: '', password: '', plan: 'start', ownerName: '' });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не создалось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="set" style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Кабинеты</div>
        <button className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
          {open ? 'Закрыть' : '+ Новый клиент'}
        </button>
      </div>

      {open && (
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="g2">
            <label className="field">
              <span>Название</span>
              <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="field">
              <span>Тариф</span>
              <select className="inp" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                <option value="start">Старт · 4 кв · 80 диалогов</option>
                <option value="business">Бизнес · 15 кв · 200 диалогов</option>
                <option value="pro">Про · 30 кв · 500 диалогов</option>
              </select>
            </label>
          </div>
          <div className="g2">
            <label className="field">
              <span>Email входа</span>
              <input className="inp" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="field">
              <span>Пароль</span>
              <input
                className="inp"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
          </div>
          <label className="field">
            <span>Имя владельца (необяз.)</span>
            <input
              className="inp"
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            />
          </label>
          <button className="btn btn-primary" disabled={busy} onClick={() => void create()}>
            {busy ? '…' : 'Создать кабинет'}
          </button>
        </div>
      )}

      {err && (
        <div className="err-box">
          <span className="err-dot" />
          {err}
        </div>
      )}

      <div className="card" style={{ overflow: 'auto' }}>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Тариф</th>
              <th>Объекты</th>
              <th>Диалоги</th>
              <th>Каналы</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/ops/clients/${r.id}`}>{r.name}</Link>
                </td>
                <td>
                  {r.planName} · {r.priceKzt.toLocaleString('ru-RU')} ₸
                </td>
                <td className="mono">
                  {r.properties.used}/{r.properties.max}
                </td>
                <td className="mono">
                  {r.dialogs.used}/{r.dialogs.max}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.whatsapp?.connected && (
                    <span
                      className="ch-chip ch-whatsapp"
                      title={r.whatsapp.phone ? `+${r.whatsapp.phone}` : 'подключён'}
                      style={r.whatsapp.authorized === false ? { opacity: 0.55 } : undefined}
                    >
                      {r.whatsapp.authorized === false ? 'QR' : 'WA'}
                    </span>
                  )}
                  {r.telegram?.connected && (
                    <span
                      className="ch-chip ch-telegram"
                      title={r.telegram.username ? `@${r.telegram.username}` : 'подключён'}
                      style={{ marginLeft: 4 }}
                    >
                      TG
                    </span>
                  )}
                  {!r.whatsapp?.connected && !r.telegram?.connected && (
                    <span style={{ color: 'oklch(0.55 0.16 25)', fontSize: 12 }}>нет</span>
                  )}
                </td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'oklch(0.5 0.01 250)' }}>Пока нет кабинетов</div>
        )}
      </div>
    </div>
  );
}
