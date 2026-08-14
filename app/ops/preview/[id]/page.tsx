'use client';

import { useParams } from 'next/navigation';
import { OpsPreview } from '../../../../components/ops/OpsPreview';

export default function Page() {
  const params = useParams();
  const id = String(params.id ?? '');
  return id ? <OpsPreview id={id} /> : null;
}
