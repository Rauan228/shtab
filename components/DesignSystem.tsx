'use client';

import { ST, type Status } from '../lib/demo';

const SWATCHES = [
  { name: 'Teal', token: '--brand', c: '#127f86' },
  { name: 'Deep', token: '--brand-deep', c: '#0b4a58' },
  { name: 'Glow', token: '--brand-glow', c: '#3dff8a' },
  { name: 'Ink', token: '--fg', c: '#0c2a32' },
  { name: 'Canvas', token: '--bg', c: '#f3f8f8' },
  { name: 'Soft', token: '--brand-soft', c: '#e6f5f4' },
  { name: 'Pending', token: '--amber', c: 'oklch(0.75 0.14 75)' },
  { name: 'Danger', token: '--red', c: 'oklch(0.55 0.17 25)' },
];

export function DesignSystem() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1080 }}>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Токены · цвет</div>
        <div className="token-grid">
          {SWATCHES.map((s) => (
            <div key={s.token} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="swatch" style={{ background: s.c }} />
              <div style={{ fontSize: 11, fontWeight: 500 }}>{s.name}</div>
              <div className="mono" style={{ fontSize: 9, color: 'oklch(0.6 0.01 250)' }}>
                {s.token}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="g2">
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Типографика · IBM Plex Sans / Mono</div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Заголовок 30/600</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Секция 20/600</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Карточка 15/600</div>
          <div style={{ fontSize: 13 }}>Основной текст 13/400 — плотность ops-интерфейса</div>
          <div style={{ fontSize: 11, color: 'oklch(0.55 0.012 250)' }}>Подпись 11/400 muted</div>
          <div className="mono" style={{ fontSize: 14 }}>
            18 000 ₸ · 13.08.2026 · 14:00
          </div>
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Кнопки и поля</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary">Primary</button>
            <button className="btn">Secondary</button>
            <button className="btn btn-danger">Danger</button>
            <button className="btn" disabled style={{ background: 'oklch(0.96 0.004 250)', color: 'oklch(0.72 0.008 250)', borderColor: 'oklch(0.93 0.006 250)' }}>
              Disabled
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(ST) as Status[]).map((id) => {
              const c = ST[id];
              return (
                <span
                  key={id}
                  style={{
                    fontSize: 11,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: c.bg,
                    border: `1px solid ${c.bd}`,
                    color: c.fg,
                  }}
                >
                  {c.label}
                </span>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="inp" style={{ color: 'oklch(0.68 0.01 250)' }}>
              Placeholder
            </div>
            <div
              className="inp"
              style={{ borderColor: 'oklch(0.55 0.1 200)', boxShadow: '0 0 0 3px oklch(0.55 0.1 200 / 0.15)' }}
            >
              Focus
            </div>
          </div>
          <div className="inp" style={{ borderColor: 'oklch(0.78 0.13 25)', color: 'oklch(0.5 0.15 25)' }}>
            Ошибка: укажите цену
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Загрузка · skeleton</div>
          {[100, 70, 45].map((w) => (
            <div
              key={w}
              style={{
                height: 12,
                width: `${w}%`,
                borderRadius: 4,
                background: 'linear-gradient(90deg, oklch(0.94 0.006 250) 0%, oklch(0.97 0.004 250) 50%, oklch(0.94 0.006 250) 100%)',
                backgroundSize: '300px 100%',
                animation: 'shimmer 1.4s infinite linear',
              }}
            />
          ))}
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Ошибка + повтор</div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.012 250)', lineHeight: 1.5 }}>
            Не удалось загрузить календарь. Проверьте соединение.
          </div>
          <button className="btn btn-xs" style={{ alignSelf: 'flex-start' }}>
            Повторить
          </button>
        </div>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Toast</div>
          <div
            style={{
              background: 'oklch(0.24 0.012 250)',
              color: '#fff',
              borderRadius: 9,
              padding: '10px 12px',
              fontSize: 12,
              display: 'flex',
              gap: 8,
            }}
          >
            <span style={{ color: 'oklch(0.8 0.14 155)' }}>✓</span>Бронь сохранена
          </div>
          <div
            style={{
              background: 'oklch(0.96 0.03 25)',
              border: '1px solid oklch(0.88 0.06 25)',
              color: 'oklch(0.45 0.14 25)',
              borderRadius: 9,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            Даты заняты другой бронью
          </div>
        </div>
      </div>
    </div>
  );
}
