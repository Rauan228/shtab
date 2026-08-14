'use client';

import Link from 'next/link';
import { useUi } from '../lib/ui';

export function Settings() {
  const { href } = useUi();
  return (
    <div className="set">
      <Link href={href('/plan')} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Тариф и лимиты</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)' }}>
          Сколько квартир и диалогов осталось, что входит в подписку, как докупить пакет.
        </div>
      </Link>
      <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Контур</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'oklch(0.4 0.012 250)' }}>
          Кабинет <b>AmanAI</b> пишет в PMS агента. WhatsApp-бот читает те же квартиры, цены, фото и брони.
        </div>
        <div style={{ fontSize: 11, color: 'oklch(0.58 0.012 250)' }}>
          Это ваш личный кабинет: квартиры, календарь и брони видны только вам.
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
