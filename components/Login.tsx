'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';

export function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pass.trim()) {
      setErr('Введите пароль');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const ok = await login(pass);
      if (!ok) {
        setErr('Неверный пароль. Попробуйте снова.');
        return;
      }
      router.push('/calendar');
    } catch {
      setErr('Не удалось связаться с сервером агента');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-l">
        <div className="brand-row">
          <div className="mark">S</div>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>Shtab</div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: 'oklch(0.6 0.01 250)',
              borderLeft: '1px solid oklch(0.9 0.006 250)',
              paddingLeft: 10,
            }}
          >
            AI-менеджер в WhatsApp
          </div>
        </div>
        <h1>Кабинет владельца</h1>
        <div className="login-sub">Занятость, брони и правила, по которым бот продаёт ваши объекты.</div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Пароль доступа</span>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={pass}
              autoFocus
              autoComplete="current-password"
              onChange={(e) => {
                setPass(e.target.value);
                setErr('');
              }}
            />
          </label>
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Вхожу…' : 'Войти'}
          </button>
          <div className="hint-xs">Пароль кабинета = ADMIN_TOKEN на сервере агента.</div>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">Shtab</div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Живой PMS</div>
            <div style={{ fontSize: 12, color: 'oklch(0.55 0.012 250)', marginTop: 6, lineHeight: 1.5 }}>
              Календарь, объекты и брони — те же данные, что видит бот в WhatsApp.
            </div>
          </div>
          <div className="prev-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="wa-status">
              <span className="pulse" />
              Бот отвечает в WhatsApp
            </div>
            <div style={{ height: 1, background: 'oklch(0.93 0.006 250)' }} />
            <div className="bubbles">
              <div className="bbl bbl-in">Здравствуйте! Есть квартира на выходные?</div>
              <div className="bbl bbl-out">Здравствуйте! На какие даты и сколько вас человек?</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
