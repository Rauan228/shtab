import { addDays, addMonths, dayOfWeek } from './api';

export const WD_MON = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'] as const;

export function mondayIndex(iso: string): number {
  const sun = dayOfWeek(iso);
  return sun === 0 ? 6 : sun - 1;
}

export type MonthCell = { iso: string; num: number; inMonth: boolean };

export function monthCells(monthStart: string): MonthCell[] {
  const lead = mondayIndex(monthStart);
  const start = addDays(monthStart, -lead);
  const next = addMonths(monthStart, 1);
  return Array.from({ length: 42 }, (_, i) => {
    const iso = addDays(start, i);
    return { iso, num: Number(iso.slice(8, 10)), inMonth: iso >= monthStart && iso < next };
  });
}

/** Last occupied night of a [begin, end) stay. */
export function lastNight(end: string): string {
  return addDays(end, -1);
}

/** Visual edge of a stay inside a Mon–Sun row. */
export function staySpan(
  iso: string,
  begin: string,
  last: string,
  col: number,
): 'start' | 'mid' | 'end' | 'single' {
  const left = iso === begin || col === 0;
  const right = iso === last || col === 6;
  if (left && right) return 'single';
  if (left) return 'start';
  if (right) return 'end';
  return 'mid';
}

/** How many cells this stay still covers in the current week row. */
export function staySegLen(iso: string, last: string, col: number): number {
  const leftInWeek = 7 - col;
  const leftInStay = Math.round(
    (Date.parse(`${last}T12:00:00Z`) - Date.parse(`${iso}T12:00:00Z`)) / 86_400_000,
  ) + 1;
  return Math.max(1, Math.min(leftInWeek, leftInStay));
}
