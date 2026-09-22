// FILE: marketplace/src/lib/backend.ts
// PURPOSE: Single source of truth for backend URL. Every fetch() goes through here.
// WHY: One place to change when switching between local, staging, production.

// TEMP: Use local API only (backend disabled for workflow testing)
const BACKEND_URL = '';
const WS_URL = '';

/** Full URL for a backend path. Handles missing trailing/leading slashes. */
export function backendUrl(path: string): string {
  const base = BACKEND_URL.replace(/\/+$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/** WebSocket URL (wss://) derived from backend config. */
export function wsUrl(): string {
  if (WS_URL) return WS_URL;
  if (!BACKEND_URL) return '';
  return BACKEND_URL.replace(/^http/, 'ws');
}

/** Authenticated fetch wrapper — sends cookies on every request. */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(backendUrl(path), {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' };
  }
}

/** Check if the backend is reachable. */
export async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(backendUrl('/health'), {
      method: 'GET',
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}
