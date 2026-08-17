// Client for the KZ AI-manager admin API.
// Set NEXT_PUBLIC_API_BASE to the server's admin API root,
// e.g. https://your-domain/api/admin

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/admin';

export const TOKEN_KEY = 'kz_ai_manager_admin_token';
export const MUST_CHANGE_KEY = 'kz_ai_must_change_pw';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export type PaymentPhase =
  | 'awaiting_deposit'
  | 'deposit_claimed'
  | 'deposit_paid'
  | 'awaiting_stay'
  | 'stay_claimed'
  | 'stay_paid';

export interface Property {
  id: string;
  title: string;
  address?: string;
  basePrice: number;
  maxGuests: number;
  archived?: boolean;
}

export interface ApartmentListItem extends Property {
  infoFilled: boolean;
  rulesFilled: boolean;
  /** True when the apartment has everything the agent needs to sell it. */
  ready: boolean;
}

export interface PropertyRules {
  propertyId: string;
  checkInTime: string;
  checkOutTime: string;
  minNights: number;
  baseGuests: number;
  extraGuestFee: number;
  cleaningFee: number;
  deposit: number;
  weekendPrice?: number;
  cancellationPolicy?: string;
  autoBookingEnabled: boolean;
}

export interface ApartmentInfo {
  id: string;
  rules?: string;
  checkinInstructions?: string;
  keyCode?: string;
  description?: string;
  wifi?: { name?: string; password?: string };
  extra?: string;
}

export interface CalendarEvent {
  id: string;
  propertyId: string;
  /** Inclusive check-in day. */
  begin: string;
  /** Exclusive checkout day. */
  end: string;
  kind: 'booking' | 'block';
  status: BookingStatus;
  guestName?: string;
  totalPrice?: number;
  paymentPhase?: PaymentPhase;
}

export interface CalendarResponse {
  from: string;
  to: string;
  properties: Property[];
  events: CalendarEvent[];
}

export interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestPhone?: string;
  status: BookingStatus;
  totalPrice: number;
  checkoutTime?: string;
  createdAt?: string;
  paymentPhase?: PaymentPhase;
  depositAmount?: number;
  stayAmount?: number;
}

export interface Quote {
  propertyId: string;
  title: string;
  available: boolean;
  nights: number;
  totalPrice: number;
  reason?: 'occupied' | 'too_many_guests' | 'min_nights' | 'blocked' | 'invalid_range';
  breakdown?: {
    nightsTotal: number;
    cleaningFee: number;
    extraGuestTotal: number;
    deposit: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: authHeaders(token) });
  } catch {
    throw new ApiError('Сервер недоступен — проверьте, что он запущен', 0);
  }
  if (res.status === 401) {
    // Stale password: drop it and tell the app to fall back to the login screen.
    // `storage` only fires in *other* tabs, so we dispatch our own event for this one.
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('kz-auth-lost'));
    }
    throw new ApiError('Сессия истекла, войдите заново', 401);
  }
  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; mustChangePassword: boolean } | null> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(email.trim() ? { email, password } : { password }),
  });
  if (!res.ok) return null;
  try {
    const body = (await res.json()) as { ok?: boolean; token?: string; mustChangePassword?: boolean };
    if (body.token) return { token: body.token, mustChangePassword: Boolean(body.mustChangePassword) };
    if (body.ok) return { token: password, mustChangePassword: false };
  } catch {
    /* ignore */
  }
  return null;
}

export async function changePassword(token: string, current: string, next: string): Promise<void> {
  await req('/change-password', token, { method: 'POST', body: JSON.stringify({ current, next }) });
}

export interface Subscription {
  period: { from: string; label: string };
  org: { id: string; name: string; status: string };
  user: { email: string };
  plan: { id: string; name: string; priceKzt: number; forWhom: string; perks: string[] };
  usage: {
    properties: { used: number; max: number };
    dialogs: { used: number; included: number; extra: number; max: number };
  };
  idleDays: number;
  features: { id: string; label: string; on: boolean }[];
  packs: { id: string; name: string; dialogs: number; priceKzt: number }[];
  overagePerDialogKzt: number;
}

export function getSubscription(token: string): Promise<Subscription> {
  return req<Subscription>('/subscription', token);
}

// --- calendar ---

export function getCalendar(token: string, from: string, to: string): Promise<CalendarResponse> {
  return req<CalendarResponse>(`/calendar?from=${from}&to=${to}`, token);
}

export function getQuote(
  token: string,
  q: { propertyId: string; checkIn: string; checkOut: string; guests: number },
): Promise<{ quote: Quote }> {
  const p = new URLSearchParams({
    propertyId: q.propertyId,
    checkIn: q.checkIn,
    checkOut: q.checkOut,
    guests: String(q.guests),
  });
  return req(`/quote?${p}`, token);
}

// --- bookings ---

export function getBooking(token: string, id: string): Promise<{ booking: Booking }> {
  return req(`/bookings/${id}`, token);
}

export function createBooking(
  token: string,
  body: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    guestName?: string;
    guestPhone?: string;
    totalPrice?: number;
  },
): Promise<{ booking: Booking }> {
  return req(`/bookings`, token, { method: 'POST', body: JSON.stringify(body) });
}

export function updateBooking(
  token: string,
  id: string,
  patch: Partial<{
    checkIn: string;
    checkOut: string;
    guests: number;
    guestName: string;
    guestPhone: string;
    totalPrice: number;
    status: BookingStatus;
    checkoutTime: string;
  }>,
): Promise<{ booking: Booking }> {
  return req(`/bookings/${id}`, token, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function cancelBooking(token: string, id: string): Promise<{ booking: Booking }> {
  return req(`/bookings/${id}`, token, { method: 'DELETE' });
}

export function confirmBookingPayment(
  token: string,
  id: string,
  kind: 'deposit' | 'stay',
): Promise<{ ok: boolean; booking: Booking; guestText: string }> {
  return req(`/bookings/${id}/confirm-payment`, token, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
}

export type PayoutMethod = 'kaspi_phone' | 'pay_link';

export interface OrgPayout {
  method: PayoutMethod;
  kaspiPhone?: string;
  payLink?: string;
}

export function getPayout(token: string): Promise<{ payout: OrgPayout | null }> {
  return req('/payout', token);
}

export function savePayout(token: string, payout: OrgPayout): Promise<{ ok: boolean; payout: OrgPayout }> {
  return req('/payout', token, { method: 'PUT', body: JSON.stringify(payout) });
}

// --- blocks ---

export function blockDates(
  token: string,
  body: { propertyId: string; from: string; to: string; note?: string },
): Promise<{ ok: boolean }> {
  return req(`/blocks`, token, { method: 'POST', body: JSON.stringify(body) });
}

export function removeBlock(token: string, id: string): Promise<{ ok: boolean }> {
  return req(`/blocks/${id}`, token, { method: 'DELETE' });
}

// --- apartments ---

export function listApartments(token: string): Promise<{ apartments: ApartmentListItem[] }> {
  return req(`/apartments`, token);
}

export function getApartment(
  token: string,
  id: string,
): Promise<{ property: Property; rules: PropertyRules; info: ApartmentInfo }> {
  return req(`/apartments/${id}`, token);
}

export function createApartment(
  token: string,
  body: { title: string; address?: string; basePrice: number; maxGuests: number },
): Promise<{ property: Property }> {
  return req(`/apartments`, token, { method: 'POST', body: JSON.stringify(body) });
}

export function saveApartment(
  token: string,
  id: string,
  body: {
    property?: Partial<Property>;
    rules?: Partial<PropertyRules>;
    info?: Partial<ApartmentInfo>;
  },
): Promise<{ ok: boolean }> {
  return req(`/apartments/${id}`, token, { method: 'PUT', body: JSON.stringify(body) });
}

export function deleteApartment(token: string, id: string): Promise<{ ok: boolean }> {
  return req(`/apartments/${id}`, token, { method: 'DELETE' });
}

// --- dialogs (the agent's WhatsApp conversations, mirrored read-only) ---

export type DialogRole = 'guest' | 'agent' | 'system' | 'owner';

export interface DialogMediaItem {
  url: string;
  caption?: string;
}

export interface DialogMessage {
  id: string;
  at: string;
  role: DialogRole;
  text?: string;
  /** Guest replied to this prior bubble. */
  quotedText?: string;
  media?: {
    kind: 'photo' | 'album';
    items: DialogMediaItem[];
    propertyId?: string;
  };
  meta?: {
    type?: 'pay_link' | 'checkin_pack' | 'key' | 'hold' | 'dialog_split' | 'file';
    url?: string;
    amount?: number;
    kind?: 'deposit' | 'stay';
    bookingId?: string;
  };
}

export interface DialogBookingBrief {
  id: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  paymentPhase?: PaymentPhase;
}

/** Which messenger a conversation came from. */
export type Channel = 'whatsapp' | 'telegram';

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WA',
  telegram: 'TG',
};

export interface DialogListItem {
  /** Channel-prefixed key, e.g. `wa:777…` — unique across messengers. */
  chatId: string;
  channel: Channel;
  guestName?: string;
  /** Telegram @username, when the guest has one. */
  guestUsername?: string;
  /** Phone on WhatsApp; @username or `id …` on Telegram, which has no phone. */
  guestPhone: string;
  lastAt: string;
  lastPreview: string;
  unread: boolean;
  booking?: DialogBookingBrief;
}

export type DialogFilter = 'all' | 'live' | 'awaiting_pay' | 'today';

export function listDialogs(
  token: string,
  opts: { q?: string; filter?: DialogFilter; channel?: Channel } = {},
): Promise<{ dialogs: DialogListItem[] }> {
  const p = new URLSearchParams();
  if (opts.q) p.set('q', opts.q);
  if (opts.filter && opts.filter !== 'all') p.set('filter', opts.filter);
  if (opts.channel) p.set('channel', opts.channel);
  const qs = p.toString();
  return req(`/dialogs${qs ? `?${qs}` : ''}`, token);
}

export function getDialog(
  token: string,
  chatId: string,
): Promise<{
  chat: {
    chatId: string;
    channel: Channel;
    guestName?: string;
    guestUsername?: string;
    guestPhone: string;
    booking?: DialogBookingBrief;
  };
  messages: DialogMessage[];
}> {
  return req(`/dialogs/${encodeURIComponent(chatId)}`, token);
}

export function markDialogSeen(token: string, chatId: string): Promise<{ ok: boolean }> {
  return req(`/dialogs/${encodeURIComponent(chatId)}/seen`, token, { method: 'POST' });
}

export function reportDialogError(
  token: string,
  chatId: string,
  body: { messageId: string; messageText: string; note: string; at?: string },
): Promise<{ ok: boolean }> {
  return req(`/dialogs/${encodeURIComponent(chatId)}/report`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Renderable URL for a message's image.
 *
 * Apartment photos are already public absolute URLs. Inbound guest media
 * (receipts, screenshots) is private, served through the authenticated admin
 * API — and since `<img>` cannot send an Authorization header, the token rides
 * as a query param on that route only.
 */
export function dialogMediaSrc(url: string, token: string): string {
  // The API normalizes every image to /api/admin/dialogs/{media,photo}/… so the
  // cabinet loads it same-origin (the API's own host is plain HTTP on the pilot
  // VPS, which an HTTPS cabinet would block as mixed content). <img> cannot send
  // an Authorization header, so the session token rides as a query param.
  if (url.startsWith('/api/admin/dialogs/')) {
    const path = url.slice('/api/admin'.length);
    return `${BASE}${path}?token=${encodeURIComponent(token)}`;
  }
  // Legacy shapes, still rendered as-is rather than shown broken.
  if (url.startsWith('/dialogs/')) return `${BASE}${url}?token=${encodeURIComponent(token)}`;
  return url;
}

// --- photos (agent sends these via WhatsApp) ---

export interface ApartmentPhoto {
  fileName: string;
  url: string;
}

export function listApartmentPhotos(
  token: string,
  id: string,
): Promise<{ photos: ApartmentPhoto[]; publicReachable: boolean }> {
  return req(`/apartments/${id}/photos`, token);
}

/** Upload one image as base64 (jpg/png/webp, max ~4 MB). */
export function uploadApartmentPhoto(
  token: string,
  id: string,
  fileName: string,
  dataBase64: string,
): Promise<{ ok: boolean; photo: ApartmentPhoto }> {
  return req(`/apartments/${id}/photos`, token, {
    method: 'POST',
    body: JSON.stringify({ fileName, dataBase64 }),
  });
}

export function deleteApartmentPhoto(
  token: string,
  id: string,
  fileName: string,
): Promise<{ ok: boolean }> {
  return req(`/apartments/${id}/photos/${encodeURIComponent(fileName)}`, token, {
    method: 'DELETE',
  });
}

// =========================================================================
// Date + formatting helpers shared by the calendar UI
// =========================================================================

/** Business timezone — the server uses the same, so "today" agrees. */
const TZ = 'Asia/Almaty';

export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Date-only arithmetic via UTC noon — immune to DST/offset drift. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 8)}01`;
}

/** Shift by whole months from the 1st, so day-31 overflow cannot skip a month. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(`${startOfMonth(iso)}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(from: string, to: string): number {
  return Math.max(
    0,
    Math.round(
      (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000,
    ),
  );
}

/** 0=Sun … 6=Sat, computed on the calendar date (not local time). */
export function dayOfWeek(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
}

export function dayNumber(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDate();
}

export function monthIndex(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCMonth();
}

export const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTH_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const MONTH_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

/** "5 марта" — for prose and date ranges. */
export function formatDateRu(iso: string): string {
  return `${dayNumber(iso)} ${MONTH_GEN[monthIndex(iso)]}`;
}

/** "17 августа 2026" — dashboard period pill. */
export function formatDateLong(iso: string): string {
  return `${formatDateRu(iso)} ${new Date(`${iso}T12:00:00Z`).getUTCFullYear()}`;
}

/** "Март 2026" — for the calendar's month band. */
export function formatMonthYear(iso: string): string {
  const y = new Date(`${iso}T12:00:00Z`).getUTCFullYear();
  return `${MONTH_NOM[monthIndex(iso)]} ${y}`;
}

export function formatKzt(n: number): string {
  return `${Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ')} ₸`;
}

/** Compact money for narrow calendar bars: 145 000 ₸ -> 145к */
export function formatKztShort(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}к`;
  return String(Math.round(n));
}

/**
 * The lifecycle stage a booking is actually in today — richer than the stored
 * status, which only knows pending/confirmed/cancelled. The calendar and badges
 * use this so the owner can see at a glance who is currently in a flat.
 */
export type LifecycleStage = 'pending' | 'confirmed' | 'instay' | 'done' | 'cancelled';

export function lifecycleStage(
  e: { begin: string; end: string; status: BookingStatus },
  today = todayIso(),
): LifecycleStage {
  if (e.status === 'cancelled') return 'cancelled';
  if (e.end <= today) return 'done';
  if (e.begin <= today && today < e.end) return 'instay';
  return e.status === 'confirmed' ? 'confirmed' : 'pending';
}

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  pending: 'Ждёт оплаты',
  confirmed: 'Подтверждена',
  instay: 'Гость в квартире',
  done: 'Завершена',
  cancelled: 'Отменена',
};

export function waitingPayHint(phase?: PaymentPhase): string {
  if (phase === 'deposit_paid' || phase === 'awaiting_stay' || phase === 'stay_claimed') {
    return 'полная оплата';
  }
  return 'депозит';
}

/** Ordered range of ISO dates, inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Normalizes a drag selection so from <= to regardless of drag direction. */
export function orderDates(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}
