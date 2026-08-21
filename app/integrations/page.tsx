'use client';

import { Guard } from '../../components/Guard';
import { Integrations } from '../../components/Integrations';

export default function Page() {
  return (
    <Guard>
      <Integrations />
    </Guard>
  );
}
