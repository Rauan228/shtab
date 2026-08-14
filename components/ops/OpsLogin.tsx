'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOpsAuth } from '../../lib/ops-auth';
import { BrandMark } from '../BrandMark';

export function OpsLogin() {
  const { login } = useOpsAuth();
  const router = useRouter();
  const [email, setEmail] = useState('ops@aman.ai');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const ok = await login(email, pass);
      if (!ok) {
        setErr('Неверный вход в админку');
        return;
      }
      router.push('/ops');
    } catch {
      setErr('Сервер недоступен');
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
        <h1>Админка</h1>
        <div className="login-sub">Клиенты, тарифы, лимиты. Кабинеты владельцев — отдельно.</div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input className="inp" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input
              className="inp"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? '…' : 'Войти'}
          </button>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">Ops</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>Один WaveSpeed на всех</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
              WhatsApp-instance — свой у клиента. Лимиты режет тариф, не ключ LLM.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
