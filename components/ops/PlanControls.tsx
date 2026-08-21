'use client';

import { useState } from 'react';
import { patchOpsOrg } from '../../lib/ops-api';

const PLANS = [
  { id: 'trial', label: 'Пробный · 7 дней · 0 ₸' },
  { id: 'solo', label: 'Мини · 2 кв · 12 000 ₸' },
  { id: 'start', label: 'Старт · 4 кв · 35 000 ₸' },
  { id: 'business', label: 'Бизнес · 15 кв · 55 000 ₸' },
  { id: 'pro', label: 'Про · 30 кв · 89 000 ₸' },
];

/** Plan (apartment cap) and account status. Dialogs are not metered. */
export function PlanControls({
  orgId,
  token,
  plan,
  status,
  onChanged,
}: {
  orgId: string;
  token: string;
  plan: string;
  status: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const apply = async (
    body: { plan?: string; addDialogs?: number; status?: string },
    message: string,
  ) => {
    setBusy(true);
    setErr('');
    setOk('');
    try {
      await patchOpsOrg(token, orgId, body);
      setOk(message);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'не сохранилось');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>Тариф (по квартирам)</div>

      <label className="field">
        <span>Тариф</span>
        <select
          className="inp"
          value={plan}
          disabled={busy}
          onChange={(e) => void apply({ plan: e.target.value }, `Тариф изменён`)}
        >
          {PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className={status === 'active' ? 'btn btn-danger' : 'btn btn-primary'}
          disabled={busy}
          onClick={() =>
            void apply(
              { status: status === 'active' ? 'suspended' : 'active' },
              status === 'active' ? 'Кабинет на паузе' : 'Кабинет снова активен',
            )
          }
        >
          {status === 'active' ? 'Поставить на паузу' : 'Снять с паузы'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--fg-faint)' }}>
          На паузе кабинет не считается в MRR и не поднимает каналы.
        </span>
      </div>

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
