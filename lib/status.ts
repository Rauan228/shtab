export type CalStatus = 'pending' | 'confirmed' | 'in_stay' | 'done' | 'block';

export const ST: Record<
  CalStatus,
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
