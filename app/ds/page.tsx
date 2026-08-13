'use client';

import { DesignSystem } from '../../components/DesignSystem';
import { Guard } from '../../components/Guard';

export default function Page() {
  return (
    <Guard>
      <DesignSystem />
    </Guard>
  );
}
