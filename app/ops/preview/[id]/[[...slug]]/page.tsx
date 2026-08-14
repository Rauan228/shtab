'use client';

import { useParams } from 'next/navigation';
import { OpsPreview } from '../../../../../components/ops/OpsPreview';

export default function Page() {
  const params = useParams();
  const id = String(params.id ?? '');
  const raw = params.slug;
  const slug = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
  return id ? <OpsPreview id={id} slug={slug} /> : null;
}
