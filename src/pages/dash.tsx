import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, uploadFile, type PageSummary, type StatsResult } from "@/lib/api";
import type { BioData, BioItem, BioItemType, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { LoadingIndicator } from "@/components/loading-indicator";
import { QrCodeSection } from "@/components/qr-code-section";
import { FONTS, fontFamily } from "@/lib/fonts";
import { LanguagePicker, ThemeToggle } from "@/components/controls";
import {
  Sparkles,
  AtSign,
  Plus,
  Upload,
  GripVertical,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Eye,
  MousePointerClick,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";

const DEFAULT_DATA: BioData = {
  profile: { name: "Your Name", title: "Your Title", bio: "A short bio about you." },
  items: [],
};

function genId(): string {
  return crypto.randomUUID();
}

function fileToDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxBytes) {
      reject(new Error("Image is too large. Please use one under 500KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

const ITEM_TYPES: { type: BioItemType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "link", label: "Link" },
  { type: "text_link", label: "Text+Link" },
  { type: "image", label: "Image" },
  { type: "youtube", label: "YouTube" },
  { type: "x", label: "X post" },
  { type: "file", label: "Upload file" },
];

export default function Dash() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  const [data, setData] = useState<BioData>(DEFAULT_DATA);
  const dataRef = useRef(data);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pages, setPages] = useState<PageSummary[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const past = useRef<BioData[]>([]);
  const future = useRef<BioData[]>([]);
  const [histTick, setHistTick] = useState(0);

  const commit = useCallback((next: BioData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const apply = useCallback(
    (updater: (prev: BioData) => BioData) => {
      const prev = dataRef.current;
      const next = updater(prev);
      past.current.push(prev);
      if (past.current.length > 50) past.current.shift();
      future.current = [];
      commit(next);
      setHistTick((t) => t + 1);
    },
    [commit]
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(dataRef.current);
    commit(prev);
    setHistTick((t) => t + 1);
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(dataRef.current);
    commit(next);
    setHistTick((t) => t + 1);
  }, [commit]);

  const canUndo = past.current.length > 0 || histTick < 0;
  const canRedo = future.current.length > 0;

  const loadPage = useCallback(async (pageId?: string) => {
    setLoading(true);
    try {
      const d = await api.getBio(pageId || undefined);
      const next = { profile: d.profile, items: d.items || [] };
      dataRef.current = next;
      setData(next);
      setActivePageId((d.profile as Profile).id || pageId || null);
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pages + initial page
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    api
      .listPages()
      .then(async ({ pages: list }) => {
        setPages(list);
        await loadPage(list[0]?.id);
      })
      .catch((e) => {
        // fall back to default page only
        setPages([]);
        loadPage();
        setLoadError((e as Error).message);
      });
  }, [user, authLoading, navigate, loadPage]);

  // Autosave with debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);
  useEffect(() => {
    if (loading || !user) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveBio(data, activePageId || undefined);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (e) {
        setSaveStatus("error");
        setLoadError((e as Error).message);
      }
    }, 1000);
  }, [data, loading, user, activePageId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && ((e.shiftKey && e.key.toLowerCase() === "z") || e.key.toLowerCase() === "y")) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ---- Mutations ----
  const updateProfile = (patch: Partial<Profile>) =>
    apply((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));

  const addItem = (type: BioItemType) => {
    const maxOrder = data.items.reduce((mx, it) => Math.max(mx, it.sort_order), 0);
    const newItem: BioItem = {
      id: genId(),
      type,
      label: type === "image" || type === "file" ? null : "",
      url: ["link", "text_link", "youtube", "x"].includes(type) ? "" : type === "file" ? "" : null,
      description: null,
      image_url: type === "image" ? "" : null,
      sort_order: maxOrder + 1,
      visible: true,
    };
    apply((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (id: string, patch: Partial<BioItem>) =>
    apply((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const removeItem = (id: string) =>
    apply((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== id) }));

  const toggleVisible = (id: string) =>
    apply((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, visible: !it.visible } : it)),
    }));

  const moveItem = (id: string, direction: "up" | "down") =>
    apply((prev) => {
      const items = [...prev.items].sort((a, b) => a.sort_order - b.sort_order);
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return prev;
      const tmp = items[idx].sort_order;
      items[idx] = { ...items[idx], sort_order: items[swapIdx].sort_order };
      items[swapIdx] = { ...items[swapIdx], sort_order: tmp };
      return { ...prev, items };
    });

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    apply((prev) => {
      const items = [...prev.items].sort((a, b) => a.sort_order - b.sort_order);
      const fromIdx = items.findIndex((it) => it.id === draggedId);
      const toIdx = items.findIndex((it) => it.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { ...prev, items: items.map((it, i) => ({ ...it, sort_order: i + 1 })) };
    });
  };

  const createPage = async () => {
    try {
      const slug = `page-${Math.random().toString(36).slice(2, 8)}`;
      const { page } = await api.createPage("New Page", slug);
      setPages((p) => [...p, page]);
      firstLoad.current = true;
      await loadPage(page.id);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // ---- Render ----
  if (authLoading || (loading && !loadError)) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingIndicator />
      </main>
    );
  }

  if (!user) return null;

  const { profile, items } = data;
  const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const activePage = pages.find((p) => p.id === activePageId);
  const slug = activePage?.slug || profile.slug || "you";
  const publicUrl = `${window.location.origin}${activePage?.is_default ? `/@${slug}` : `/~/${slug}`}`;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 border-b border-border pb-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">
                  LinkTroo
                </Link>
                <select
                  value={activePageId || ""}
                  onChange={async (e) => {
                    firstLoad.current = true;
                    await loadPage(e.target.value);
                  }}
                  className="input-base w-auto text-xs"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — linktroo.cc{p.is_default ? `/@${p.slug}` : `/~/${p.slug}`}
                    </option>
                  ))}
                </select>
                <button
                  onClick={createPage}
                  className="flex items-center gap-1 border border-border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon as={Plus} size="sm" />
                  New page
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                All changes save automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThemeToggle />
              <LanguagePicker align="right" />
              <button
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
                className="border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
                className="border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                Redo
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
              >
                <Icon as={ExternalLink} size="sm" />
                View page
              </a>
              <button
                onClick={handleLogout}
                className="border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving" && "Saving…"}
                {saveStatus === "saved" && "Saved"}
                {saveStatus === "error" && "Error saving"}
              </span>
            </div>
          </div>
          {loadError && (
            <p className="mt-3 border border-destructive px-3 py-2 text-xs text-destructive">
              {loadError}
            </p>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* ---- Left: Editor ---- */}
          <section className="space-y-6">
            {/* Agent */}
            <div className="space-y-4 border border-border bg-card p-5 animate-fade-up">
              <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Icon as={Sparkles} size="sm" />
                Agent — AI Bio Generator
              </h2>
              <p className="text-xs text-muted-foreground">
                Describe yourself; the Agent writes your page and translates it to AR · DE · JA · FR · RU.
              </p>
              <AgentBox apply={apply} onError={setLoadError} profile={profile} />
            </div>

            {/* Twitter import */}
            <div className="space-y-4 border border-border bg-card p-5 animate-fade-in-delay-1">
              <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Icon as={AtSign} size="sm" />
                Twitter (X) — Import Profile
              </h2>
              <TwitterBox onError={setLoadError} updateProfile={updateProfile} />
            </div>

            {/* Customization: font + colors */}
            <div className="space-y-4 border border-border bg-card p-5 animate-fade-in-delay-1">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Customize
              </h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(FONTS).map(([key, f]) => (
                  <button
                    key={key}
                    onClick={() => updateProfile({ font: key === "inter" ? null : key })}
                    style={{ fontFamily: f.family }}
                    className={`border px-3 py-1.5 text-xs transition-colors ${
                      (profile.font || "inter") === key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Background
                  <input
                    type="color"
                    value={(profile.style as { bg?: string })?.bg || "#000000"}
                    onChange={(e) => updateProfile({ style: { ...(profile.style || {}), bg: e.target.value } })}
                    className="h-7 w-10 cursor-pointer border border-border bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Accent
                  <input
                    type="color"
                    value={(profile.style as { fg?: string })?.fg || "#ffffff"}
                    onChange={(e) => updateProfile({ style: { ...(profile.style || {}), fg: e.target.value } })}
                    className="h-7 w-10 cursor-pointer border border-border bg-transparent"
                  />
                </label>
                {(profile.style?.bg || profile.style?.fg) && (
                  <button
                    onClick={() => updateProfile({ style: null })}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Reset colors
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <StatsCard activePageId={activePageId} saveStatus={saveStatus} />

            {/* Content items */}
            <div className="space-y-4 border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Content Items
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ITEM_TYPES.map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => addItem(type)}
                      className="flex items-center gap-1 border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
                    >
                      <Icon as={type === "file" ? Upload : Plus} size="sm" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {sortedItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No items yet. Add a link, video or upload a file.
                </p>
              )}

              {sortedItems.map((item) => (
                <ItemEditor
                  key={item.id}
                  item={item}
                  onSave={updateItem}
                  onRemove={removeItem}
                  onToggleVisible={toggleVisible}
                  onMove={moveItem}
                  onImageUpload={async (file) => {
                    try {
                      updateItem(item.id, { image_url: await fileToDataUrl(file, 500_000) });
                    } catch (err) {
                      setLoadError((err as Error).message);
                    }
                  }}
                  onFileUpload={async (file) => {
                    if (!user) return;
                    try {
                      const url = await uploadFile(user.id, file);
                      updateItem(item.id, {
                        url,
                        label: file.name,
                        meta: { type: file.type, size: file.size },
                      });
                    } catch (err) {
                      setLoadError((err as Error).message);
                    }
                  }}
                  onDragStart={setDraggedId}
                  onDragOver={handleDragOver}
                  onDragEnd={() => setDraggedId(null)}
                  isDragged={draggedId === item.id}
                />
              ))}
            </div>

            {/* Coming soon features */}
            <div className="grid gap-3 sm:grid-cols-2">
              {["Portfolio (soon)", "Team pages", "Team members", "Member roles", "Developer API"].map((f) => (
                <div key={f} className="border border-border bg-card p-4 opacity-60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{f.replace(" (soon)", "")}</span>
                    <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                      soon
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Share + QR */}
            <ShareCard publicUrl={publicUrl} />
            <QrCodeSection url={publicUrl} username={slug} />
          </section>

          {/* ---- Right: Live Preview ---- */}
          <section className="animate-fade-in-delay-3">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Live Preview
            </h2>
            <div
              className="border border-border bg-background p-6"
              style={{
                fontFamily: fontFamily(profile.font),
                ...(profile.style?.bg ? { backgroundColor: profile.style.bg } : {}),
                ...(profile.style?.fg ? { color: profile.style.fg } : {}),
              }}
            >
              <div className="flex flex-col items-center text-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="mb-4 h-16 w-16 border border-border object-cover"
                  />
                ) : (
                  <div className="mb-4 flex h-16 w-16 items-center justify-center border border-border bg-card text-xl font-semibold text-muted-foreground">
                    {(profile.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {profile.name || "Your Name"}
                </h3>
                {profile.title && (
                  <p className="mt-1 text-xs text-muted-foreground">{profile.title}</p>
                )}
                {profile.bio && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{profile.bio}</p>
                )}
              </div>
              <div className="mt-6 flex flex-col gap-2">
                {sortedItems
                  .filter((i) => i.visible)
                  .map((item) => (
                    <PreviewItem key={item.id} item={item} />
                  ))}
                {sortedItems.filter((i) => i.visible).length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">No content yet.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// ---- Feature sub-components ----

function AgentBox({
  apply,
  onError,
  profile,
}: {
  apply: (u: (p: BioData) => BioData) => void;
  onError: (m: string | null) => void;
  profile: Profile;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState<"gen" | "translate" | null>(null);

  const runAgent = async () => {
    if (!prompt.trim()) return;
    setBusy("gen");
    onError(null);
    try {
      const res = await api.agent(prompt.trim());
      apply((prev) => ({
        profile: {
          ...prev.profile,
          name: res.profile.name || prev.profile.name,
          title: res.profile.title || prev.profile.title,
          bio: res.profile.bio || prev.profile.bio,
          translations: res.translations || prev.profile.translations,
        },
        items: res.items.map((it, i) => ({
          id: genId(),
          type: it.type,
          label: it.label,
          url: it.url,
          description: it.description,
          image_url: null,
          sort_order: i + 1,
          visible: true,
        })),
      }));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runTranslate = async () => {
    if (!profile.name || profile.name === "Your Name") {
      onError("Set your name first, then translate.");
      return;
    }
    setBusy("translate");
    onError(null);
    try {
      const { translations } = await api.agentTranslate({
        name: profile.name,
        title: profile.title,
        bio: profile.bio,
      });
      if (!translations) throw new Error("Translation returned no languages.");
      apply((prev) => ({ ...prev, profile: { ...prev.profile, translations } }));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. Coffee scientist in Tokyo, runs a small roastery, posts brewing guides on YouTube"
        className="input-base resize-none"
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={runAgent}
          disabled={!prompt.trim() || busy !== null}
          className="border border-foreground bg-foreground px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy === "gen" ? "Generating…" : "Generate Bio"}
        </button>
        <button
          onClick={runTranslate}
          disabled={busy !== null}
          className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy === "translate" ? "Translating…" : "Translate my profile"}
        </button>
      </div>
      {profile.translations && (
        <p className="text-xs text-muted-foreground">
          Translations: {Object.keys(profile.translations).map((l) => l.toUpperCase()).join(" · ")}
        </p>
      )}
    </div>
  );
}

function TwitterBox({
  onError,
  updateProfile,
}: {
  onError: (m: string | null) => void;
  updateProfile: (p: Partial<Profile>) => void;
}) {
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  const importProfile = async () => {
    if (!handle.trim()) return;
    setBusy(true);
    onError(null);
    try {
      const info = await api.twitter(handle.trim());
      updateProfile({ name: info.name, title: `@${info.handle} on X`, avatar_url: info.avatar_url });
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex min-w-[200px] flex-1 items-stretch border border-border bg-background focus-within:border-foreground transition-colors">
        <span className="flex items-center border-r border-border px-3 text-xs text-muted-foreground">@</span>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
          placeholder="handle"
          className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
      <button
        onClick={importProfile}
        disabled={!handle.trim() || busy}
        className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
      >
        {busy ? "Importing…" : "Import"}
      </button>
    </div>
  );
}

function StatsCard({ activePageId, saveStatus }: { activePageId: string | null; saveStatus: string }) {
  const [stats, setStats] = useState<StatsResult | null>(null);

  useEffect(() => {
    if (!activePageId) return;
    api.stats(activePageId).then(setStats).catch(() => {});
  }, [activePageId, saveStatus === "saved"]);

  if (!stats) {
    return (
      <div className="space-y-4 border border-border bg-card p-5">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Statistics</h2>
        <p className="text-xs text-muted-foreground">Loading stats…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border border-border bg-card p-5">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Statistics</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border p-4 text-center">
          <Icon as={Eye} size="sm" className="mx-auto text-muted-foreground" />
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.views}</p>
          <p className="mt-1 text-xs text-muted-foreground">Page views</p>
        </div>
        <div className="border border-border p-4 text-center">
          <Icon as={MousePointerClick} size="sm" className="mx-auto text-muted-foreground" />
          <p className="mt-1 text-2xl font-semibold text-foreground">{stats.clicks}</p>
          <p className="mt-1 text-xs text-muted-foreground">Link clicks</p>
        </div>
      </div>
      {(stats.referrers.length > 0 || stats.countries.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Top sources</p>
            {stats.referrers.map((r) => (
              <div key={r.source} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted-foreground">{r.source}</span>
                <span className="text-foreground">{r.n}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Top countries</p>
            {stats.countries.map((c) => (
              <div key={c.country} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{c.country}</span>
                <span className="text-foreground">{c.n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.perItem.length > 0 && (
        <div className="space-y-1.5">
          {stats.perItem.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.label || "Untitled"}</span>
              <span className="text-foreground">{p.clicks} clicks</span>
            </div>
          ))}
        </div>
      )}
      {stats.views === 0 && stats.clicks === 0 && (
        <p className="text-xs text-muted-foreground">No traffic yet — share your page to start collecting stats.</p>
      )}
    </div>
  );
}

function ShareCard({ publicUrl }: { publicUrl: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="space-y-4 border border-border bg-card p-5">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Share</h2>
      <p className="break-all text-xs text-muted-foreground">{publicUrl}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent"
        >
          <Icon as={copied ? Check : Copy} size="sm" />
          {copied ? "Copied!" : "Copy link"}
        </button>
        <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent("My LinkTroo page")}`} target="_blank" rel="noopener noreferrer" className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent">
          X
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer" className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent">
          WhatsApp
        </a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer" className="border border-border px-4 py-2 text-xs text-foreground transition-colors hover:bg-accent">
          Telegram
        </a>
      </div>
    </div>
  );
}

// ---- Editor sub-components ----

function ItemEditor({
  item,
  onSave,
  onRemove,
  onToggleVisible,
  onMove,
  onImageUpload,
  onFileUpload,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragged,
}: {
  item: BioItem;
  onSave: (id: string, patch: Partial<BioItem>) => void;
  onRemove: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onImageUpload: (file: File) => void;
  onFileUpload: (file: File) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragged: boolean;
}) {
  const typeLabel =
    item.type === "youtube" ? "YouTube video URL" : item.type === "x" ? "X post URL" : "https://…";
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      onDragOver={(e) => onDragOver(e, item.id)}
      onDragEnd={onDragEnd}
      className={`space-y-2 border border-border p-3 ${isDragged ? "opacity-50" : ""} ${
        !item.visible ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="cursor-grab text-muted-foreground" aria-hidden="true">
            <Icon as={GripVertical} size="sm" />
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {item.type === "text_link" ? "text + link" : item.type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleVisible(item.id)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {item.visible ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex gap-2 lg:hidden">
        <button onClick={() => onMove(item.id, "up")} className="border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">Up</button>
        <button onClick={() => onMove(item.id, "down")} className="border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">Down</button>
      </div>

      {item.type === "image" ? (
        <div className="space-y-2">
          {item.image_url && (
            <img src={item.image_url} alt={item.label || ""} className="h-20 w-full border border-border object-cover" />
          )}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent">
              Upload Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImageUpload(f);
                }}
              />
            </label>
            <DebouncedInput
              value={item.image_url || ""}
              placeholder="Or paste image URL"
              onSave={(v) => onSave(item.id, { image_url: v || null })}
            />
          </div>
          <DebouncedInput
            value={item.label || ""}
            placeholder="Alt text (optional)"
            onSave={(v) => onSave(item.id, { label: v || null })}
          />
        </div>
      ) : item.type === "file" ? (
        <div className="space-y-2">
          {item.url && (
            <p className="break-all text-xs text-muted-foreground">✓ {item.label || item.url}</p>
          )}
          <label className="inline-block cursor-pointer border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent">
            {item.url ? "Replace file" : "Choose file (PDF, doc, zip…)"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileUpload(f);
              }}
            />
          </label>
        </div>
      ) : (
        <>
          <DebouncedInput
            value={item.label || ""}
            placeholder="Label / text"
            onSave={(v) => onSave(item.id, { label: v || null })}
          />
          {["link", "text_link", "youtube", "x"].includes(item.type) && (
            <DebouncedInput
              value={item.url || ""}
              placeholder={typeLabel}
              onSave={(v) => onSave(item.id, { url: v || null })}
            />
          )}
          <DebouncedInput
            value={item.description || ""}
            placeholder="Description (optional)"
            onSave={(v) => onSave(item.id, { description: v || null })}
          />
        </>
      )}
    </div>
  );
}

function DebouncedInput({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(v), 600);
  };

  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      className="input-base"
    />
  );
}

function PreviewItem({ item }: { item: BioItem }) {
  if (item.type === "youtube" && item.url) {
    const id =
      item.url.match(/[?&]v=([\w-]{11})/)?.[1] ||
      item.url.match(/youtu\.be\/([\w-]{11})/)?.[1] ||
      item.url.match(/(?:shorts|embed|live)\/([\w-]{11})/)?.[1];
    if (id)
      return (
        <div className="w-full border border-border">
          <iframe src={`https://www.youtube.com/embed/${id}`} title={item.label || "YouTube"} allowFullScreen className="aspect-video w-full" />
        </div>
      );
  }

  if (item.type === "image" && item.image_url) {
    return <img src={item.image_url} alt={item.label || ""} className="w-full border border-border object-cover" />;
  }

  if (item.type === "file" && item.url) {
    return (
      <div className="flex items-center gap-2 border border-border bg-card px-4 py-3">
        <Icon as={FileText} size="sm" className="text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{item.label || "File"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
      <span className="flex flex-col">
        {item.label && <span className="text-xs font-medium text-foreground">{item.label}</span>}
        {item.description && (
          <span className="mt-0.5 text-xs text-muted-foreground">{item.description}</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{item.url || "—"}</span>
    </div>
  );
}
