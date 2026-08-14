'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { previewOpsOrg } from '../../lib/ops-api';
import { useOpsAuth } from '../../lib/ops-auth';
import { AuthProvider } from '../../lib/auth';
import { UiProvider } from '../../lib/ui';
import { Shell } from '../Shell';
import { CalendarView } from '../CalendarView';
import { Objects } from '../Objects';
import { ObjectDetail } from '../ObjectDetail';
import { Today } from '../Today';
import { Plan } from '../Plan';
import { Settings } from '../Settings';

function PreviewBody({ slug }: { slug: string[] }) {
  const head = slug[0] ?? 'calendar';
  if ((head === 'objects' || head === 'apartments') && slug[1]) return <ObjectDetail id={slug[1]!} />;
  if (head === 'objects' || head === 'apartments') return <Objects />;
  if (head === 'today') return <Today />;
  if (head === 'plan') return <Plan />;
  if (head === 'settings') return <Settings />;
  return <CalendarView />;
}

export function OpsPreview({ id, slug = [] }: { id: string; slug?: string[] }) {
  const { token } = useOpsAuth();
  const [preview, setPreview] = useState<{ token: string; name: string } | null>(null);
  const [err, setErr] = useState('');
  const prefix = `/ops/preview/${id}`;

  useEffect(() => {
    if (!token) return;
    const cacheKey = `ops_preview_${id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { token: string; name: string };
        if (parsed.token) {
          setPreview(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    previewOpsOrg(token, id)
      .then((r) => {
        const next = { token: r.token, name: r.org.name };
        setPreview(next);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      })
      .catch((e) => setErr(e instanceof Error ? e.message : 'не открылось'));
  }, [token, id]);

  if (err) return <div className="err-box">{err}</div>;
  if (!preview) return <div className="skel" style={{ height: 200 }} />;

  return (
    <div>
      <div className="ops-preview-bar">
        <span>
          Просмотр · <b>{preview.name}</b> · только чтение · вкладки остаются в админке
        </span>
        <Link href={`/ops/clients/${id}`} className="btn btn-xs">
          Назад в админку
        </Link>
      </div>
      <AuthProvider tokenOverride={preview.token}>
        <UiProvider readOnly navPrefix={prefix}>
          <Shell>
            <PreviewBody slug={slug} />
          </Shell>
        </UiProvider>
      </AuthProvider>
    </div>
  );
}
