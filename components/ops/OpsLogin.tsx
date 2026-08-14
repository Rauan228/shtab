'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../../lib/api';
import { opsGate } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';
import { BrandMark } from '../BrandMark';
import { NotFound } from '../NotFound';

export function OpsLogin() {
  const { login } = useOpsAuth();
  const router = useRouter();
  const [gate, setGate] = useState<'wait' | 'ok' | 'hide'>('wait');
  const [email, setEmail] = useState('ops@aman.ai');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tok = getToken();
    if (!tok) {
      setGate('hide');
      return;
    }
    void opsGate(tok).then((ok) => setGate(ok ? 'ok' : 'hide'));
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const tok = getToken();
    if (!tok) {
      setGate('hide');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const result = await login(email, pass, tok);
      if (result === 'denied') {
        setGate('hide');
        return;
      }
      if (result !== 'ok') {
        setErr('Неверный email или пароль');
        return;
      }
      router.push('/ops');
    } catch {
      setErr('Не удалось связаться с сервером');
    } finally {
      setBusy(false);
    }
  };

  if (gate === 'wait') return <div className="boot" />;
  if (gate === 'hide') return <NotFound />;

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
        <div className="login-sub">Клиенты, тарифы и лимиты AmanAI.</div>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input
              className="inp"
              type="email"
              value={email}
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
              WhatsApp у каждого клиента свой. Лимиты — по тарифу.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
