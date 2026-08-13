'use client';

import { Guard } from '../../components/Guard';
import { Objects } from '../../components/Objects';

export default function Page() {
  return (
    <Guard>
      <Objects />
    </Guard>
  );
}
