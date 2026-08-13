'use client';

import { CalendarView } from '../../components/CalendarView';
import { Guard } from '../../components/Guard';

export default function Page() {
  return (
    <Guard>
      <CalendarView />
    </Guard>
  );
}
