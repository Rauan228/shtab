'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getToken } from '../../lib/api';
import { useOpsAuth } from '../../lib/ops-auth';
import { BrandMark } from '../BrandMark';

export function OpsLogin() {
  const { login } = useOpsAuth();
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ownerToken = typeof window !== 'undefined' ? getToken() : null;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const tok = getToken();
    if (!tok) {
      setErr('Сначала войдите в кабинет через pilot-local');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const ok = await login(tok);
      if (!ok) {
        setErr('Админка открывается только из тестового кабинета (pilot-local)');
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
        <div className="login-sub">
          Только из тестового кабинета: сначала войдите на главной через <b>pilot-local</b>, потом сюда.
        </div>
        <form className="login-form" onSubmit={submit}>
          {err && (
            <div className="err-box">
              <span className="err-dot" />
              {err}
            </div>
          )}
          {!ownerToken && (
            <div className="err-box">
              <span className="err-dot" />
              Нет сессии кабинета.{' '}
              <Link href="/" style={{ color: 'inherit', textDecoration: 'underline' }}>
                Войти как pilot-local
              </Link>
            </div>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy || !ownerToken}>
            {busy ? '…' : 'Открыть админку'}
          </button>
        </form>
      </div>
      <div className="login-r">
        <div className="preview">
          <div className="prev-card">
            <div className="kicker">Тестовая среда</div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>org-pilot навсегда</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6, lineHeight: 1.5 }}>
              Клиентские кабинеты сюда не пускаем. Просмотр чужого кабинета — только чтение.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
