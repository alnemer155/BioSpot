// When the frontend is deployed separately (e.g. Cloudflare Pages), set
// VITE_API_URL to the API origin, e.g. https://api.example.com
const BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: BASE ? "include" : "same-origin",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Something went wrong.");
  }
  return data as T;
}

export const api = {
  me: () => request<{ user: import("./types").User }>(`${BASE}/api/auth/me`),
  register: (body: { username: string; email: string; password: string }) =>
    request<{ user: import("./types").User }>(`${BASE}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ user: import("./types").User }>(`${BASE}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => request<{ ok: boolean }>(`${BASE}/api/auth/logout`, { method: "POST" }),
  getBio: () => request<import("./types").BioData>(`${BASE}/api/bio`),
  saveBio: (data: import("./types").BioData) =>
    request<import("./types").BioData>(`${BASE}/api/bio`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getPublicBio: (username: string) =>
    request<import("./types").BioData>(`${BASE}/api/u/${encodeURIComponent(username)}`),
};
