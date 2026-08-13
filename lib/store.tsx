'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ARCHIVED,
  BK,
  DAY_COUNT,
  PROPS,
  SESSION_KEY,
  type Booking,
  type Prop,
  type Status,
} from './demo';
import { addDays, dayStr, fmtKzt } from './format';

export type Screen = 'today' | 'calendar' | 'objects' | 'object' | 'settings' | 'ds';
export type Filter = 'all' | Status;
export type DrawerMode = 'booking' | 'block' | 'edit';

export interface DrawerState {
  mode: DrawerMode;
  id?: string;
  p: string;
  s: number;
  n: number;
  st: Status;
  name: string;
  phone: string;
  g: string;
  note: string;
}

export interface ConfirmState {
  title: string;
  text: string;
  cta: string;
  kind: 'archive' | 'delete' | 'cancel';
}

export interface DetailState {
  title: string;
  address: string;
  price: string;
  guests: string;
  checkin: string;
  wifi: string;
  wifiPass: string;
  rules: string;
}

export interface CalDay {
  d: Date;
  num: number;
  wd: string;
  weekend: boolean;
  today: boolean;
}

function baseDate(offset: number): Date {
  const base = new Date(2026, 7, 10);
  base.setDate(base.getDate() + offset * 14);
  return base;
}

function makeDays(offset: number): CalDay[] {
  const start = baseDate(offset);
  const out: CalDay[] = [];
  for (let i = 0; i < DAY_COUNT; i++) {
    const d = addDays(start, i);
    out.push({
      d,
      num: d.getDate(),
      wd: ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][d.getDay()]!,
      weekend: d.getDay() === 0 || d.getDay() === 6,
      today: d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() === 13,
    });
  }
  return out;
}

interface Store {
  authed: boolean;
  login: (pass: string) => boolean;
  logout: () => void;
  objectsLabel: string;
  properties: Prop[];
  archived: Prop[];
  bookings: Booking[];
  days: CalDay[];
  offset: number;
  setOffset: (n: number | ((p: number) => number)) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  objTab: 'active' | 'archived';
  setObjTab: (t: 'active' | 'archived') => void;
  objId: string;
  setObjId: (id: string) => void;
  mProp: string;
  setMProp: (id: string) => void;
  drag: { p: string; a: number; b: number } | null;
  startDrag: (p: string, i: number) => void;
  overDrag: (p: string, i: number) => void;
  endDrag: () => void;
  cancelDrag: () => void;
  drawer: DrawerState | null;
  openDrawer: (d: DrawerState) => void;
  openBooking: (b: Booking) => void;
  quickAdd: () => void;
  setDrawer: (patch: Partial<DrawerState>) => void;
  closeDrawer: () => void;
  saveDrawer: () => void;
  confirm: ConfirmState | null;
  askConfirm: (c: ConfirmState) => void;
  closeConfirm: () => void;
  doConfirm: () => void;
  toast: string | null;
  flash: (t: string) => void;
  detail: DetailState;
  setDetail: (patch: Partial<DetailState>) => void;
  dirty: boolean;
  resetDirty: () => void;
  saveDetail: () => void;
  auto: boolean;
  toggleAuto: () => void;
  notify: boolean;
  toggleNotify: () => void;
  addObject: () => string;
  quoteTotal: (d: DrawerState) => number;
}

const Ctx = createContext<Store | null>(null);

const DEFAULT_CHECKIN = 'Код от домофона 1204В. Ключи в сейфе у двери, код 5590.';

function detailFrom(p: Prop): DetailState {
  return {
    title: p.title,
    address: p.addr,
    price: fmtKzt(p.price),
    guests: String(p.guests),
    checkin: DEFAULT_CHECKIN,
    wifi: 'Dostyk_12',
    wifiPass: 'almaty2026',
    rules: 'Без вечеринок и животных. Курение на балконе.',
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [properties, setProperties] = useState<Prop[]>(PROPS);
  const [archived] = useState<Prop[]>(ARCHIVED);
  const [bookings, setBookings] = useState<Booking[]>(BK);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [objTab, setObjTab] = useState<'active' | 'archived'>('active');
  const [objId, setObjIdState] = useState('p1');
  const [mProp, setMProp] = useState('p1');
  const [drag, setDrag] = useState<{ p: string; a: number; b: number } | null>(null);
  const [drawer, setDrawerState] = useState<DrawerState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetailState] = useState<DetailState>(detailFrom(PROPS[0]!));
  const [dirty, setDirty] = useState(false);
  const [auto, setAuto] = useState(true);
  const [notify, setNotify] = useState(true);

  const days = useMemo(() => makeDays(offset), [offset]);

  useEffect(() => {
    setAuthed(localStorage.getItem(SESSION_KEY) === '1');
    setReady(true);
  }, []);

  const flash = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const login = useCallback((pass: string) => {
    if (!pass.trim()) return false;
    localStorage.setItem(SESSION_KEY, '1');
    setAuthed(true);
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setAuthed(false);
  }, []);

  const setObjId = useCallback(
    (id: string) => {
      setObjIdState(id);
      const p = properties.find((x) => x.id === id) ?? archived.find((x) => x.id === id) ?? properties[0]!;
      setDetailState(detailFrom(p));
      setDirty(false);
    },
    [properties, archived],
  );

  const startDrag = useCallback((p: string, i: number) => setDrag({ p, a: i, b: i }), []);
  const overDrag = useCallback((p: string, i: number) => {
    setDrag((d) => (d && d.p === p ? { p, a: d.a, b: i } : d));
  }, []);
  const cancelDrag = useCallback(() => setDrag(null), []);

  const endDrag = useCallback(() => {
    setDrag((d) => {
      if (!d) return null;
      const a = Math.min(d.a, d.b);
      const b = Math.max(d.a, d.b);
      const ds = makeDays(offset);
      setDrawerState({
        mode: 'booking',
        p: d.p,
        s: a,
        n: b - a + 1,
        st: 'confirmed',
        name: '',
        phone: '',
        g: '2',
        note: '',
      });
      void ds;
      return null;
    });
  }, [offset]);

  const openDrawer = useCallback((d: DrawerState) => setDrawerState(d), []);

  const openBooking = useCallback((b: Booking) => {
    setDrawerState({
      mode: 'edit',
      id: b.id,
      p: b.p,
      s: b.s,
      n: b.n,
      st: b.st,
      name: b.name || '',
      phone: b.phone || '',
      g: String(b.g || 2),
      note: b.note || '',
    });
  }, []);

  const quickAdd = useCallback(() => {
    setDrawerState({
      mode: 'booking',
      p: 'p1',
      s: 3,
      n: 3,
      st: 'confirmed',
      name: '',
      phone: '',
      g: '2',
      note: '',
    });
  }, []);

  const setDrawer = useCallback((patch: Partial<DrawerState>) => {
    setDrawerState((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerState(null);
    setDrag(null);
  }, []);

  const quoteTotal = useCallback(
    (d: DrawerState) => {
      const p = properties.find((x) => x.id === d.p) ?? properties[0]!;
      const extra = Math.max(0, (+d.g || 2) - 2) * 3000 * d.n;
      return p.price * d.n + extra + 5000;
    },
    [properties],
  );

  const saveDrawer = useCallback(() => {
    const d = drawer;
    if (!d) return;
    const price = quoteTotal(d);
    setBookings((list) => {
      if (d.mode === 'edit') {
        return list.map((b) =>
          b.id === d.id
            ? { ...b, st: d.st, name: d.name, phone: d.phone, g: +d.g || 2, note: d.note }
            : b,
        );
      }
      return [
        ...list,
        {
          id: `n${Date.now()}`,
          p: d.p,
          s: d.s,
          n: d.n,
          st: d.mode === 'block' ? 'block' : d.st,
          name: d.name || 'Без имени',
          phone: d.phone,
          g: +d.g || 2,
          price,
          note: d.note,
        },
      ];
    });
    setDrawerState(null);
    flash(d.mode === 'block' ? 'Даты заблокированы' : d.mode === 'edit' ? 'Изменения сохранены' : 'Бронь создана');
  }, [drawer, flash, quoteTotal]);

  const askConfirm = useCallback((c: ConfirmState) => setConfirm(c), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const doConfirm = useCallback(() => {
    const k = confirm?.kind;
    if (k === 'cancel' && drawer) {
      setBookings((list) => list.filter((b) => b.id !== drawer.id));
      setDrawerState(null);
    }
    if (k === 'delete') {
      setProperties((list) => list.filter((p) => p.id !== objId));
    }
    setConfirm(null);
    flash(k === 'delete' ? 'Объект удалён' : k === 'archive' ? 'Скрыт из продажи' : 'Бронь отменена');
  }, [confirm, drawer, flash, objId]);

  const setDetail = useCallback((patch: Partial<DetailState>) => {
    setDetailState((d) => ({ ...d, ...patch }));
    setDirty(true);
  }, []);

  const resetDirty = useCallback(() => setDirty(false), []);
  const saveDetail = useCallback(() => {
    setProperties((list) =>
      list.map((p) =>
        p.id === objId
          ? {
              ...p,
              title: detail.title,
              addr: detail.address,
              price: Number(String(detail.price).replace(/\s/g, '')) || p.price,
              guests: Number(detail.guests) || p.guests,
            }
          : p,
      ),
    );
    setDirty(false);
    flash('Объект сохранён');
  }, [detail, flash, objId]);

  const addObject = useCallback(() => {
    const id = `p${Date.now()}`;
    const next: Prop = {
      id,
      title: 'Новый объект',
      addr: '',
      price: 0,
      guests: 2,
      ready: false,
      photos: 0,
    };
    setProperties((list) => [...list, next]);
    setObjId(id);
    flash('Объект создан — заполните цену и правила');
    return id;
  }, [setObjId, flash]);

  const value: Store = {
    authed,
    login,
    logout,
    objectsLabel: 'Квартиры',
    properties,
    archived,
    bookings,
    days,
    offset,
    setOffset,
    filter,
    setFilter,
    objTab,
    setObjTab,
    objId,
    setObjId,
    mProp,
    setMProp,
    drag,
    startDrag,
    overDrag,
    endDrag,
    cancelDrag,
    drawer,
    openDrawer,
    openBooking,
    quickAdd,
    setDrawer,
    closeDrawer,
    saveDrawer,
    confirm,
    askConfirm,
    closeConfirm,
    doConfirm,
    toast,
    flash,
    detail,
    setDetail,
    dirty,
    resetDirty,
    saveDetail,
    auto,
    toggleAuto: () => {
      setAuto((v) => !v);
      setDirty(true);
    },
    notify,
    toggleNotify: () => setNotify((v) => !v),
    addObject,
    quoteTotal,
  };

  if (!ready) return <div className="boot" />;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

export function drawerDates(days: CalDay[], s: number, n: number) {
  const inD = days[Math.max(0, s)]?.d ?? days[0]!.d;
  const outI = Math.min(s + n, days.length - 1);
  const outD = days[outI]!.d;
  return { inDate: dayStr(inD), outDate: dayStr(outD) };
}
