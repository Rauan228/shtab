'use client';

import Link from 'next/link';
import { BrandMark } from './BrandMark';

export function NotFound() {
  return (
    <div className="login">
      <div className="login-l" style={{ maxWidth: 480 }}>
        <div className="brand-row">
          <BrandMark size={36} />
          <div className="wordmark" style={{ fontSize: 18 }}>
            <span className="wm-aman">Aman</span>
            <span className="wm-ai">AI</span>
          </div>
        </div>
        <div className="mono" style={{ fontSize: 48, fontWeight: 600, color: 'var(--brand-deep)' }}>
          404
        </div>
        <h1 style={{ marginTop: 8 }}>Такой страницы нет</h1>
        <div className="login-sub">
          Ссылка неверная или у вас нет доступа к этому адресу. Проверьте путь или вернитесь в кабинет.
        </div>
        <Link href="/calendar" className="btn btn-primary" style={{ width: 'fit-content', marginTop: 8 }}>
          В кабинет
        </Link>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">AmanAI</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Кабинет владельца</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
              Календарь, объекты и брони — только ваши данные.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
