'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getOpsOverview, type AttentionKind, type OpsOverview } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';

function money(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU')} ₸`;
}

/** Colour for an attention row: red = broken now, amber = will break soon. */
const TONE: Record<AttentionKind, { bg: string; fg: string; label: string }> = {
  no_channel: { bg: 'oklch(0.96 0.03 25)', fg: 'oklch(0.48 0.16 25)', label: 'нет канала' },
  wa_down: { bg: 'oklch(0.96 0.03 25)', fg: 'oklch(0.48 0.16 25)', label: 'WhatsApp' },
  limit_hit: { bg: 'oklch(0.96 0.03 25)', fg: 'oklch(0.48 0.16 25)', label: 'лимит' },
  limit_near: { bg: 'oklch(0.96 0.04 80)', fg: 'oklch(0.45 0.1 70)', label: 'лимит близко' },
  quiet: { bg: 'oklch(0.96 0.02 250)', fg: 'oklch(0.45 0.02 250)', label: 'тишина' },
  trial_expired: { bg: 'oklch(0.96 0.04 80)', fg: 'oklch(0.45 0.1 70)', label: 'триал' },
};

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

  const kpis = [
    { l: 'Клиенты', v: String(data.clients), h: data.suspended ? `+${data.suspended} на паузе` : 'активные' },
    { l: 'Диалоги за месяц', v: String(data.dialogs), h: `сегодня ${data.activity.dialogsToday}` },
    { l: 'MRR', v: money(data.money.mrr), h: `маржа ${money(data.money.marginEstKzt)}` },
    { l: 'Объекты в продаже', v: String(data.apartments), h: 'по всем кабинетам' },
  ];

  return (
    <div className="set" style={{ maxWidth: 1040 }}>
      <div className="kpi-grid">
        {kpis.map((c) => (
          <div key={c.l} className="card card-pad">
            <div style={{ fontSize: 11, color: 'oklch(0.55 0.01 250)' }}>{c.l}</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>
              {c.v}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>{c.h}</div>
          </div>
        ))}
      </div>

      {/* What needs a human today — the reason to open this page at all. */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Требует внимания</span>
          <span style={{ fontWeight: 400, color: 'var(--fg-faint)', fontSize: 12 }}>
            {data.attention.length === 0 ? 'всё спокойно' : `${data.attention.length}`}
          </span>
        </div>
        {data.attention.length === 0 ? (
          <div className="op-row" style={{ fontSize: 13, color: 'oklch(0.55 0.012 250)' }}>
            Каналы на месте, все клиенты пишут.
          </div>
        ) : (
          data.attention.map((a, i) => {
            const tone = TONE[a.kind];
            return (
              <div key={`${a.orgId}-${a.kind}-${i}`} className="op-row">
                <span
                  className="badge"
                  style={{ background: tone.bg, color: tone.fg, flex: 'none' }}
                >
                  {tone.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                    {a.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'oklch(0.5 0.012 250)' }}>{a.text}</div>
                </div>
                <Link href={`/ops/clients/${a.orgId}`} className="btn btn-xs">
                  Открыть
                </Link>
              </div>
            );
          })
        )}
      </div>

      <div className="g2">
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>Каналы</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontSize: 13 }}>
            <span>WhatsApp · <b className="mono">{data.channels.whatsapp}</b></span>
            <span>Telegram · <b className="mono">{data.channels.telegram}</b></span>
            <span style={{ color: data.channels.none ? 'oklch(0.55 0.16 25)' : undefined }}>
              Без канала · <b className="mono">{data.channels.none}</b>
            </span>
          </div>
        </div>
        <div className="card card-pad">
          <div style={{ fontSize: 13, fontWeight: 600 }}>По тарифам</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
            <span>Старт · {data.byPlan.start ?? 0}</span>
            <span>Бизнес · {data.byPlan.business ?? 0}</span>
            <span>Про · {data.byPlan.pro ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Per-client economics: volume vs what they pay. */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div className="card-h">Клиенты · нагрузка и юнит-экономика</div>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Тариф</th>
              <th>Диалоги</th>
              <th>Сегодня</th>
              <th>Каналы</th>
              <th>Себест.</th>
              <th>Маржа</th>
            </tr>
          </thead>
          <tbody>
            {data.clientRows.map((c) => (
              <tr key={c.orgId}>
                <td>
                  <Link href={`/ops/clients/${c.orgId}`}>{c.name}</Link>
                  {c.quietDays !== null && c.quietDays >= 7 && (
                    <span style={{ fontSize: 11, color: 'oklch(0.55 0.02 250)' }}>
                      {' '}
                      · тишина {c.quietDays} дн.
                    </span>
                  )}
                </td>
                <td>{c.planName}</td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {c.dialogs.used}
                </td>
                <td className="mono">{c.today || '—'}</td>
                <td style={{ fontSize: 11 }}>
                  {c.channels.whatsapp && <span className="ch-chip ch-whatsapp">WA</span>}
                  {c.channels.telegram && (
                    <span className="ch-chip ch-telegram" style={{ marginLeft: 4 }}>
                      TG
                    </span>
                  )}
                  {!c.channels.whatsapp && !c.channels.telegram && (
                    <span style={{ color: 'oklch(0.55 0.16 25)' }}>нет</span>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {money(c.cogsKzt)}
                </td>
                <td
                  className="mono"
                  style={{ fontSize: 12, color: c.marginKzt < 0 ? 'oklch(0.55 0.16 25)' : undefined }}
                >
                  {money(c.marginKzt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.clientRows.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'oklch(0.5 0.01 250)' }}>Пока нет клиентов</div>
        )}
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
