const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
export const API_URL = `${window.location.protocol}//${host}:4000/api/v1`;
export const WS_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${host}:3001`;

export type AuthUser = { id: string; name: string; email: string; role: "STUDENT" | "ALUMNI" | "ADMIN" };

export const getToken = () => (localStorage.getItem("token") || "").replace(/^Bearer\s+/i, "");
export const getUser = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};
export const saveAuth = (token: string, user: AuthUser) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};
export const clearAuth = () => { localStorage.setItem("token", ""); localStorage.removeItem("user"); };

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API_URL + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data === "string" ? data : data?.message || `Request failed (${res.status})`);
  return data as T;
}
