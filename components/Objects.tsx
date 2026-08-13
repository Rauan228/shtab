'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createApartment,
  deleteApartment,
  formatKzt,
  listApartments,
  saveApartment,
  type ApartmentListItem,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';

export function Objects() {
  const { token } = useAuth();
  const { flash, ask, reloadTick, bump } = useUi();
  const router = useRouter();
  const [items, setItems] = useState<ApartmentListItem[] | null>(null);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems((await listApartments(token)).apartments);
      setErr('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось загрузить');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load, reloadTick]);

  const active = items?.filter((a) => !a.archived) ?? [];
  const archived = items?.filter((a) => a.archived) ?? [];
  const list = tab === 'archived' ? archived : active;

  const add = async () => {
    if (!token) return;
    const title = window.prompt('Название объекта');
    if (!title?.trim()) return;
    try {
      const { property } = await createApartment(token, { title: title.trim(), basePrice: 0, maxGuests: 2 });
      flash('Объект создан — заполните цену и правила');
      bump();
      router.push(`/objects/${property.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось создать');
    }
  };

  return (
    <div>
      <div className="obj-head">
        <div className="seg">
          <button className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>
            Активные · {active.length}
          </button>
          <button className={tab === 'archived' ? 'on' : ''} onClick={() => setTab('archived')}>
            Архив · {archived.length}
          </button>
        </div>
        <button className="btn btn-primary" onClick={() => void add()}>
          + Добавить объект
        </button>
      </div>

      {err && (
        <div className="err-box" style={{ marginTop: 12 }}>
          <span className="err-dot" />
          {err}
        </div>
      )}

      {items === null ? (
        <div className="skel" style={{ height: 120, marginTop: 14 }} />
      ) : list.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Здесь пока пусто</div>
          <div style={{ fontSize: 13, color: 'oklch(0.55 0.012 250)', maxWidth: 320 }}>
            {tab === 'archived'
              ? 'Скрытые объекты появятся здесь.'
              : 'Добавьте первую квартиру — бот начнёт отвечать по ней после цены, правил и фото.'}
          </div>
          {tab !== 'archived' && (
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => void add()}>
              Добавить объект
            </button>
          )}
        </div>
      ) : (
        <div className="obj-grid" style={{ marginTop: 14 }}>
          {list.map((o) => (
            <div key={o.id} className="obj-card" onClick={() => router.push(`/objects/${o.id}`)}>
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
                  <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>{o.address || 'Адрес не указан'}</div>
                  <div className="mono" style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 500 }}>{o.basePrice > 0 ? formatKzt(o.basePrice) : 'нет цены'}</span>
                    <span style={{ color: 'oklch(0.58 0.01 250)' }}>до {o.maxGuests} гостей</span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid oklch(0.95 0.004 250)',
                  paddingTop: 10,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span className={o.basePrice > 0 ? 'chip chip-ok' : 'chip'}>цена</span>
                <span className={o.rulesFilled ? 'chip chip-ok' : 'chip'}>правила</span>
                <span className={o.infoFilled ? 'chip chip-ok' : 'chip'}>заезд</span>
                {!o.archived && token && (
                  <button
                    className="chip"
                    style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      ask({
                        title: 'Скрыть из продажи?',
                        text: 'Бот перестанет предлагать объект. История броней останется.',
                        cta: 'Скрыть',
                        onYes: async () => {
                          await saveApartment(token, o.id, { property: { archived: true } });
                          flash('Скрыт из продажи');
                          bump();
                          await load();
                        },
                      });
                    }}
                  >
                    скрыть
                  </button>
                )}
                {o.archived && token && (
                  <button
                    className="chip"
                    style={{ marginLeft: 'auto', cursor: 'pointer', border: 'none' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      void (async () => {
                        await deleteApartment(token, o.id);
                        flash('Удалён');
                        bump();
                        await load();
                      })();
                    }}
                  >
                    удалить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
