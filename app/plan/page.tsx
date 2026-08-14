'use client';

import { Guard } from '../../components/Guard';
import { Plan } from '../../components/Plan';

export default function Page() {
  return (
    <Guard>
      <Plan />
    </Guard>
  );
}
