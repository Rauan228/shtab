'use client';

import { useRouter } from 'next/navigation';
import { fmtKzt } from '../lib/format';
import { useStore } from '../lib/store';

export function Objects() {
  const router = useRouter();
  const { properties, archived, objTab, setObjTab, setObjId, addObject } = useStore();
  const list = objTab === 'archived' ? archived : properties;
  const empty = list.length === 0;

  return (
    <div>
      <div className="obj-head">
        <div className="seg">
          <button className={objTab === 'active' ? 'on' : ''} onClick={() => setObjTab('active')}>
            Активные · {properties.length}
          </button>
          <button className={objTab === 'archived' ? 'on' : ''} onClick={() => setObjTab('archived')}>
            Архив · {archived.length}
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            const id = addObject();
            router.push(`/objects/${id}`);
          }}
        >
          + Добавить объект
        </button>
      </div>

      {empty ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'oklch(0.95 0.006 250)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 18,
            }}
          >
            ◫
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Здесь пока пусто</div>
          <div style={{ fontSize: 13, color: 'oklch(0.55 0.012 250)', maxWidth: 320 }}>
            {objTab === 'archived'
              ? 'Скрытые объекты появятся здесь.'
              : 'Добавьте первый объект — бот начнёт отвечать по нему сразу после заполнения цены и правил.'}
          </div>
          {objTab !== 'archived' && (
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { const id = addObject(); router.push(`/objects/${id}`); }}>
              Добавить объект
            </button>
          )}
        </div>
      ) : (
        <div className="obj-grid" style={{ marginTop: 14 }}>
          {list.map((o) => {
            const checks = [
              { ok: o.price > 0, label: 'цена' },
              { ok: o.photos > 2, label: `фото ${o.photos}` },
              { ok: o.ready, label: 'правила' },
              { ok: o.ready, label: 'заезд' },
            ];
            return (
              <div
                key={o.id}
                className="obj-card"
                onClick={() => {
                  setObjId(o.id);
                  router.push(`/objects/${o.id}`);
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="ph">фото</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div className="trunc" style={{ fontSize: 14, fontWeight: 600 }}>
                        {o.title}
                      </div>
                      <div className={`badge ${o.ready ? 'badge-ok' : 'badge-warn'}`}>
                        {o.ready ? 'готов к продаже' : 'не готов'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>{o.addr}</div>
                    <div className="mono" style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 500 }}>{fmtKzt(o.price)} ₸</span>
                      <span style={{ color: 'oklch(0.58 0.01 250)' }}>до {o.guests} гостей</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: '1px solid oklch(0.95 0.004 250)',
                    paddingTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {checks.map((c) => (
                    <span key={c.label} className={c.ok ? 'chip chip-ok' : 'chip'}>
                      {c.label}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'oklch(0.6 0.01 250)' }}>
                    {Math.round(40 + (o.price % 7) * 6)}% занято
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
