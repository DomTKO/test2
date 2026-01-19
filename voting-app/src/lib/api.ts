const BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/+$/, "");
const join = (p: string) => BASE + (p.startsWith("/") ? p : "/" + p);

export function api(path: string, init: RequestInit = {}) {
  return fetch(join(path), { credentials: "include", ...init });
}

export async function getJson<T>(path: string): Promise<T> {
  const r = await api(path);
  if (!r.ok)
    throw Object.assign(new Error("HTTP " + r.status), { status: r.status });
  return r.json() as Promise<T>;
}

export function postJson<TBody extends object>(path: string, body: TBody) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
