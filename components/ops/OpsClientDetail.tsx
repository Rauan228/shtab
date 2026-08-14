'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOpsOrg, type OpsOrgDetail } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';

export function OpsClientDetail({ id }: { id: string }) {
  const { token } = useOpsAuth();
  const [data, setData] = useState<OpsOrgDetail | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    getOpsOrg(token, id)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'ошибка'));
  }, [token, id]);

  if (err) return <div className="err-box">{err}</div>;
  if (!data) return <div className="skel" style={{ height: 160 }} />;

  const o = data.org;
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
