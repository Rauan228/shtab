'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { BrandMark } from './BrandMark';

export function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
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
      const ok = await login(email, pass);
      if (!ok) {
        setErr('Неверный email или пароль. Попробуйте снова.');
        return;
      }
      if (typeof window !== 'undefined' && localStorage.getItem('kz_ai_must_change_pw') === '1') {
        router.push('/welcome-password');
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
          <BrandMark size={36} />
          <div>
            <div className="wordmark" style={{ fontSize: 18 }}>
              <span className="wm-aman">Aman</span>
              <span className="wm-ai">AI</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 2 }}>AI-менеджер в WhatsApp</div>
          </div>
        </div>
        <h1>Кабинет владельца</h1>
        <div className="login-sub">Занятость, брони и правила, по которым AmanAI продаёт ваши объекты.</div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              className="inp"
              type="email"
              placeholder="you@mail.kz"
              value={email}
              autoFocus
              autoComplete="username"
              onChange={(e) => {
                setEmail(e.target.value);
                setErr('');
              }}
            />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={pass}
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
          <div className="hint-xs">Email и пароль, которые вам выдали для этого кабинета.</div>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div style={{ display: 'grid', placeItems: 'center', padding: '8px 0 4px' }}>
            <BrandMark size={220} hero />
          </div>
          <div className="prev-card">
            <div className="kicker">AmanAI</div>
            <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Сіздің ісіңіз аман</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
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
