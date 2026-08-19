const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api/admin';

export const OPS_TOKEN_KEY = 'kz_ai_ops_token';

export function getOpsToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OPS_TOKEN_KEY);
}

class OpsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/ops${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem(OPS_TOKEN_KEY);
    window.dispatchEvent(new Event('kz-ops-lost'));
  }
  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new OpsError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export async function opsGate(ownerToken: string | null): Promise<boolean> {
  if (!ownerToken) return false;
  const res = await fetch(`${BASE}/ops/gate`, {
    headers: { authorization: `Bearer ${ownerToken}` },
  });
  return res.ok;
}

export async function opsLogin(
  email: string,
  password: string,
  ownerToken: string,
): Promise<'ok' | 'denied' | 'bad'> {
  const res = await fetch(`${BASE}/ops/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 404) return 'denied';
  if (!res.ok) return 'bad';
  const body = (await res.json()) as { ok?: boolean; token?: string };
  if (!body.token) return 'bad';
  if (typeof window !== 'undefined') localStorage.setItem(OPS_TOKEN_KEY, body.token);
  return 'ok';
}

/** Something on a client needs a human — ordered most urgent first. */
export type AttentionKind = 'no_channel' | 'wa_down' | 'limit_hit' | 'limit_near' | 'quiet';

export interface AttentionRow {
  orgId: string;
  name: string;
  kind: AttentionKind;
  text: string;
}

/** Per-client line for the summary table, including unit economics. */
export interface OpsClientRow {
  orgId: string;
  name: string;
  plan: string;
  planName: string;
  priceKzt: number;
  dialogs: { used: number; max: number; pct: number };
  properties: number;
  channels: { whatsapp: boolean; telegram: boolean };
  cogsKzt: number;
  marginKzt: number;
  today: number;
  week: number;
  quietDays: number | null;
}

export interface OpsOverview {
  period: string;
  clients: number;
  suspended: number;
  byPlan: Record<string, number>;
  apartments: number;
  dialogs: number;
  channels: { whatsapp: number; telegram: number; none: number };
  activity: { dialogsToday: number; dialogsWeek: number };
  money: {
    mrr: number;
    greenApiKzt: number;
    llmEstKzt: number;
    cogsEstKzt: number;
    marginEstKzt: number;
  };
  attention: AttentionRow[];
  clientRows: OpsClientRow[];
  notes: { wavespeed: string; greenApi: string; llmPerDialog: string };
}

export function getOpsOverview(token: string): Promise<OpsOverview> {
  return req('/overview', token);
}

export interface PublicWhatsapp {
  connected: boolean;
  instanceId?: string;
  apiUrl?: string;
  phone?: string;
  label?: string;
  authorized?: boolean;
  checkedAt?: string;
}

export interface PublicTelegram {
  connected: boolean;
  username?: string;
  phone?: string;
  label?: string;
  checkedAt?: string;
}

export interface OpsOrgRow {
  id: string;
  name: string;
  plan: string;
  planName: string;
  priceKzt: number;
  status: string;
  properties: { used: number; max: number };
  dialogs: { used: number; max: number };
  whatsapp?: PublicWhatsapp;
  telegram?: PublicTelegram;
}

export function listOpsOrgs(token: string): Promise<{ orgs: OpsOrgRow[] }> {
  return req('/orgs', token);
}

export function createOpsOrg(
  token: string,
  body: { name: string; email: string; password: string; plan: string; ownerName?: string },
): Promise<{ ok: boolean; org: { id: string; name: string; plan: string }; user: { email: string } }> {
  return req('/orgs', token, { method: 'POST', body: JSON.stringify(body) });
}

export interface OpsOrgDetail {
  org: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    planName: string;
    priceKzt: number;
    status: string;
    limits: { maxProperties: number; maxDialogs: number; extraDialogs: number };
    features: Record<string, unknown>;
    notes: string;
    whatsapp?: PublicWhatsapp;
    telegram?: PublicTelegram;
  };
  usage: {
    properties: { used: number; max: number };
    dialogs: { used: number; max: number };
  };
  apartments: { id: string; title: string; archived: boolean; basePrice: number }[];
}

export function getOpsOrg(token: string, id: string): Promise<OpsOrgDetail> {
  return req(`/orgs/${id}`, token);
}

export function previewOpsOrg(
  token: string,
  id: string,
): Promise<{ ok: boolean; token: string; org: { id: string; name: string } }> {
  return req(`/orgs/${id}/preview`, token, { method: 'POST' });
}

export function bindOpsWhatsapp(
  token: string,
  id: string,
  body: { apiUrl: string; idInstance: string; apiTokenInstance: string; label?: string },
): Promise<{ ok: boolean; live: boolean; whatsapp: PublicWhatsapp; probe?: { state?: string; phone?: string } }> {
  return req(`/orgs/${id}/whatsapp`, token, { method: 'POST', body: JSON.stringify(body) });
}

export function checkOpsWhatsapp(
  token: string,
  id: string,
): Promise<{ ok: boolean; whatsapp: PublicWhatsapp; error?: string }> {
  return req(`/orgs/${id}/whatsapp/check`, token, { method: 'POST' });
}

export function unbindOpsWhatsapp(token: string, id: string): Promise<{ ok: boolean; whatsapp: PublicWhatsapp }> {
  return req(`/orgs/${id}/whatsapp`, token, { method: 'DELETE' });
}

// --- Telegram: browser login wizard ---

/**
 * Step 1 — Telegram sends a login code to the client's phone. Returns a ticket
 * that ties the follow-up steps to the same half-open MTProto connection.
 */
export function startOpsTelegram(
  token: string,
  id: string,
  body: { phone: string },
): Promise<{ ok: boolean; ticket: string; phone: string }> {
  return req(`/orgs/${id}/telegram/start`, token, { method: 'POST', body: JSON.stringify(body) });
}

/**
 * Step 2/3 — submit the code, then the 2FA password if Telegram asks. Sending a
 * `password` continues the same ticket rather than starting over.
 */
export function confirmOpsTelegram(
  token: string,
  id: string,
  body: { ticket: string; code?: string; password?: string; label?: string },
): Promise<{ ok: boolean; needsPassword?: boolean; live?: boolean; telegram?: PublicTelegram }> {
  return req(`/orgs/${id}/telegram/confirm`, token, { method: 'POST', body: JSON.stringify(body) });
}

export function unbindOpsTelegram(token: string, id: string): Promise<{ ok: boolean; telegram: PublicTelegram }> {
  return req(`/orgs/${id}/telegram`, token, { method: 'DELETE' });
}

// --- feature flags (the manual gate for hand-onboarded features) ---

/**
 * Flip a client's feature flags. Right now the one that matters is
 * `integrations`, which reveals the Booking connect wizard in their cabinet.
 */
export function setOpsFeatures(
  token: string,
  id: string,
  features: Partial<Record<'integrations' | 'kaspi_pay' | 'cloud_api' | 'instagram' | 'extra_seats', boolean>>,
): Promise<{ ok: boolean; features: Record<string, boolean> }> {
  return req(`/orgs/${id}/features`, token, { method: 'PATCH', body: JSON.stringify({ features }) });
}

// --- plan / dialog packs / status ---

/** Change plan, sell a dialog pack (`addDialogs`), suspend, or edit notes. */
export function patchOpsOrg(
  token: string,
  id: string,
  body: { plan?: string; addDialogs?: number; status?: string; notes?: string },
): Promise<{
  ok: boolean;
  org: {
    id: string;
    plan: string;
    planName: string;
    priceKzt: number;
    status: string;
    limits: { maxProperties: number; maxDialogs: number; extraDialogs: number };
    notes: string;
  };
}> {
  return req(`/orgs/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) });
}
