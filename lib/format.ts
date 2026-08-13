export const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
export const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function fmtKzt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function dayStr(dt: Date): string {
  return `${dt.getDate()} ${MON[dt.getMonth()]}`;
}

export function nightsLabel(n: number): string {
  if (n === 1) return '1 ночь';
  if (n >= 2 && n <= 4) return `${n} ночи`;
  return `${n} ночей`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
