async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { supabase } = await import("@/utils/supabase");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const res = await fetch(url, { headers, ...options });
  const data2 = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data2 as { error?: string }).error || "Something went wrong.");
  }
  return data2 as T;
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
}

export const api = {
  me: () => request<{ user: import("./types").User }>("/api/auth/me"),
  setUsername: (username: string) =>
    request<{ user: import("./types").User }>("/api/auth/username", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
  getBio: () => request<import("./types").BioData>("/api/bio"),
  saveBio: (data: import("./types").BioData) =>
    request<import("./types").BioData>("/api/bio", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getPublicBio: (username: string) =>
    request<import("./types").BioData>(`/api/u/${encodeURIComponent(username)}`),
  trackView: (username: string, lang: string) =>
    fetch(`/api/u/${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "view", lang }),
    }).catch(() => {}),
  trackClick: (username: string, itemId: string, lang: string) =>
    fetch(`/api/u/${encodeURIComponent(username)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "click", itemId, lang }),
    }).catch(() => {}),
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
  stats: () => request<StatsResult>("/api/stats"),
};
