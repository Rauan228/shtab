'use client';

import { useParams } from 'next/navigation';
import { Guard } from '../../../components/Guard';
import { Dialogs } from '../../../components/Dialogs';

export default function Page() {
  // Keys are channel-prefixed (`tg:123…`) and the colon arrives percent-encoded
  // in the route segment, so decode before using it as an id.
  const raw = String(useParams().chatId ?? '');
  let chatId = raw;
  try {
    chatId = decodeURIComponent(raw);
  } catch {
    /* malformed escape — use the segment as-is */
  }
  return (
    <Guard>
      <Dialogs chatId={chatId} />
    </Guard>
  );
}
