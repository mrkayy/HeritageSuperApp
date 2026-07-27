// Every feature imports THIS, never fetch() directly. It attaches the
// SSO token to every request and centralizes the "logged out" handling,
// so a token expiry is handled once for the whole app, not per feature.

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("hof_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("hof_token", token);
  else localStorage.removeItem("hof_token");
}

export function hasToken(): boolean {
  return !!localStorage.getItem("hof_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    setToken(null);
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("session expired");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}
