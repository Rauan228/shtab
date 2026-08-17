'use client';

import { Guard } from '../../components/Guard';
import { Reports } from '../../components/Reports';

export default function Page() {
  return (
    <Guard>
      <Reports />
    </Guard>
  );
}
