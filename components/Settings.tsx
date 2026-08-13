'use client';

export function Settings() {
  return (
    <div className="set">
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Контур</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)' }}>
          Кабинет <b>Shtab</b> пишет в PMS агента. WhatsApp-бот читает те же квартиры, цены, фото и брони.
        </div>
        <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
          Пароль входа = <span className="mono">ADMIN_TOKEN</span> на VPS (`assistant`).
        </div>
      </div>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Регион</div>
        <div className="g2">
          <label className="field">
            <span>Часовой пояс</span>
            <div className="inp">Asia/Almaty (UTC+5)</div>
          </label>
          <label className="field">
            <span>Валюта</span>
            <div className="inp">Тенге, ₸</div>
          </label>
        </div>
      </div>
    </div>
  );
}
