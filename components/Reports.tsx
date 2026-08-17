'use client';

import { useEffect, useState } from 'react';
import {
  addDays,
  addMonths,
  formatDateRu,
  getReport,
  getReportRun,
  listReportRuns,
  REPORT_TYPES,
  saveReportRun,
  startOfMonth,
  todayIso,
  type ReportRunMeta,
  type ReportTypeId,
  type TypedReport,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';
import { downloadReportExcel } from '../lib/report-excel';
import { DateField } from './DateField';

function prettyReportCell(s: string): string {
  return String(s ?? '').replace(/\d{4}-\d{2}-\d{2}/g, (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  });
}

export function Reports() {
  const { token } = useAuth();
  const { flash, readOnly } = useUi();
  const today = todayIso();
  const [type, setType] = useState<ReportTypeId>('kpi');
  const [from, setFrom] = useState(() => startOfMonth(today));
  const [to, setTo] = useState(() => addMonths(startOfMonth(today), 1));
  const [data, setData] = useState<TypedReport | null>(null);
  const [runs, setRuns] = useState<ReportRunMeta[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const maxBar = Math.max(1, ...(data?.series.map((s) => s.a) ?? [1]));

  const load = (next?: { type?: ReportTypeId; from?: string; to?: string }) => {
    if (!token) return;
    const t = next?.type ?? type;
    const f = next?.from ?? from;
    const o = next?.to ?? to;
    if (o <= f) {
      setErr('Выезд периода должен быть позже начала');
      return;
    }
    setLoading(true);
    getReport(token, t, f, o)
      .then((r) => {
        setData(r.report);
        setErr('');
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось посчитать'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // first paint only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listReportRuns(token)
      .then((r) => setRuns(r.runs))
      .catch(() => {});
  }, [token]);

  const preset = (kind: 'this' | 'last' | '30' | 'year') => {
    let f = from;
    let o = to;
    if (kind === '30') {
      f = addDays(today, -29);
      o = addDays(today, 1);
    } else if (kind === 'year') {
      f = `${today.slice(0, 5)}01-01`;
      o = addDays(today, 1);
    } else {
      f = startOfMonth(kind === 'last' ? addMonths(today, -1) : today);
      o = addMonths(f, 1);
    }
    setFrom(f);
    setTo(o);
    load({ from: f, to: o });
  };

  const pickType = (id: ReportTypeId) => {
    setType(id);
    load({ type: id });
  };

  const header = data?.rows[0] ?? [];
  const body = (data?.rows ?? []).slice(1);

  return (
    <div className="rep-layout">
      <aside className="rep-nav card">
        <div className="rep-nav-h">Отчёты</div>
        {REPORT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rep-nav-i${type === t.id ? ' on' : ''}`}
            onClick={() => pickType(t.id)}
          >
            <b>{t.title}</b>
            <span>{t.hint}</span>
          </button>
        ))}
      </aside>

      <div className="rep-main">
        {err && (
          <div className="err-box">
            <span className="err-dot" />
            {err}
          </div>
        )}

        <div className="rep-toolbar card card-pad">
          <div className="date-row">
            <DateField label="С" value={from} onChange={setFrom} />
            <DateField label="По (не включая)" value={to} onChange={setTo} min={from} rangeFrom={from} />
          </div>
          <div className="rep-actions">
            <div className="seg">
              <button type="button" onClick={() => preset('this')}>
                Этот месяц
              </button>
              <button type="button" onClick={() => preset('last')}>
                Прошлый
              </button>
              <button type="button" onClick={() => preset('30')}>
                30 дней
              </button>
              <button type="button" onClick={() => preset('year')}>
                С января
              </button>
            </div>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={() => load()}>
              {loading ? 'Считаю…' : 'Посчитать'}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!data}
              onClick={() => data && downloadReportExcel(data)}
            >
              Скачать Excel
            </button>
            {!readOnly && (
              <button
                type="button"
                className="btn"
                disabled={!data || saving}
                onClick={() => {
                  if (!token) return;
                  setSaving(true);
                  saveReportRun(token, type, from, to)
                    .then((r) => {
                      setData(r.report);
                      setRuns((list) => [r.run, ...list.filter((x) => x.id !== r.run.id)]);
                      flash('Сохранено в историю — можно скачать позже');
                    })
                    .catch((e) => setErr(e instanceof Error ? e.message : 'Не сохранилось'))
                    .finally(() => setSaving(false));
                }}
              >
                В историю
              </button>
            )}
          </div>
        </div>

        {data && (
          <>
            <div className="dash-hello" style={{ marginTop: 4 }}>
              <h1>{data.title}</h1>
              <p>
                {formatDateRu(data.from)} — {formatDateRu(addDays(data.to, -1))}
                {data.note ? ` · ${data.note}` : ''}
              </p>
            </div>
            <div className="dash-ops">
              {data.kpis.map((k) => (
                <div key={k.l} className="dash-tile">
                  <div>
                    <div className="dash-tile-n" style={{ fontSize: 16 }}>
                      {k.v}
                    </div>
                    <div className="dash-tile-l">{k.l}</div>
                  </div>
                </div>
              ))}
            </div>
            {data.series.length > 0 && (
              <div className="card card-pad">
                <div className="rep-bars">
                  {data.series.map((s) => (
                    <div key={s.iso} className="rep-bar" title={`${s.iso}: ${s.a}`}>
                      <div className="dash-bar-track" style={{ height: 80 }}>
                        <i style={{ height: `${Math.round((s.a / maxBar) * 100)}%` }} />
                      </div>
                      <span>{s.iso.length > 7 ? s.iso.slice(8) : s.iso}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="rep-table">
                <thead>
                  <tr>
                    {header.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((r, i) => (
                    <tr key={i}>
                      {r.map((c, j) => (
                        <td key={j}>{prettyReportCell(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {body.length === 0 && <div className="op-row">Нет строк за период</div>}
            </div>
          </>
        )}

        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-h">История выгрузок</div>
          {runs.length === 0 ? (
            <div className="op-row" style={{ fontSize: 13, color: 'oklch(0.55 0.012 250)' }}>
              Пока пусто. Посчитайте отчёт и нажмите «В историю» — через месяц он останется здесь.
            </div>
          ) : (
            runs.map((r) => (
              <div key={r.id} className="op-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                    {r.title}
                  </div>
                  <div className="mono" style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>
                    {formatDateRu(r.from)} — {formatDateRu(addDays(r.to, -1))} ·{' '}
                    {new Date(r.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => {
                    if (!token) return;
                    getReportRun(token, r.id).then((x) => {
                      setType(x.run.payload.type);
                      setFrom(x.run.from);
                      setTo(x.run.to);
                      setData(x.run.payload);
                    });
                  }}
                >
                  Открыть
                </button>
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => {
                    if (!token) return;
                    getReportRun(token, r.id).then((x) => downloadReportExcel(x.run.payload));
                  }}
                >
                  Excel
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
