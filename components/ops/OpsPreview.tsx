'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { previewOpsOrg } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';
import { AuthProvider } from '../../lib/auth';
import { UiProvider } from '../../lib/ui';
import { Shell } from '../Shell';
import { CalendarView } from '../CalendarView';

export function OpsPreview({ id }: { id: string }) {
  const { token } = useOpsAuth();
  const [preview, setPreview] = useState<{ token: string; name: string } | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token) return;
    previewOpsOrg(token, id)
      .then((r) => setPreview({ token: r.token, name: r.org.name }))
      .catch((e) => setErr(e instanceof Error ? e.message : 'не открылось'));
  }, [token, id]);

  if (err) return <div className="err-box">{err}</div>;
  if (!preview) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div className="ops-preview-bar">
        <span>
          Просмотр · <b>{preview.name}</b> · только чтение
        </span>
        <Link href={`/ops/clients/${id}`} className="btn btn-xs">
          Назад в админку
        </Link>
      </div>
      <AuthProvider tokenOverride={preview.token}>
        <UiProvider readOnly>
          <Shell>
            <CalendarView />
          </Shell>
        </UiProvider>
      </AuthProvider>
    </div>
  );
}
