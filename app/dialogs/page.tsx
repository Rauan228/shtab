'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Guard } from '../../components/Guard';
import { Dialogs } from '../../components/Dialogs';

/** Supports the deep link /dialogs?chat=777… alongside /dialogs/777…. */
function Body() {
  const chat = useSearchParams().get('chat');
  return <Dialogs {...(chat ? { chatId: chat } : {})} />;
}

export default function Page() {
  return (
    <Guard>
      <Suspense fallback={null}>
        <Body />
      </Suspense>
    </Guard>
  );
}
