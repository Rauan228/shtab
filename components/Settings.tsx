'use client';

import { useStore } from '../lib/store';

export function Settings() {
  const { notify, toggleNotify } = useStore();
  return (
    <div className="set">
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Доступ</div>
        <label className="field">
          <span>Пароль кабинета</span>
          <div className="inp mono" style={{ display: 'flex', alignItems: 'center' }}>
            ••••••••
          </div>
        </label>
        <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
          Один пароль на кабинет. Роли и отдельные аккаунты появятся позже.
        </div>
      </div>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Регион и уведомления</div>
        <div className="g2">
          <label className="field">
            <span>Часовой пояс</span>
            <div className="inp" style={{ display: 'flex', alignItems: 'center' }}>
              Asia/Almaty (UTC+5)
            </div>
          </label>
          <label className="field">
            <span>Валюта</span>
            <div className="inp" style={{ display: 'flex', alignItems: 'center' }}>
              Тенге, ₸
            </div>
          </label>
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
          <button type="button" className={`toggle${notify ? ' on' : ''}`} onClick={toggleNotify}>
            <i />
          </button>
          <div style={{ fontSize: 12 }}>Присылать новые брони в WhatsApp</div>
        </div>
      </div>
    </div>
  );
}
