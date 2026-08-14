'use client';

import { OpsClients } from '../../../components/ops/OpsClients';
import { OpsShell } from '../../../components/ops/OpsShell';

export default function Page() {
  return (
    <OpsShell>
      <OpsClients />
    </OpsShell>
  );
}
