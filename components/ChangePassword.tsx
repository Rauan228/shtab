'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '../lib/api';
import { useAuth } from '../lib/auth';
import { BrandMark } from './BrandMark';

export function ChangePassword() {
  const { token, logout, clearMustChange, ready, mustChangePassword } = useAuth();
  const router = useRouter();

  if (ready && !token) {
    router.replace('/');
  }
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!token) return;
    if (next.length < 8) {
      setErr('Новый пароль минимум 8 символов');
      return;
    }
    if (next !== again) {
      setErr('Пароли не совпадают');
      return;
    }
    if (next === current) {
      setErr('Новый пароль должен отличаться от временного');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await changePassword(token, current, next);
      clearMustChange();
      router.replace('/calendar');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось сменить пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-l">
        <div className="brand-row">
          <BrandMark size={36} />
          <div className="wordmark" style={{ fontSize: 18 }}>
            <span className="wm-aman">Aman</span>
            <span className="wm-ai">AI</span>
          </div>
        </div>
        <h1>Смените пароль</h1>
        <div className="login-sub">
          Вам выдали временный пароль для первого входа. Придумайте свой — его будете знать только вы.
        </div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Временный пароль</span>
            <input className="inp" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className="field">
            <span>Новый пароль</span>
            <input className="inp" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <label className="field">
            <span>Ещё раз</span>
            <input className="inp" type="password" value={again} onChange={(e) => setAgain(e.target.value)} />
          </label>
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? '…' : 'Сохранить и войти'}
          </button>
          <button type="button" className="btn" onClick={() => logout()}>
            Выйти
          </button>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">Безопасность</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Только ваш пароль</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
              Временный пароль из админки больше не сработает после смены.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
