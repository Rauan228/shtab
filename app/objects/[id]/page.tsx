'use client';

import { useParams } from 'next/navigation';
import { Guard } from '../../../components/Guard';
import { ObjectDetail } from '../../../components/ObjectDetail';

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  return (
    <Guard>
      <ObjectDetail id={id} />
    </Guard>
  );
}
