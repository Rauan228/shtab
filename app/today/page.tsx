'use client';

import { Guard } from '../../components/Guard';
import { Today } from '../../components/Today';

export default function Page() {
  return (
    <Guard>
      <Today />
    </Guard>
  );
}
