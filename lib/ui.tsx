'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type DrawerMode = 'booking' | 'block' | 'edit';

export interface DrawerState {
  mode: DrawerMode;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  eventId?: string;
  kind?: 'booking' | 'block';
}

export interface ConfirmState {
  title: string;
  text: string;
  cta: string;
  onYes: () => void | Promise<void>;
}

interface Ui {
  readOnly: boolean;
  toast: string | null;
  flash: (t: string) => void;
  drawer: DrawerState | null;
  openDrawer: (d: DrawerState) => void;
  closeDrawer: () => void;
  confirm: ConfirmState | null;
  ask: (c: ConfirmState) => void;
  closeConfirm: () => void;
  doConfirm: () => Promise<void>;
  reloadTick: number;
  bump: () => void;
}

const Ctx = createContext<Ui | null>(null);

export function UiProvider({ children, readOnly = false }: { children: ReactNode; readOnly?: boolean }) {
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [reloadTick, setReload] = useState(0);

  const flash = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const doConfirm = useCallback(async () => {
    const c = confirm;
    setConfirm(null);
    await c?.onYes();
  }, [confirm]);

  return (
    <Ctx.Provider
      value={{
        toast,
        flash,
        drawer,
        readOnly,
        openDrawer: setDrawer,
        closeDrawer: () => setDrawer(null),
        confirm,
        ask: setConfirm,
        closeConfirm: () => setConfirm(null),
        doConfirm,
        reloadTick,
        bump: () => setReload((n) => n + 1),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUi(): Ui {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUi outside UiProvider');
  return v;
}
