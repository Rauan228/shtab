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

export async function opsLogin(ownerToken: string): Promise<string | null> {
  const res = await fetch(`${BASE}/ops/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { ok?: boolean; token?: string };
  return body.token ?? null;
}

export interface OpsOverview {
  period: string;
  clients: number;
  byPlan: Record<string, number>;
  apartments: number;
  dialogs: number;
  money: {
    mrr: number;
    greenApiKzt: number;
    llmEstKzt: number;
    cogsEstKzt: number;
    marginEstKzt: number;
  };
  notes: { wavespeed: string; greenApi: string; llmPerDialog: string };
}

export function getOpsOverview(token: string): Promise<OpsOverview> {
  return req('/overview', token);
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
