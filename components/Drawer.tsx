'use client';

import { useEffect, useState } from 'react';
import {
  blockDates,
  cancelBooking,
  createBooking,
  addDays,
  formatDateRu,
  getQuote,
  listApartments,
  nightsBetween,
  removeBlock,
  updateBooking,
  type ApartmentListItem,
  type BookingStatus,
  type Quote,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ST } from '../lib/status';
import { useUi } from '../lib/ui';

export function Drawer() {
  const { token } = useAuth();
  const { drawer, closeDrawer, flash, bump, ask } = useUi();
  const [mode, setMode] = useState<'booking' | 'block'>('booking');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [guests, setGuests] = useState('2');
  const [note, setNote] = useState('');
  const [st, setSt] = useState<BookingStatus>('confirmed');
  const [propertyId, setPropertyId] = useState('');
  const [objects, setObjects] = useState<ApartmentListItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;

  useEffect(() => {
    if (!drawer || !token) return;
    setMode(drawer.mode === 'block' || drawer.kind === 'block' ? 'block' : 'booking');
    setPropertyId(drawer.propertyId);
    setCheckIn(drawer.checkIn);
    setCheckOut(drawer.checkOut);
    setName('');
    setPhone('');
    setGuests('2');
    setNote('');
    setSt('confirmed');
    setErr('');
    listApartments(token)
      .then((r) => setObjects(r.apartments.filter((a) => !a.archived)))
      .catch(() => {});
  }, [drawer, token]);

  const setIn = (v: string) => {
    setErr('');
    setCheckIn(v);
    if (v && checkOut && checkOut <= v) setCheckOut(addDays(v, 1));
  };
  const setOut = (v: string) => {
    setErr('');
    if (checkIn && v && v <= checkIn) {
      setCheckIn(v);
      setCheckOut(addDays(v, Math.max(1, nights || 1)));
      return;
    }
    setCheckOut(v);
  };
  const setNights = (n: number) => {
    if (!checkIn) return;
    setErr('');
    setCheckOut(addDays(checkIn, n));
  };

  useEffect(() => {
    if (!token || !drawer || !propertyId || !checkIn || !checkOut) return;
    if (mode === 'block') return;
    getQuote(token, {
      propertyId,
      checkIn,
      checkOut,
      guests: Number(guests) || 2,
    })
      .then((r) => setQuote(r.quote))
      .catch(() => setQuote(null));
  }, [token, drawer, propertyId, guests, mode, checkIn, checkOut]);

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

  if (!drawer || !token) return null;

  const isEdit = drawer.mode === 'edit';
  const isBlock = mode === 'block' || drawer.kind === 'block';
  const title = isEdit
    ? drawer.kind === 'block'
      ? 'Блок дат'
      : 'Бронь'
    : isBlock
      ? 'Заблокировать даты'
      : 'Новая бронь';

  const save = async () => {
    if (!propertyId) {
      setErr('Выберите объект');
      return;
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setErr('Укажите заезд и выезд (выезд позже заезда)');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      if (isEdit && drawer.eventId && drawer.kind === 'block') {
        closeDrawer();
        return;
      }
      if (isEdit && drawer.eventId && drawer.kind !== 'block') {
        await updateBooking(token, drawer.eventId, {
          checkIn,
          checkOut,
          guestName: name || undefined,
          guestPhone: phone || undefined,
          guests: Number(guests) || 2,
          status: st,
        });
        flash('Изменения сохранены');
      } else if (isBlock) {
        await blockDates(token, {
          propertyId,
          from: checkIn,
          to: checkOut,
          note: note || undefined,
        });
        flash('Даты заблокированы');
      } else {
        await createBooking(token, {
          propertyId,
          checkIn,
          checkOut,
          guests: Number(guests) || 2,
          guestName: name || 'Гость',
          guestPhone: phone || undefined,
          totalPrice: quote?.totalPrice,
        });
        flash('Бронь создана');
      }
      closeDrawer();
      bump();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="backdrop">
      <div className="scrim" onClick={closeDrawer} />
      <aside className="drawer" role="dialog" aria-modal>
        <div className="drawer-h">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            <div className="mono" style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>
              {checkIn && checkOut ? `${formatDateRu(checkIn)} → ${formatDateRu(checkOut)}` : 'укажите даты'}
            </div>
          </div>
          <button className="btn btn-icon" onClick={closeDrawer} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="drawer-b">
          {!isEdit && (
            <div className="seg">
              <button className={mode === 'booking' ? 'on' : ''} onClick={() => setMode('booking')}>
                Бронь
              </button>
              <button className={mode === 'block' ? 'on' : ''} onClick={() => setMode('block')}>
                Блок дат
              </button>
            </div>
          )}

          <label className="field">
            <span>Объект</span>
            <select
              className="inp"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              disabled={isEdit}
            >
              <option value="">Выберите…</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>

          <div className="date-row">
            <label className="field" style={{ flex: 1 }}>
              <span>Заезд</span>
              <input
                className="inp mono"
                type="date"
                value={checkIn}
                onChange={(e) => setIn(e.target.value)}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Выезд</span>
              <input
                className="inp mono"
                type="date"
                value={checkOut}
                min={checkIn ? addDays(checkIn, 1) : undefined}
                onChange={(e) => setOut(e.target.value)}
              />
            </label>
          </div>
          <div className="nights-row">
            {([1, 2, 3, 7, 14] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={nights === n ? 'on' : ''}
                onClick={() => setNights(n)}
                disabled={!checkIn}
              >
                {n} {n === 1 ? 'ночь' : n < 5 ? 'ночи' : 'ночей'}
              </button>
            ))}
            <span className="nights-hint">
              {nights > 0
                ? `${nights} ${nights === 1 ? 'ночь' : nights < 5 ? 'ночи' : 'ночей'}`
                : 'выберите даты в календаре'}
            </span>
          </div>

          {isBlock ? (
            <>
              <label className="field">
                <span>Причина (видит только вы)</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ремонт, свои гости…" />
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="field">
                <span>Имя гостя</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Айгерим" />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Телефон</span>
                  <input
                    className="mono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 701 000 00 00"
                  />
                </label>
                <label className="field" style={{ width: 104 }}>
                  <span>Гостей</span>
                  <input className="mono" value={guests} onChange={(e) => setGuests(e.target.value)} />
                </label>
              </div>
              {isEdit && (
                <div className="field">
                  <span>Статус</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['pending', 'confirmed'] as const).map((id) => {
                      const on = st === id;
                      const c = ST[id];
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSt(id)}
                          style={{
                            flex: 1,
                            height: 32,
                            borderRadius: 8,
                            fontSize: 12,
                            border: `1px solid ${on ? c.bd : 'oklch(0.9 0.006 250)'}`,
                            background: on ? c.bg : '#fff',
                            color: on ? c.fg : 'oklch(0.45 0.012 250)',
                            fontWeight: on ? 500 : 400,
                          }}
                        >
                          {c.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {quote && (
                <div className="quote">
                  <div className="q-row">
                    <span style={{ color: 'oklch(0.5 0.012 250)' }}>Ночи</span>
                    <span className="mono">{quote.nights}</span>
                  </div>
                  {quote.breakdown && (
                    <>
                      <div className="q-row">
                        <span style={{ color: 'oklch(0.5 0.012 250)' }}>Проживание</span>
                        <span className="mono">{quote.breakdown.nightsTotal.toLocaleString('ru-RU')} ₸</span>
                      </div>
                      <div className="q-row">
                        <span style={{ color: 'oklch(0.5 0.012 250)' }}>Уборка</span>
                        <span className="mono">{quote.breakdown.cleaningFee.toLocaleString('ru-RU')} ₸</span>
                      </div>
                    </>
                  )}
                  <div className="q-row">
                    <span style={{ fontWeight: 500 }}>Итого</span>
                    <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>
                      {quote.totalPrice.toLocaleString('ru-RU')} ₸
                    </span>
                  </div>
                  {!quote.available && (
                    <div style={{ fontSize: 12, color: 'oklch(0.52 0.16 25)' }}>
                      {quote.reason === 'occupied' ? 'Даты заняты' : quote.reason ?? 'Недоступно'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
        </div>
        <div className="drawer-f">
          {isEdit && drawer.eventId && (
            <button
              className="btn btn-danger"
              onClick={() =>
                ask({
                  title: drawer.kind === 'block' ? 'Снять блок?' : 'Отменить бронь?',
                  text:
                    drawer.kind === 'block'
                      ? 'Даты снова станут доступны для продажи.'
                      : 'Даты освободятся в PMS — бот снова сможет их предлагать.',
                  cta: drawer.kind === 'block' ? 'Снять' : 'Отменить бронь',
                  onYes: async () => {
                    if (drawer.kind === 'block') await removeBlock(token, drawer.eventId!);
                    else await cancelBooking(token, drawer.eventId!);
                    flash(drawer.kind === 'block' ? 'Блок снят' : 'Бронь отменена');
                    closeDrawer();
                    bump();
                  },
                })
              }
            >
              {drawer.kind === 'block' ? 'Снять блок' : 'Отменить бронь'}
            </button>
          )}
          <button className="btn" style={{ marginLeft: 'auto' }} onClick={closeDrawer}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={() => void save()} disabled={busy}>
            {busy ? '…' : isEdit ? 'Сохранить' : isBlock ? 'Заблокировать' : 'Создать бронь'}
          </button>
        </div>
      </aside>
    </div>
  );
}

export function Confirm() {
  const { confirm, closeConfirm, doConfirm } = useUi();
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
            onClick={() => void doConfirm()}
            style={{ border: 'none', background: 'oklch(0.55 0.17 25)', color: '#fff', fontWeight: 500 }}
          >
            {confirm.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
