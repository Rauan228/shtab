'use client';

import { useParams } from 'next/navigation';
import { Guard } from '../../../components/Guard';
import { Dialogs } from '../../../components/Dialogs';

export default function Page() {
  const chatId = String(useParams().chatId ?? '');
  return (
    <Guard>
      <Dialogs chatId={chatId} />
    </Guard>
  );
}
