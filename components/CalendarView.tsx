'use client';

import { CW, ST, type Status } from '../lib/demo';
import { fmtKzt } from '../lib/format';
import { useStore, type Filter } from '../lib/store';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'pending', label: 'Ждут' },
  { id: 'confirmed', label: 'Подтв.' },
  { id: 'in_stay', label: 'Живут' },
  { id: 'block', label: 'Блоки' },
];

export function CalendarView() {
  const {
    properties,
    bookings,
    days,
    filter,
    setFilter,
    setOffset,
    drag,
    startDrag,
    overDrag,
    endDrag,
    cancelDrag,
    openBooking,
    mProp,
    setMProp,
  } = useStore();

  const todayIdx = days.findIndex((d) => d.today);
  const rangeLabel = `${days[0]!.num} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][days[0]!.d.getMonth()]} — ${days[days.length - 1]!.num} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][days[days.length - 1]!.d.getMonth()]}`;

  const mP = properties.find((p) => p.id === mProp) ?? properties[0]!;

  return (
    <div>
      <div className="cal-toolbar desktop-cal">
        <div className="cal-nav">
          <button className="btn btn-icon" onClick={() => setOffset((n) => n - 1)}>
            ‹
          </button>
          <button className="btn btn-icon" onClick={() => setOffset((n) => n + 1)}>
            ›
          </button>
          <div className="cal-range">{rangeLabel}</div>
          <button className="btn btn-xs" onClick={() => setOffset(0)} style={{ marginLeft: 4 }}>
            Сегодня
          </button>
        </div>
        <div className="filters">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            const c = f.id === 'all' ? null : ST[f.id];
            return (
              <button key={f.id} className={`fbtn${on ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
                {c ? <span className="fdot" style={{ background: c.dot }} /> : null}
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="cal-wrap desktop-cal" onMouseUp={endDrag} onMouseLeave={cancelDrag}>
        <div className="cal-scroll">
          <div className="cal-names">
            <div className="cal-h">Квартиры</div>
            {properties.map((p) => (
              <div key={p.id} className="cal-name">
                <div style={{ minWidth: 0 }}>
                  <div className="trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                    {p.title}
                  </div>
                  <div className="trunc" style={{ fontSize: 10, color: 'oklch(0.6 0.01 250)' }}>
                    {fmtKzt(p.price)} ₸ · до {p.guests}
                  </div>
                </div>
                {!p.ready && <span className="badge badge-warn">не готов</span>}
              </div>
            ))}
          </div>
          <div className="cal-days" style={{ width: days.length * CW }}>
            <div className="cal-days-h">
              {days.map((d, i) => (
                <div key={i} className={`cal-dh${d.today ? ' today' : ''}${d.weekend ? ' we' : ''}`}>
                  <div className="wd">{d.wd}</div>
                  <div className="num">{d.num}</div>
                </div>
              ))}
            </div>
            {properties.map((p) => (
              <div key={p.id} className="cal-track" style={{ width: days.length * CW }}>
                <div className="cal-cells">
                  {days.map((d, i) => {
                    const inDrag =
                      drag && drag.p === p.id && i >= Math.min(drag.a, drag.b) && i <= Math.max(drag.a, drag.b);
                    return (
                      <div
                        key={i}
                        className={`cal-cell${d.weekend ? ' we' : ''}${inDrag ? ' drag' : ''}`}
                        onMouseDown={() => startDrag(p.id, i)}
                        onMouseEnter={() => overDrag(p.id, i)}
                      />
                    );
                  })}
                </div>
                {bookings
                  .filter((b) => b.p === p.id && (filter === 'all' || b.st === filter))
                  .map((b) => {
                    const c = ST[b.st];
                    return (
                      <div
                        key={b.id}
                        className="cal-bar"
                        onClick={() => openBooking(b)}
                        style={{
                          left: b.s * CW + 3,
                          width: b.n * CW - 6,
                          background: c.bg,
                          border: `1px solid ${c.bd}`,
                          borderLeft: `3px solid ${c.bd}`,
                          color: c.fg,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 2, background: c.dot, flex: 'none' }} />
                        <span className="trunc" style={{ flex: 1, fontWeight: 500 }}>
                          {b.st === 'block' ? b.note || 'Недоступно' : b.name}
                        </span>
                        {b.st !== 'block' && (
                          <span className="mono" style={{ opacity: 0.75, flex: 'none' }}>
                            {fmtKzt(b.price || 0)} ₸
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
            {todayIdx >= 0 && <div className="today-line" style={{ left: todayIdx * CW + CW / 2 }} />}
          </div>
        </div>
      </div>

      <div className="legend desktop-cal">
        {(Object.keys(ST) as Status[]).map((id) => {
          const c = ST[id];
          return (
            <div key={id} className="leg">
              <span className="sw" style={{ background: c.bg, border: `1px solid ${c.bd}` }} />
              {c.label}
            </div>
          );
        })}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'oklch(0.6 0.01 250)' }}>
          Выделите даты мышью, чтобы добавить бронь или блок
        </div>
      </div>

      {/* mobile */}
      <div className="m-chips">
        {properties.slice(0, 6).map((p) => (
          <button key={p.id} className={`m-chip${mProp === p.id ? ' on' : ''}`} onClick={() => setMProp(p.id)}>
            {p.title.split(',')[0]}
          </button>
        ))}
      </div>
      <div className="m-days">
        {days.slice(0, 16).map((dd, i) => {
          const b = bookings.find((x) => x.p === mP.id && i >= x.s && i < x.s + x.n);
          const c = b ? ST[b.st] : null;
          return (
            <div key={i} className="m-day" onClick={() => b && openBooking(b)}>
              <div className="dn">
                <div className={`n${dd.today ? ' today' : ''}`}>{dd.num}</div>
                <div className="w">{dd.wd}</div>
              </div>
              <div
                className="m-pill"
                style={
                  c
                    ? { background: c.bg, borderColor: c.bd, color: c.fg }
                    : undefined
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 2,
                      background: c ? c.dot : 'oklch(0.8 0.008 250)',
                      flex: 'none',
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {b ? (b.st === 'block' ? b.note || 'Недоступно' : b.name) : 'Свободно'}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'oklch(0.5 0.012 250)' }}>
                  {b
                    ? b.st === 'block'
                      ? 'блок'
                      : `${fmtKzt(b.price || 0)} ₸`
                    : `от ${fmtKzt(mP.price)} ₸`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
