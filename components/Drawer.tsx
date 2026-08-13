'use client';

import { useEffect } from 'react';
import { ST } from '../lib/demo';
import { drawerDates, useStore } from '../lib/store';
import { fmtKzt, nightsLabel } from '../lib/format';

export function Drawer() {
  const {
    drawer,
    days,
    properties,
    setDrawer,
    closeDrawer,
    saveDrawer,
    askConfirm,
    quoteTotal,
  } = useStore();

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawer, closeDrawer]);

  if (!drawer) return null;

  const d = drawer;
  const prop = properties.find((p) => p.id === d.p) ?? properties[0]!;
  const dates = drawerDates(days, d.s, d.n);
  const isEdit = d.mode === 'edit';
  const isBlock = d.mode === 'block' || (isEdit && d.st === 'block');
  const isBooking = d.mode === 'booking' || (isEdit && d.st !== 'block');
  const title = isEdit
    ? d.st === 'block'
      ? 'Блок дат'
      : `Бронь · ${d.name || '—'}`
    : d.mode === 'block'
      ? 'Заблокировать даты'
      : 'Новая бронь';
  const cta = isEdit ? 'Сохранить' : d.mode === 'block' ? 'Заблокировать' : 'Создать бронь';
  const extra = Math.max(0, (+d.g || 2) - 2) * 3000 * d.n;
  const nightsTotal = prop.price * d.n;

  return (
    <div className="backdrop">
      <div className="scrim" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-modal>
        <div className="drawer-h">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            <div className="mono" style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>
              {dates.inDate} → {dates.outDate}
            </div>
          </div>
          <button className="btn btn-icon" onClick={closeDrawer} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="drawer-b">
          {!isEdit && (
            <div className="seg">
              <button className={d.mode === 'booking' ? 'on' : ''} onClick={() => setDrawer({ mode: 'booking' })}>
                Бронь
              </button>
              <button className={d.mode === 'block' ? 'on' : ''} onClick={() => setDrawer({ mode: 'block' })}>
                Блок дат
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Заезд</span>
              <div className="inp mono" style={{ display: 'flex', alignItems: 'center' }}>
                {dates.inDate}
              </div>
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Выезд</span>
              <div className="inp mono" style={{ display: 'flex', alignItems: 'center' }}>
                {dates.outDate}
              </div>
            </label>
          </div>
          <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)', marginTop: -6 }}>
            {prop.title} · {nightsLabel(d.n)}
          </div>

          {isBlock && (
            <>
              <label className="field">
                <span>Причина (видит только вы)</span>
                <textarea
                  value={d.note}
                  onChange={(e) => setDrawer({ note: e.target.value })}
                  placeholder="Ремонт, свои гости…"
                />
              </label>
              <div
                style={{
                  background: 'oklch(0.96 0.004 250)',
                  border: '1px solid oklch(0.92 0.006 250)',
                  borderRadius: 9,
                  padding: '11px 12px',
                  fontSize: 12,
                  color: 'oklch(0.45 0.012 250)',
                  lineHeight: 1.5,
                }}
              >
                Бот не будет предлагать эти даты гостям.
              </div>
            </>
          )}

          {isBooking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="field">
                <span>Имя гостя</span>
                <input value={d.name} onChange={(e) => setDrawer({ name: e.target.value })} placeholder="Айгерим" />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Телефон</span>
                  <input
                    className="mono"
                    value={d.phone}
                    onChange={(e) => setDrawer({ phone: e.target.value })}
                    placeholder="+7 701 000 00 00"
                  />
                </label>
                <label className="field" style={{ width: 104 }}>
                  <span>Гостей</span>
                  <input className="mono" value={d.g} onChange={(e) => setDrawer({ g: e.target.value })} />
                </label>
              </div>
              <div className="field">
                <span>Статус</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['pending', 'confirmed', 'in_stay'] as const).map((id) => {
                    const on = d.st === id;
                    const c = ST[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDrawer({ st: id })}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          height: 32,
                          borderRadius: 8,
                          fontSize: 12,
                          border: `1px solid ${on ? c.bd : 'oklch(0.9 0.006 250)'}`,
                          background: on ? c.bg : '#fff',
                          color: on ? c.fg : 'oklch(0.45 0.012 250)',
                          fontWeight: on ? 500 : 400,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: c.dot }} />
                        {c.short}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="quote">
                <div className="q-row">
                  <span style={{ color: 'oklch(0.5 0.012 250)' }}>
                    {fmtKzt(prop.price)} ₸ × {d.n}
                  </span>
                  <span className="mono">{fmtKzt(nightsTotal)} ₸</span>
                </div>
                <div className="q-row">
                  <span style={{ color: 'oklch(0.5 0.012 250)' }}>Уборка</span>
                  <span className="mono">5 000 ₸</span>
                </div>
                <div className="q-row">
                  <span style={{ color: 'oklch(0.5 0.012 250)' }}>Доп. гости</span>
                  <span className="mono">{fmtKzt(extra)} ₸</span>
                </div>
                <div className="q-row">
                  <span style={{ fontWeight: 500 }}>Итого</span>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>
                    {fmtKzt(quoteTotal(d))} ₸
                  </span>
                </div>
              </div>
            </div>
          )}

          {isEdit && (
            <div style={{ borderTop: '1px solid oklch(0.94 0.006 250)', paddingTop: 12 }}>
              <div className="lbl" style={{ marginBottom: 8 }}>
                История
              </div>
              {[
                ['11 авг 09:14', 'Бот принял запрос в WhatsApp'],
                ['11 авг 09:15', 'Цена рассчитана по правилам объекта'],
                ['12 авг 18:02', 'Владелец подтвердил бронь'],
              ].map(([time, text]) => (
                <div key={time} style={{ display: 'flex', gap: 9, fontSize: 11, color: 'oklch(0.5 0.012 250)', marginBottom: 8 }}>
                  <span className="mono" style={{ flex: 'none', color: 'oklch(0.62 0.01 250)' }}>
                    {time}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="drawer-f">
          {isEdit && (
            <button
              className="btn btn-danger"
              onClick={() =>
                askConfirm({
                  title: d.st === 'block' ? 'Снять блок?' : 'Отменить бронь?',
                  text:
                    d.st === 'block'
                      ? 'Даты снова станут доступны для продажи.'
                      : 'Гость получит уведомление в WhatsApp, даты освободятся.',
                  cta: d.st === 'block' ? 'Снять' : 'Отменить бронь',
                  kind: 'cancel',
                })
              }
            >
              {d.st === 'block' ? 'Снять блок' : 'Отменить бронь'}
            </button>
          )}
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={closeDrawer}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={saveDrawer}>
            {cta}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function Confirm() {
  const { confirm, closeConfirm, doConfirm } = useStore();
  if (!confirm) return null;
  return (
    <div className="modal-wrap">
      <div className="scrim" onClick={closeConfirm} />
      <div className="modal">
        <div style={{ fontSize: 15, fontWeight: 600 }}>{confirm.title}</div>
        <div style={{ fontSize: 13, color: 'oklch(0.5 0.012 250)', marginTop: 7, lineHeight: 1.5 }}>{confirm.text}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button className="btn" onClick={closeConfirm}>
            Не надо
          </button>
          <button
            className="btn"
            onClick={doConfirm}
            style={{ border: 'none', background: 'oklch(0.55 0.17 25)', color: '#fff', fontWeight: 500 }}
          >
            {confirm.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
