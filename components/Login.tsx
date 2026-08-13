'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';

export function Login() {
  const { login } = useStore();
  const router = useRouter();
  const [pass, setPass] = useState('');
  const [err, setErr] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!login(pass)) {
      setErr(true);
      return;
    }
    router.push('/calendar');
  };

  return (
    <div className="login">
      <div className="login-l">
        <div className="brand-row">
          <div className="mark">B</div>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>Brand</div>
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
                setErr(false);
              }}
            />
          </label>
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              Неверный пароль. Попробуйте снова.
            </div>
          )}
          <button className="btn btn-primary" type="submit">
            Войти
          </button>
          <div className="hint-xs">Один пароль на кабинет. Забыли — напишите в поддержку в WhatsApp.</div>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">Сегодня</div>
            <div className="prev-kpis">
              <div>
                <div className="n">3</div>
                <div className="l">заезда</div>
              </div>
              <div>
                <div className="n">2</div>
                <div className="l">выезда</div>
              </div>
              <div>
                <div className="n" style={{ color: 'oklch(0.6 0.14 75)' }}>
                  4
                </div>
                <div className="l">ждут ответа</div>
              </div>
            </div>
          </div>
          <div className="prev-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="wa-status">
              <span className="pulse" />
              Бот отвечает в WhatsApp
            </div>
            <div style={{ height: 1, background: 'oklch(0.93 0.006 250)' }} />
            <div className="bubbles">
              <div className="bbl bbl-in">Здравствуйте! Есть 2-к на 15–17 августа?</div>
              <div className="bbl bbl-out">
                Да, «Достык 12/4» свободна. 3 ночи — 54 000 ₸ с уборкой. Бронирую?
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
