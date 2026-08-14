'use client';

import { useEffect, useState } from 'react';
import { getSubscription, type Subscription } from '../lib/api';
import { useAuth } from '../lib/auth';

const MONTHS = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
];

function periodTitle(label: string): string {
  const [y, m] = label.split('-');
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return label;
  return `${MONTHS[mi]} ${y}`;
}

function money(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₸`;
}

function Meter({ used, max, warnAt = 0.8 }: { used: number; max: number; warnAt?: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const tone = used >= max ? 'over' : used / max >= warnAt ? 'warn' : '';
  return (
    <div className="meter-wrap">
      <div className={`meter ${tone}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-lbl mono">
        {used} / {max}
      </div>
    </div>
  );
}

export function Plan() {
  const { token } = useAuth();
  const [data, setData] = useState<Subscription | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    getSubscription(token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось загрузить тариф'));
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

  const d = data.usage.dialogs;
  const p = data.usage.properties;
  const dialogLeft = Math.max(0, d.max - d.used);

  return (
    <div className="set">
      <div className="card card-pad plan-hero">
        <div>
          <div className="kicker">Подписка · {periodTitle(data.period.label)}</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{data.plan.name}</div>
          <div style={{ fontSize: 13, color: 'oklch(0.5 0.012 250)', marginTop: 4 }}>{data.plan.forWhom}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
            {money(data.plan.priceKzt)}
          </div>
          <div style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)' }}>/ мес</div>
          <div className={`badge ${data.org.status === 'active' ? 'badge-ok' : 'badge-warn'}`} style={{ marginTop: 8 }}>
            {data.org.status === 'active' ? 'активна' : data.org.status}
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Объекты</div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.012 250)', margin: '6px 0 10px' }}>
            Квартиры в продаже. Скрытые не считаются.
          </div>
          <Meter used={p.used} max={p.max} />
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Диалоги</div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.012 250)', margin: '6px 0 10px' }}>
            Осталось {dialogLeft}. Новый слот — если гость молчал {data.idleDays} дней.
          </div>
          <Meter used={d.used} max={d.max} />
          <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)', marginTop: 8 }}>
            В тарифе {d.included}
            {d.extra > 0 ? ` + докуплено ${d.extra}` : ''}
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>Что входит</div>
        <ul className="plan-list">
          {data.plan.perks.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <div className="plan-feats">
          {data.features.map((f) => (
            <div key={f.id} className={`plan-feat${f.on ? ' on' : ''}`}>
              <span>{f.on ? '●' : '○'}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>Докупить диалоги</div>
        <div style={{ fontSize: 12, color: 'oklch(0.5 0.012 250)', marginTop: 6, lineHeight: 1.5 }}>
          Пакет действует до конца месяца. Сверх лимита — {money(data.overagePerDialogKzt)} за диалог.
          Оплата пока вручную: напишите нам, зачислим в этот кабинет.
        </div>
        <div className="pack-grid">
          {data.packs.map((pack) => (
            <div key={pack.id} className="pack">
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pack.name}</div>
              <div className="mono" style={{ marginTop: 6, fontSize: 16 }}>
                {money(pack.priceKzt)}
              </div>
              <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)', marginTop: 4 }}>
                {Math.round(pack.priceKzt / pack.dialogs)} ₸ / диалог
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
