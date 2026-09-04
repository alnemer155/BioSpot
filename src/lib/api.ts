const API_BASE = import.meta.env.VITE_API_URL || "";

function buildUrl(path: string) {
  if (!API_BASE) return path;
  // Avoid duplicating // and handle trailing slash
  return `${API_BASE.replace(/\/$/, "")}${path}`;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const fullUrl = buildUrl(url);
  // Dev-only: expose real request URL for debugging
  if (import.meta.env.DEV) console.debug("[api] →", options?.method || "GET", fullUrl);
  const res = await fetch(fullUrl, { credentials: "include", headers, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const serverError = (data as { error?: string; debug?: string }).error;
    const debugHint = (data as { debug?: string }).debug;
    if (import.meta.env.DEV && debugHint) console.error("[api] server debug:", debugHint);
    throw new Error(serverError || "Something went wrong.");
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

export interface SubmitRequestResult {
  requestId: string;
  tempPassword: string;
  status: string;
}

export interface RequestStatusResult {
  id: string;
  username: string;
  status: string;
  risk_level: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
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
    return fetch(`${base}${encodeURIComponent(id)}`, {
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

  // ─── Auth-2.0 ──────────────────────────────────────────────────────────
  submitRequest: (data: {
    username: string;
    email: string;
    display_name: string;
    use_case: string;
    use_case_details?: string;
    agreed_to_terms: boolean;
    agreed_to_auth2: boolean;
    agreed_to_privacy: boolean;
  }) => request<SubmitRequestResult>("/api/auth2/submit", { method: "POST", body: JSON.stringify(data) }),

  getRequestStatus: (requestId: string) =>
    request<RequestStatusResult>(`/api/auth2/status/${encodeURIComponent(requestId)}`),

  checkForceChange: () => request<{ mustChange: boolean }>("/api/auth2/force-change"),

  changePassword: (newPassword: string) =>
    request<{ ok: boolean }>("/api/auth2/change-password", {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),

  // ─── Auth-2.0 Admin ────────────────────────────────────────────────────
  adminListRequests: (params?: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ requests: import("./types").AccountRequest[]; total: number }>(`/api/auth2/admin/requests${qs ? `?${qs}` : ""}`);
  },

  adminGetRequest: (requestId: string) =>
    request<{ request: import("./types").AccountRequest; reviews: import("./types").AccountRequestReview[] }>(
      `/api/auth2/admin/request/${encodeURIComponent(requestId)}`
    ),

  adminApprove: (requestId: string, notes?: string) =>
    request<{ ok: boolean }>(`/api/auth2/admin/approve/${encodeURIComponent(requestId)}`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  adminReject: (requestId: string, notes?: string) =>
    request<{ ok: boolean }>(`/api/auth2/admin/reject/${encodeURIComponent(requestId)}`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  adminEscalate: (requestId: string, notes?: string) =>
    request<{ ok: boolean }>(`/api/auth2/admin/escalate/${encodeURIComponent(requestId)}`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    }),

  verifySecurityQuestions: (answers: Record<string, string>) =>
    request<{ ok: boolean; verified: boolean }>("/api/auth2/admin/verify-questions", {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),

  logout: () => request<{ ok: boolean }>("/api/logout", { method: "POST" }),
};

export async function uploadFile(_userId: string, file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: base64, filename: file.name, contentType: file.type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed.");
  return data.url;
}
