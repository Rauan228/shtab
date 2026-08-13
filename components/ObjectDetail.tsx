'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RULES } from '../lib/demo';
import { useStore } from '../lib/store';

export function ObjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const {
    properties,
    objectsLabel,
    setObjId,
    detail,
    setDetail,
    dirty,
    resetDirty,
    saveDetail,
    auto,
    toggleAuto,
    askConfirm,
  } = useStore();

  useEffect(() => {
    if (id) setObjId(id);
  }, [id, setObjId]);

  const p = properties.find((x) => x.id === id);

  useEffect(() => {
    if (id && !properties.some((x) => x.id === id)) router.replace('/objects');
  }, [id, properties, router]);

  if (!p) {
    return <div className="boot" />;
  }

  const progress = p.ready ? 85 : p.price > 0 ? 45 : 20;

  return (
    <div className="narrow">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-xs" onClick={() => router.push('/objects')}>
          ← {objectsLabel}
        </button>
        <div className={`badge ${p.ready ? 'badge-ok' : 'badge-warn'}`}>
          {p.ready ? 'готов к продаже' : 'не готов'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            onClick={() =>
              askConfirm({
                title: 'Скрыть объект из продажи?',
                text: 'Бот перестанет предлагать его гостям. История броней сохранится, вернуть можно в любой момент.',
                cta: 'Скрыть',
                kind: 'archive',
              })
            }
          >
            Скрыть из продажи
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              askConfirm({
                title: 'Удалить объект?',
                text: 'Удалится вместе с бронями и фото. Действие необратимо — обычно достаточно скрыть из продажи.',
                cta: 'Удалить',
                kind: 'delete',
              })
            }
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="detail-hero">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' }}>{detail.title}</div>
          <div style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>{detail.address}</div>
        </div>
        <div className="prog">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'oklch(0.5 0.012 250)', marginBottom: 6 }}>
            <span>Готовность к продаже</span>
            <span className="mono">{progress}%</span>
          </div>
          <div className="bar">
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">01</span>
            Что продаём
          </div>
          <label className="field">
            <span>Название</span>
            <input value={detail.title} onChange={(e) => setDetail({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Адрес</span>
            <input value={detail.address} onChange={(e) => setDetail({ address: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Цена за сутки, ₸</span>
              <input className="mono" value={detail.price} onChange={(e) => setDetail({ price: e.target.value })} />
            </label>
            <label className="field" style={{ width: 120 }}>
              <span>Макс. гостей</span>
              <input className="mono" value={detail.guests} onChange={(e) => setDetail({ guests: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">02</span>
            Правила продажи
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'oklch(0.6 0.01 250)', fontWeight: 400 }}>
              по ним считает бот
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {RULES.map((f) => (
              <label key={f.label} className="field">
                <span>{f.label}</span>
                <div className="inp mono" style={{ display: 'flex', alignItems: 'center', height: 34 }}>
                  {f.value}
                </div>
              </label>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              borderTop: '1px solid oklch(0.95 0.004 250)',
              paddingTop: 12,
            }}
          >
            <button type="button" className={`toggle${auto ? ' on' : ''}`} onClick={toggleAuto} aria-label="Автобронь">
              <i />
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Бот бронирует сам</div>
              <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
                Без подтверждения, если даты свободны и правила сходятся
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">03</span>
            Тексты клиенту
          </div>
          <label className="field">
            <span>Инструкция по заезду</span>
            <textarea value={detail.checkin} onChange={(e) => setDetail({ checkin: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Wi-Fi сеть</span>
              <input className="mono" value={detail.wifi} onChange={(e) => setDetail({ wifi: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Пароль</span>
              <input className="mono" value={detail.wifiPass} onChange={(e) => setDetail({ wifiPass: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Правила дома</span>
            <textarea value={detail.rules} onChange={(e) => setDetail({ rules: e.target.value })} />
          </label>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">04</span>
            Фото
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'oklch(0.6 0.01 250)', fontWeight: 400 }}>
              {p.photos} из 10 · первое уходит гостю
            </span>
          </div>
          <div className="photo-grid">
            {Array.from({ length: Math.max(p.photos, 1) }).map((_, i) => (
              <div key={i} className="photo">
                {i === 0 ? 'обложка' : `фото ${i + 1}`}
                {i === 0 && <span className="cover-tag">главное</span>}
              </div>
            ))}
            <button type="button" className="photo-add">
              <span style={{ fontSize: 16, fontWeight: 300 }}>+</span>
              <span style={{ fontSize: 9 }}>загрузить</span>
            </button>
          </div>
          <div style={{ borderTop: '1px solid oklch(0.95 0.004 250)', paddingTop: 12, fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
            Перетащите файлы или выберите с устройства. JPG/PNG до 5 МБ.
          </div>
        </div>
      </div>

      {dirty && (
        <div className="dirty-bar">
          <span style={{ fontSize: 12, flex: 1 }}>Есть несохранённые изменения</span>
          <button
            className="btn btn-xs"
            onClick={resetDirty}
            style={{ borderColor: 'oklch(0.42 0.012 250)', background: 'transparent', color: '#fff' }}
          >
            Отменить
          </button>
          <button className="btn btn-xs" onClick={saveDetail} style={{ border: 'none', background: '#fff', color: 'oklch(0.24 0.012 250)', fontWeight: 500 }}>
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}
