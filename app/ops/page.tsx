'use client';

import { OpsDashboard } from '../../components/ops/OpsDashboard';
import { OpsShell } from '../../components/ops/OpsShell';

export default function Page() {
  return (
    <OpsShell>
      <OpsDashboard />
    </OpsShell>
  );
}
