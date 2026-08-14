'use client';

import { useParams } from 'next/navigation';
import { OpsClientDetail } from '../../../../components/ops/OpsClientDetail';
import { OpsShell } from '../../../../components/ops/OpsShell';

export default function Page() {
  const params = useParams();
  const id = String(params.id ?? '');
  return (
    <OpsShell>
      {id ? <OpsClientDetail id={id} /> : null}
    </OpsShell>
  );
}
