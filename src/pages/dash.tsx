import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { BioData, BioItem, BioItemType, Profile } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { LoadingIndicator } from "@/components/loading-indicator";
import { QrCodeSection } from "@/components/qr-code-section";

const DEFAULT_DATA: BioData = {
  profile: {
    name: "Your Name",
    title: "Your Title",
    bio: "A short bio about you. Replace this with your own text.",
    avatar_url: null,
  },
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

export default function Dash() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setUser } = useAuth();

  const [data, setData] = useState<BioData>(DEFAULT_DATA);
  const dataRef = useRef(data);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Simple undo/redo history over the full document.
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

  // Re-rendered via histTick whenever the refs above change.
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  // Load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    api
      .getBio()
      .then((d) => {
        setData({ profile: d.profile, items: d.items || [] });
        setLoadError(null);
      })
      .catch((e) => setLoadError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

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
        await api.saveBio(data);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } catch (e) {
        setSaveStatus("error");
        setLoadError((e as Error).message);
      }
    }, 1000);
  }, [data, loading, user]);

  // Keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y)
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
      label: type === "image" ? null : "",
      url: type === "link" || type === "text_link" ? "" : null,
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

  // Drag & drop reorder
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

  const handleLogout = async () => {
    await setUser(null);
    await api.logout().catch(() => {});
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
  const publicUrl = `${window.location.origin}/@${user.username}`;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <header className="mb-8 border-b border-border pb-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Link to="/" className="text-lg font-semibold tracking-tight text-foreground">
                  BioSpot
                </Link>
                <span className="border border-border px-2 py-0.5 text-xs text-muted-foreground">
                  Dashboard
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                bio.jaafar.app/@{user.username} — all changes save automatically.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
                href={`/@${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
              >
                View page ↗
              </a>
              <button
                onClick={handleLogout}
                className="border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign out
              </button>
              <span className="ml-2 text-xs text-muted-foreground">
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
            {/* Profile */}
            <div className="space-y-4 border border-border bg-card p-5 animate-fade-in-delay-1">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Profile
              </h2>

              <Field label="Name">
                <DebouncedInput value={profile.name} onSave={(v) => updateProfile({ name: v })} />
              </Field>

              <Field label="Title">
                <DebouncedInput
                  value={profile.title || ""}
                  onSave={(v) => updateProfile({ title: v || null })}
                />
              </Field>

              <Field label="Bio">
                <DebouncedTextarea
                  value={profile.bio || ""}
                  onSave={(v) => updateProfile({ bio: v || null })}
                />
              </Field>

              <Field label="Avatar">
                <div className="space-y-3">
                  {profile.avatar_url && (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="h-16 w-16 border border-border object-cover"
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent">
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            try {
                              updateProfile({ avatar_url: await fileToDataUrl(f, 500_000) });
                            } catch (err) {
                              setLoadError((err as Error).message);
                            }
                          }
                        }}
                      />
                    </label>
                    <DebouncedInput
                      value={profile.avatar_url || ""}
                      placeholder="Or paste image URL"
                      onSave={(v) => updateProfile({ avatar_url: v || null })}
                    />
                  </div>
                  {profile.avatar_url && (
                    <button
                      onClick={() => updateProfile({ avatar_url: null })}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Remove Avatar
                    </button>
                  )}
                </div>
              </Field>
            </div>

            {/* Content Items */}
            <div className="space-y-4 border border-border bg-card p-5 animate-fade-in-delay-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Content Items
                </h2>
                <div className="flex flex-wrap gap-2">
                  <AddButton onClick={() => addItem("text")} label="Text" />
                  <AddButton onClick={() => addItem("link")} label="Link" />
                  <AddButton onClick={() => addItem("text_link")} label="Text+Link" />
                  <AddButton onClick={() => addItem("image")} label="Image" />
                </div>
              </div>

              {sortedItems.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No items yet. Add a link or text to get started.
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
                      updateItem(item.id, {
                        image_url: await fileToDataUrl(file, 500_000),
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

            {/* QR Code */}
            <QrCodeSection url={publicUrl} username={user.username} />
          </section>

          {/* ---- Right: Live Preview ---- */}
          <section className="animate-fade-in-delay-3">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Live Preview
            </h2>
            <div className="border border-border bg-background p-6">
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
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {profile.bio}
                  </p>
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

// ---- Sub-components ----

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
    >
      {label}
    </button>
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

function DebouncedTextarea({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
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
    <textarea
      value={local}
      rows={4}
      onChange={(e) => handleChange(e.target.value)}
      className="input-base resize-none"
    />
  );
}

function ItemEditor({
  item,
  onSave,
  onRemove,
  onToggleVisible,
  onMove,
  onImageUpload,
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
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragged: boolean;
}) {
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="3" cy="3" r="1" />
              <circle cx="3" cy="9" r="1" />
              <circle cx="9" cy="3" r="1" />
              <circle cx="9" cy="9" r="1" />
            </svg>
          </span>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {item.type.replace("_", " + ")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleVisible(item.id)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            aria-label={item.visible ? "Hide" : "Show"}
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

      {/* Mobile move buttons */}
      <div className="flex gap-2 lg:hidden">
        <button
          onClick={() => onMove(item.id, "up")}
          className="border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Up
        </button>
        <button
          onClick={() => onMove(item.id, "down")}
          className="border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Down
        </button>
      </div>

      {item.type === "image" ? (
        <div className="space-y-2">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.label || ""}
              className="h-20 w-full border border-border object-cover"
            />
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
      ) : (
        <>
          <DebouncedInput
            value={item.label || ""}
            placeholder="Label / text"
            onSave={(v) => onSave(item.id, { label: v || null })}
          />
          {(item.type === "link" || item.type === "text_link") && (
            <DebouncedInput
              value={item.url || ""}
              placeholder="https://…"
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

function PreviewItem({ item }: { item: BioItem }) {
  if (item.type === "image" && item.image_url) {
    return (
      <img
        src={item.image_url}
        alt={item.label || ""}
        className="w-full border border-border object-cover"
      />
    );
  }

  if (item.type === "text") {
    return (
      <div className="border border-border bg-card px-4 py-3">
        {item.label && <p className="text-xs font-medium text-foreground">{item.label}</p>}
        {item.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
      <span className="flex flex-col">
        {item.label && (
          <span className="text-xs font-medium text-foreground">{item.label}</span>
        )}
        {item.description && (
          <span className="mt-0.5 text-xs text-muted-foreground">{item.description}</span>
        )}
      </span>
      <span className="text-xs text-muted-foreground">{item.url || "—"}</span>
    </div>
  );
}
