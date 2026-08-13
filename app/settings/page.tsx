'use client';

import { Guard } from '../../components/Guard';
import { Settings } from '../../components/Settings';

export default function Page() {
  return (
    <Guard>
      <Settings />
    </Guard>
  );
}
