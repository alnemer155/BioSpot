const BASE = import.meta.env.VITE_API_URL || "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const res = await fetch(`${BASE}${url}`, { credentials: "include", headers, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || "Something went wrong.");
  }
  return data as T;
}

export interface PageSummary {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
}

export interface AgentResult {
  profile: { name: string; title: string | null; bio: string | null };
  items: { type: "link" | "text" | "text_link"; label: string | null; url: string | null; description: string | null }[];
  translations: Record<string, { name: string; title: string | null; bio: string | null }> | null;
}

export interface StatsResult {
  views: number;
  clicks: number;
  perItem: { id: string; label: string | null; clicks: number }[];
  daily: { day: string; views: number; clicks: number }[];
  referrers: { source: string; n: number }[];
  countries: { country: string; n: number }[];
}

export const api = {
  me: () => request<{ user: import("./types").User }>("/api/me"),
  setUsername: (username: string) =>
    request<{ user: import("./types").User }>("/api/set-username", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  listPages: () => request<{ pages: PageSummary[] }>("/api/pages"),
  createPage: (name: string, slug: string) =>
    request<{ page: PageSummary }>("/api/pages", {
      method: "POST",
      body: JSON.stringify({ name, slug }),
    }),
  getBio: (pageId?: string) =>
    request<import("./types").BioData>(`/api/bio${pageId ? `?page=${pageId}` : ""}`),
  saveBio: (data: import("./types").BioData, pageId?: string) =>
    request<import("./types").BioData>(`/api/bio${pageId ? `?page=${pageId}` : ""}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getPublicBio: (username: string) =>
    request<import("./types").BioData>(`/api/u/${encodeURIComponent(username)}`),
  getPublicSlug: (slug: string) =>
    request<import("./types").BioData>(`/api/p/${encodeURIComponent(slug)}`),
  track: (kind: "username" | "slug", id: string, type: "view" | "click", opts?: { itemId?: string; lang?: string }) => {
    const base = kind === "username" ? "/api/u/" : "/api/p/";
    return fetch(`${BASE}${base}${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        itemId: opts?.itemId,
        lang: opts?.lang,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      }),
    }).catch(() => {});
  },
  agent: (prompt: string) =>
    request<AgentResult>("/api/agent", { method: "POST", body: JSON.stringify({ prompt }) }),
  agentTranslate: (profile: { name: string; title?: string | null; bio?: string | null }) =>
    request<{ translations: AgentResult["translations"] }>("/api/agent", {
      method: "POST",
      body: JSON.stringify({ translate: profile }),
    }),
  twitter: (handle: string) =>
    request<{ handle: string; name: string; followers: number | null; avatar_url: string; url: string }>(
      `/api/twitter?handle=${encodeURIComponent(handle)}`
    ),
  stats: (pageId?: string) =>
    request<StatsResult>(`/api/stats${pageId ? `?page=${pageId}` : ""}`),
};

export async function uploadFile(_userId: string, file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: base64, filename: file.name, contentType: file.type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed.");
  return data.url;
}
