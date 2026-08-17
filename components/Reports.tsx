'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  formatDateRu,
  formatKzt,
  getReport,
  startOfMonth,
  todayIso,
  type ReportPayload,
} from '../lib/api';
import { useAuth } from '../lib/auth';

type Period = 'this' | 'last' | '30';

function windowOf(kind: Period, today: string): { from: string; to: string; label: string } {
  if (kind === '30') {
    const from = addDays(today, -29);
    return { from, to: addDays(today, 1), label: `${formatDateRu(from)} — ${formatDateRu(today)}` };
  }
  const start = startOfMonth(kind === 'last' ? addMonths(today, -1) : today);
  const end = addMonths(start, 1);
  return { from: start, to: end, label: `${formatDateRu(start)} — ${formatDateRu(addDays(end, -1))}` };
}

export function Reports() {
  const { token } = useAuth();
  const today = todayIso();
  const [period, setPeriod] = useState<Period>('this');
  const [tab, setTab] = useState<'stay' | 'cancel' | 'noshow'>('stay');
  const [data, setData] = useState<ReportPayload | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const win = useMemo(() => windowOf(period, today), [period, today]);

  useEffect(() => {
    if (!token) return;
    let live = true;
    setLoading(true);
    getReport(token, win.from, win.to)
      .then((r) => {
        if (!live) return;
        setData(r.report);
        setErr('');
      })
      .catch((e) => {
        if (live) setErr(e instanceof Error ? e.message : 'Не удалось загрузить отчёт');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, win.from, win.to]);

  const maxBar = Math.max(1, ...(data?.days.map((d) => d.occupied) ?? [1]));
  const rows = (data?.rows ?? []).filter((r) => r.kind === tab);
  const srcMax = Math.max(1, ...(data?.sources.map((s) => s.revenue) ?? [1]));

  return (
    <div className="dash">
      {err && (
        <div className="err-box">
          <span className="err-dot" />
          {err}
        </div>
      )}
      <div className="dash-hello">
        <h1>Отчёты</h1>
        <p>Загрузка, деньги, отмены и откуда пришла бронь — за выбранный период.</p>
        <div className="dash-period">
          <div className="seg">
            {(
              [
                ['this', 'Этот месяц'],
                ['last', 'Прошлый'],
                ['30', '30 дней'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={period === id ? 'on' : ''} onClick={() => setPeriod(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="dash-date">{win.label}</div>
        </div>
      </div>

      <div className="dash-ops">
        {[
          { l: 'Загрузка', v: data ? `${data.occupancyPct}%` : '—' },
          { l: 'Доход', v: data ? formatKzt(data.revenue) : '—' },
          { l: 'ADR', v: data?.adr ? formatKzt(data.adr) : '—' },
          { l: 'RevPAR', v: data?.revpar ? formatKzt(data.revpar) : '—' },
          { l: 'Новые брони', v: data ? String(data.bookings) : '—' },
          { l: 'Отмены', v: data ? String(data.cancelled) : '—' },
          { l: 'Не заехали', v: data ? String(data.noShow) : '—' },
          { l: 'Средний чек', v: data?.avgCheck ? formatKzt(data.avgCheck) : '—' },
        ].map((k) => (
          <div key={k.l} className="dash-tile">
            <div>
              <div className="dash-tile-n" style={{ fontSize: 18 }}>
                {k.v}
              </div>
              <div className="dash-tile-l">{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-fin">
        <div className="card card-pad">
          <div className="dash-occ-title">Загрузка по дням</div>
          <div className="dash-occ-sub">занятые квартиры из {data?.days[0]?.sellable ?? 0}</div>
          <div className="rep-bars">
            {(data?.days ?? []).map((d) => (
              <div key={d.iso} className="rep-bar" title={`${d.iso}: ${d.occupied}`}>
                <div className="dash-bar-track" style={{ height: 80 }}>
                  <i style={{ height: `${Math.round((d.occupied / maxBar) * 100)}%` }} />
                </div>
                <span>{d.iso.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad">
          <div className="dash-occ-title">Откуда бронь</div>
          <div className="dash-occ-sub">по дате создания в периоде</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.sources ?? []).map((s) => (
              <div key={s.id}>
                <div className="dash-money-row" style={{ fontSize: 13 }}>
                  <span>
                    {s.label} · {s.count}
                  </span>
                  <span className="mono">{formatKzt(s.revenue)}</span>
                </div>
                <div className="bar" style={{ marginTop: 4 }}>
                  <i style={{ width: `${Math.round((s.revenue / srcMax) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="dash-occ-sub" style={{ marginTop: 12 }}>
            Средняя длительность {data?.avgNights ?? 0} ноч.
          </div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-h" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              ['stay', 'Проживания'],
              ['cancel', 'Отмены'],
              ['noshow', 'Не заехали'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`fbtn${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="op-row">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="op-row" style={{ color: 'oklch(0.55 0.012 250)', fontSize: 13 }}>
            Пусто за период
          </div>
        ) : (
          rows.map((r) => (
            <div key={`${r.kind}-${r.id}`} className="op-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                  {r.propertyTitle} · {r.guestName}
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>
                  {formatDateRu(r.checkIn)} → {formatDateRu(r.checkOut)} · {r.nights} н. · {r.source}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 12 }}>
                {r.totalPrice ? formatKzt(r.totalPrice) : '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
