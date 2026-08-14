'use client';

import { useEffect, useState } from 'react';
import { getOpsOverview, type OpsOverview } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';

function money(n: number): string {
  return `${n.toLocaleString('ru-RU')} ₸`;
}

export function OpsDashboard() {
  const { token } = useOpsAuth();
  const [data, setData] = useState<OpsOverview | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    getOpsOverview(token)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'ошибка'));
  }, [token]);

  if (err) return <div className="err-box">{err}</div>;
  if (!data) return <div className="skel" style={{ height: 160 }} />;

  const cards = [
    { l: 'Клиенты', v: String(data.clients) },
    { l: 'Объекты в продаже', v: String(data.apartments) },
    { l: 'Диалоги за месяц', v: String(data.dialogs) },
    { l: 'MRR', v: money(data.money.mrr) },
    { l: 'Green API (себест.)', v: money(data.money.greenApiKzt) },
    { l: 'WaveSpeed оценка', v: money(data.money.llmEstKzt) },
    { l: 'COGS оценка', v: money(data.money.cogsEstKzt) },
    { l: 'Маржа оценка', v: money(data.money.marginEstKzt) },
  ];

  return (
    <div className="set" style={{ maxWidth: 960 }}>
      <div className="kpi-grid">
        {cards.map((c) => (
          <div key={c.l} className="card card-pad">
            <div style={{ fontSize: 11, color: 'oklch(0.55 0.01 250)' }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>
              {c.v}
            </div>
          </div>
        ))}
      </div>
      <div className="card card-pad">
        <div style={{ fontSize: 13, fontWeight: 600 }}>По тарифам</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
          <span>Старт · {data.byPlan.start ?? 0}</span>
          <span>Бизнес · {data.byPlan.business ?? 0}</span>
          <span>Про · {data.byPlan.pro ?? 0}</span>
        </div>
      </div>
      <div className="card card-pad" style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Как считаем деньги</div>
        <div>{data.notes.wavespeed}</div>
        <div style={{ marginTop: 6 }}>{data.notes.greenApi}</div>
        <div style={{ marginTop: 6 }}>{data.notes.llmPerDialog}</div>
      </div>
    </div>
  );
}
