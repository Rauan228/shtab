'use client';

import { useState } from 'react';
import { patchOpsOrg } from '../../lib/ops-api';

/** Packs we sell on top of a plan, mirroring DIALOG_PACKS on the server. */
const PACKS = [
  { n: 50, price: '8 000 ₸' },
  { n: 100, price: '15 000 ₸' },
  { n: 300, price: '39 000 ₸' },
];

const PLANS = [
  { id: 'start', label: 'Старт · 4 кв · 80 диалогов' },
  { id: 'business', label: 'Бизнес · 15 кв · 200 диалогов' },
  { id: 'pro', label: 'Про · 30 кв · 500 диалогов' },
];

/**
 * Plan, purchased dialogs and account status.
 *
 * Extra dialogs are additive and survive a plan change — the client paid for
 * them separately, so a tariff move must not silently burn them.
 */
export function PlanControls({
  orgId,
  token,
  plan,
  status,
  extraDialogs,
  onChanged,
}: {
  orgId: string;
  token: string;
  plan: string;
  status: string;
  extraDialogs: number;
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
      <div style={{ fontSize: 13, fontWeight: 600 }}>Тариф и лимиты</div>

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

      <div>
        <div className="lbl" style={{ marginBottom: 6 }}>
          Докупить диалоги · сейчас сверх тарифа {extraDialogs}
        </div>
        <div className="nights-row">
          {PACKS.map((p) => (
            <button
              key={p.n}
              type="button"
              disabled={busy}
              onClick={() => void apply({ addDialogs: p.n }, `Добавлено ${p.n} диалогов`)}
            >
              +{p.n} · {p.price}
            </button>
          ))}
          {extraDialogs > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void apply({ addDialogs: -extraDialogs }, 'Докупленные диалоги обнулены')}
            >
              обнулить
            </button>
          )}
        </div>
      </div>

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
