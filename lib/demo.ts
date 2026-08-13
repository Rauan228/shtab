export type Status = 'pending' | 'confirmed' | 'in_stay' | 'done' | 'block';

export const ST: Record<
  Status,
  { label: string; short: string; bg: string; bd: string; fg: string; dot: string }
> = {
  pending: {
    label: 'Ждёт подтверждения',
    short: 'Ждёт',
    bg: 'oklch(0.96 0.04 80)',
    bd: 'oklch(0.78 0.13 75)',
    fg: 'oklch(0.42 0.1 70)',
    dot: 'oklch(0.75 0.14 75)',
  },
  confirmed: {
    label: 'Подтверждена',
    short: 'Подтв.',
    bg: 'oklch(0.95 0.03 210)',
    bd: 'oklch(0.62 0.11 215)',
    fg: 'oklch(0.38 0.08 220)',
    dot: 'oklch(0.6 0.11 215)',
  },
  in_stay: {
    label: 'Живёт сейчас',
    short: 'Живёт',
    bg: 'oklch(0.94 0.05 155)',
    bd: 'oklch(0.62 0.12 155)',
    fg: 'oklch(0.36 0.08 155)',
    dot: 'oklch(0.62 0.13 155)',
  },
  done: {
    label: 'Выехал',
    short: 'Выехал',
    bg: 'oklch(0.96 0.004 250)',
    bd: 'oklch(0.86 0.006 250)',
    fg: 'oklch(0.55 0.012 250)',
    dot: 'oklch(0.72 0.008 250)',
  },
  block: {
    label: 'Недоступно',
    short: 'Блок',
    bg: 'repeating-linear-gradient(135deg, oklch(0.9 0.008 250) 0 5px, oklch(0.95 0.006 250) 5px 10px)',
    bd: 'oklch(0.8 0.01 250)',
    fg: 'oklch(0.42 0.012 250)',
    dot: 'oklch(0.65 0.01 250)',
  },
};

export interface Prop {
  id: string;
  title: string;
  addr: string;
  price: number;
  guests: number;
  ready: boolean;
  photos: number;
  archived?: boolean;
}

export interface Booking {
  id: string;
  p: string;
  s: number;
  n: number;
  st: Status;
  name?: string;
  phone?: string;
  g?: number;
  price?: number;
  note?: string;
}

export const PROPS: Prop[] = [
  { id: 'p1', title: 'Достык 12/4, 2-к', addr: 'пр. Достык 12, Алматы', price: 18000, guests: 4, ready: true, photos: 6 },
  { id: 'p2', title: 'Абая 45, студия', addr: 'пр. Абая 45, Алматы', price: 14000, guests: 2, ready: true, photos: 5 },
  { id: 'p3', title: 'Розыбакиева 247, 1-к', addr: 'Розыбакиева 247, Алматы', price: 16000, guests: 3, ready: true, photos: 4 },
  { id: 'p4', title: 'Есентай Апарт, 2-к', addr: 'Аль-Фараби 77, Алматы', price: 26000, guests: 4, ready: true, photos: 8 },
  { id: 'p5', title: 'Сатпаева 30, 1-к', addr: 'Сатпаева 30, Алматы', price: 15000, guests: 2, ready: false, photos: 2 },
  { id: 'p6', title: 'Мангилик Ел 52, 2-к', addr: 'Мангилик Ел 52, Астана', price: 22000, guests: 4, ready: true, photos: 7 },
  { id: 'p7', title: 'Кабанбай батыра 48, 1-к', addr: 'Кабанбай батыра 48, Астана', price: 17000, guests: 3, ready: false, photos: 0 },
  { id: 'p8', title: 'Панфилова 98, лофт', addr: 'Панфилова 98, Алматы', price: 24000, guests: 5, ready: true, photos: 6 },
];

export const ARCHIVED: Prop[] = [
  { id: 'a1', title: 'Назарбаева 8, студия', addr: 'Назарбаева 8, Алматы', price: 12000, guests: 2, ready: true, photos: 3, archived: true },
  { id: 'a2', title: 'Жибек Жолы 54, 1-к', addr: 'Жибек Жолы 54, Алматы', price: 13000, guests: 2, ready: true, photos: 2, archived: true },
];

export const BK: Booking[] = [
  { id: 'b1', p: 'p1', s: 0, n: 5, st: 'in_stay', name: 'Айгерим Т.', phone: '+7 701 233 41 09', g: 2, price: 90000 },
  { id: 'b2', p: 'p1', s: 7, n: 3, st: 'confirmed', name: 'Данияр К.', phone: '+7 705 118 22 40', g: 3, price: 54000 },
  { id: 'b3', p: 'p1', s: 14, n: 2, st: 'pending', name: 'Ольга В.', phone: '+7 777 902 15 66', g: 2, price: 36000 },
  { id: 'b4', p: 'p2', s: 1, n: 4, st: 'in_stay', name: 'Ерасыл Ж.', phone: '+7 702 445 90 12', g: 2, price: 56000 },
  { id: 'b5', p: 'p2', s: 9, n: 6, st: 'confirmed', name: 'Sara M.', phone: '+7 747 300 11 88', g: 2, price: 84000 },
  { id: 'b6', p: 'p3', s: 2, n: 3, st: 'done', name: 'Асель Н.', phone: '+7 701 555 12 34', g: 3, price: 48000 },
  { id: 'b7', p: 'p3', s: 6, n: 2, st: 'block', note: 'Ремонт душа' },
  { id: 'b8', p: 'p3', s: 12, n: 5, st: 'pending', name: 'Тимур А.', phone: '+7 700 812 44 21', g: 2, price: 80000 },
  { id: 'b9', p: 'p4', s: 0, n: 8, st: 'in_stay', name: 'Айдос С.', phone: '+7 708 191 73 05', g: 4, price: 208000 },
  { id: 'b10', p: 'p4', s: 11, n: 4, st: 'confirmed', name: 'Гульнара Б.', phone: '+7 701 664 30 77', g: 2, price: 104000 },
  { id: 'b11', p: 'p5', s: 4, n: 3, st: 'block', note: 'Свои гости' },
  { id: 'b12', p: 'p5', s: 16, n: 4, st: 'confirmed', name: 'Нурлан Ж.', phone: '+7 705 222 88 10', g: 2, price: 60000 },
  { id: 'b13', p: 'p6', s: 3, n: 5, st: 'confirmed', name: 'Марат О.', phone: '+7 747 981 20 55', g: 4, price: 110000 },
  { id: 'b14', p: 'p6', s: 13, n: 3, st: 'pending', name: 'Диана К.', phone: '+7 777 431 09 18', g: 2, price: 66000 },
  { id: 'b15', p: 'p7', s: 8, n: 2, st: 'confirmed', name: 'Алишер М.', phone: '+7 702 100 55 43', g: 2, price: 34000 },
  { id: 'b16', p: 'p8', s: 1, n: 6, st: 'in_stay', name: 'Camille R.', phone: '+33 6 12 44 90', g: 3, price: 144000 },
  { id: 'b17', p: 'p8', s: 10, n: 4, st: 'confirmed', name: 'Жанна Е.', phone: '+7 701 777 04 62', g: 2, price: 96000 },
  { id: 'b18', p: 'p2', s: 18, n: 3, st: 'pending', name: 'Ruslan I.', phone: '+7 705 613 27 99', g: 2, price: 42000 },
];

export const RULES = [
  { label: 'Заезд с', value: '14:00' },
  { label: 'Выезд до', value: '12:00' },
  { label: 'Мин. ночей', value: '1' },
  { label: 'Гостей в цене', value: '2' },
  { label: 'Доп. гость, ₸/ночь', value: '3 000' },
  { label: 'Уборка, ₸', value: '5 000' },
  { label: 'Депозит, ₸', value: '20 000' },
  { label: 'Пт–Сб, ₸/ночь', value: '21 000' },
];

export const TODAY_OPS = [
  { tag: 'заезд' as const, obj: 'Достык 12/4, 2-к', guest: 'Данияр К. · 3 гостя', time: '14:00' },
  { tag: 'заезд' as const, obj: 'Мангилик Ел 52, 2-к', guest: 'Марат О. · 4 гостя', time: '15:30' },
  { tag: 'заезд' as const, obj: 'Панфилова 98, лофт', guest: 'Жанна Е. · 2 гостя', time: '18:00' },
  { tag: 'выезд' as const, obj: 'Абая 45, студия', guest: 'Ерасыл Ж.', time: '12:00' },
  { tag: 'выезд' as const, obj: 'Есентай Апарт, 2-к', guest: 'Айдос С. · позднее', time: '11:30' },
];

export const CW = 38;
export const RH = 46;
export const NAME_W = 212;
export const DAY_COUNT = 30;
export const ACCENT = 'oklch(0.52 0.09 200)';
export const SESSION_KEY = 'brand_owner_session';
