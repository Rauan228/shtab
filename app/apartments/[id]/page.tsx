'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  useEffect(() => {
    router.replace(`/objects/${params?.id ?? ''}`);
  }, [params, router]);
  return <div className="boot" />;
}
