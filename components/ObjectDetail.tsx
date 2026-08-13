'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteApartment,
  deleteApartmentPhoto,
  getApartment,
  listApartmentPhotos,
  saveApartment,
  uploadApartmentPhoto,
  type ApartmentInfo,
  type ApartmentPhoto,
  type Property,
  type PropertyRules,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { useUi } from '../lib/ui';

export function ObjectDetail({ id }: { id: string }) {
  const { token } = useAuth();
  const { flash, ask } = useUi();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [rules, setRules] = useState<PropertyRules | null>(null);
  const [info, setInfo] = useState<ApartmentInfo | null>(null);
  const [photos, setPhotos] = useState<ApartmentPhoto[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([getApartment(token, id), listApartmentPhotos(token, id)])
      .then(([a, ph]) => {
        setProperty(a.property);
        setRules(a.rules);
        setInfo(a.info ?? { id });
        setPhotos(ph.photos);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'Не удалось загрузить'));
  }, [token, id]);

  if (err && !property) {
    return (
      <div className="err-box">
        <span className="err-dot" />
        {err}
      </div>
    );
  }
  if (!property || !rules || !info || !token) return <div className="skel" style={{ height: 200 }} />;

  const setP = (patch: Partial<Property>) => {
    setProperty({ ...property, ...patch });
    setDirty(true);
  };
  const setR = (patch: Partial<PropertyRules>) => {
    setRules({ ...rules, ...patch });
    setDirty(true);
  };
  const setI = (patch: Partial<ApartmentInfo>) => {
    setInfo({ ...info, ...patch });
    setDirty(true);
  };

  const progress =
    (property.basePrice > 0 ? 25 : 0) +
    (rules.minNights > 0 ? 25 : 0) +
    (info.checkinInstructions || info.rules ? 25 : 0) +
    (photos.length > 0 ? 25 : 0);

  const save = async () => {
    setBusy(true);
    try {
      await saveApartment(token, id, { property, rules, info });
      setDirty(false);
      flash('Объект сохранён — бот уже видит эти данные');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const data = await fileToDataUrl(file);
      const saved = await uploadApartmentPhoto(token, id, file.name, data);
      setPhotos((p) => [...p, saved.photo]);
    }
    flash('Фото загружены');
  };

  return (
    <div className="narrow">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-xs" onClick={() => router.push('/objects')}>
          ← Объекты
        </button>
        <div className={`badge ${progress === 100 ? 'badge-ok' : 'badge-warn'}`}>
          {progress === 100 ? 'готов к продаже' : 'не готов'}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-sm"
            onClick={() =>
              ask({
                title: 'Скрыть объект из продажи?',
                text: 'Бот перестанет его предлагать.',
                cta: 'Скрыть',
                onYes: async () => {
                  await saveApartment(token, id, { property: { archived: true } });
                  flash('Скрыт');
                  router.push('/objects');
                },
              })
            }
          >
            Скрыть из продажи
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              ask({
                title: 'Удалить объект?',
                text: 'Удалится из PMS. Обычно достаточно скрыть.',
                cta: 'Удалить',
                onYes: async () => {
                  await deleteApartment(token, id);
                  flash('Удалён');
                  router.push('/objects');
                },
              })
            }
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="detail-hero">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{property.title}</div>
          <div style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)', marginTop: 3 }}>{property.address}</div>
        </div>
        <div className="prog">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span>Готовность</span>
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
            <span className="sec-n">01</span>Что продаём
          </div>
          <label className="field">
            <span>Название</span>
            <input value={property.title} onChange={(e) => setP({ title: e.target.value })} />
          </label>
          <label className="field">
            <span>Адрес</span>
            <input value={property.address ?? ''} onChange={(e) => setP({ address: e.target.value })} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Цена за сутки, ₸</span>
              <input
                className="mono"
                type="number"
                value={property.basePrice}
                onChange={(e) => setP({ basePrice: Number(e.target.value) })}
              />
            </label>
            <label className="field" style={{ width: 120 }}>
              <span>Макс. гостей</span>
              <input
                className="mono"
                type="number"
                value={property.maxGuests}
                onChange={(e) => setP({ maxGuests: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">02</span>Правила продажи
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(
              [
                ['checkInTime', 'Заезд с', rules.checkInTime],
                ['checkOutTime', 'Выезд до', rules.checkOutTime],
                ['minNights', 'Мин. ночей', rules.minNights],
                ['baseGuests', 'Гостей в цене', rules.baseGuests],
                ['extraGuestFee', 'Доп. гость, ₸/ночь', rules.extraGuestFee],
                ['cleaningFee', 'Уборка, ₸', rules.cleaningFee],
                ['deposit', 'Депозит, ₸', rules.deposit],
                ['weekendPrice', 'Пт–Сб, ₸/ночь', rules.weekendPrice ?? 0],
              ] as const
            ).map(([key, label, value]) => (
              <label key={key} className="field">
                <span>{label}</span>
                <input
                  className="inp mono"
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (key === 'checkInTime' || key === 'checkOutTime') setR({ [key]: v });
                    else setR({ [key]: Number(v) || 0 });
                  }}
                />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid oklch(0.95 0.004 250)', paddingTop: 12 }}>
            <button
              type="button"
              className={`toggle${rules.autoBookingEnabled ? ' on' : ''}`}
              onClick={() => setR({ autoBookingEnabled: !rules.autoBookingEnabled })}
            >
              <i />
            </button>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>Бот бронирует сам</div>
              <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>Если даты свободны и правила сходятся</div>
            </div>
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">03</span>Тексты клиенту
          </div>
          <label className="field">
            <span>Инструкция по заезду</span>
            <textarea
              value={info.checkinInstructions ?? ''}
              onChange={(e) => setI({ checkinInstructions: e.target.value })}
            />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Wi-Fi сеть</span>
              <input
                className="mono"
                value={info.wifi?.name ?? ''}
                onChange={(e) => setI({ wifi: { ...info.wifi, name: e.target.value } })}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Пароль</span>
              <input
                className="mono"
                value={info.wifi?.password ?? ''}
                onChange={(e) => setI({ wifi: { ...info.wifi, password: e.target.value } })}
              />
            </label>
          </div>
          <label className="field">
            <span>Правила дома</span>
            <textarea value={info.rules ?? ''} onChange={(e) => setI({ rules: e.target.value })} />
          </label>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sec-h">
            <span className="sec-n">04</span>Фото
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'oklch(0.6 0.01 250)', fontWeight: 400 }}>
              {photos.length} · первое уходит гостю
            </span>
          </div>
          <div className="photo-grid">
            {photos.map((p, i) => (
              <div key={p.fileName} className="photo" style={{ backgroundImage: `url(${photoSrc(p.url)})`, backgroundSize: 'cover' }}>
                {i === 0 && <span className="cover-tag">главное</span>}
                <button
                  type="button"
                  className="btn btn-xs"
                  style={{ position: 'absolute', right: 4, bottom: 4 }}
                  onClick={() =>
                    void deleteApartmentPhoto(token, id, p.fileName).then(() =>
                      setPhotos((xs) => xs.filter((x) => x.fileName !== p.fileName)),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="photo-add">
              <span style={{ fontSize: 16, fontWeight: 300 }}>+</span>
              <span style={{ fontSize: 9 }}>загрузить</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => void onFiles(e.target.files)} />
            </label>
          </div>
          <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>JPG/PNG. Эти же файлы бот шлёт в WhatsApp.</div>
        </div>
      </div>

      {dirty && (
        <div className="dirty-bar">
          <span style={{ fontSize: 12, flex: 1 }}>Есть несохранённые изменения</span>
          <button className="btn btn-xs" onClick={() => window.location.reload()} style={{ background: 'transparent', color: '#fff', borderColor: 'oklch(0.42 0.012 250)' }}>
            Отменить
          </button>
          <button className="btn btn-xs" onClick={() => void save()} disabled={busy} style={{ border: 'none', background: '#fff', color: 'oklch(0.24 0.012 250)', fontWeight: 500 }}>
            Сохранить
          </button>
        </div>
      )}
    </div>
  );
}

function photoSrc(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    const i = u.pathname.indexOf('/photos/');
    if (i >= 0) return u.pathname.slice(i);
  } catch {
    /* ignore */
  }
  return url;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
