const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'expense_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type ApiInit = RequestInit & { json?: unknown };

/** Calls the backend with the stored JWT. Pass `json` for a JSON body, or `body` for FormData. */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  let body = rest.body;

  if (json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  }

  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...rest, headers, body });

  if (res.status === 401 && token) {
    tokenStore.clear();
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message ?? res.statusText;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Downloads a receipt with the auth header, then opens it in a new tab. */
export async function openAttachment(id: string) {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}/attachments/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, 'Could not open the receipt');
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
}
