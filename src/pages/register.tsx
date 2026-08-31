import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { supabaseConfigured } from "@/utils/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

const USERNAME_RE = /^[a-z0-9_-]{2,30}$/;
const SHORT_RE = /^[a-z0-9_-]{2}$/;

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { tr, rtl } = useI18n();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uname = username.toLowerCase();
  const valid = USERNAME_RE.test(uname) && email && password.length >= 8;
  const isShort = SHORT_RE.test(uname);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || !supabaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Signup failed");
      if (data.session?.access_token) {
        localStorage.setItem("linktroo-session", JSON.stringify(data.session));
      }
      await api.setUsername(uname);
      await refresh();
      navigate("/dash");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-10 flex items-center justify-center gap-2">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
            LinkTroo
          </Link>
          <ThemeToggle />
          <LanguagePicker />
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {tr("auth.create.title")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{tr("auth.create.sub")}</p>

        {!supabaseConfigured && (
          <p className="mt-6 border border-destructive px-3 py-2 text-xs text-destructive">
            Supabase is not configured. Set VITE_SUPABASE_URL and
            VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild.
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">{tr("auth.username")}</span>
            <div className="flex items-stretch border border-border bg-background transition-colors focus-within:border-foreground">
              <span className="flex items-center whitespace-nowrap border-r border-border px-3 text-xs text-muted-foreground" dir="ltr">
                linktroo.cc/@
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="yourname"
                autoComplete="username"
                className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
            {uname && uname.length === 1 && (
              <span className="block text-xs text-destructive">
                Username must be at least 2 characters.
              </span>
            )}
            {uname && uname.length >= 2 && !USERNAME_RE.test(uname) && (
              <span className="block text-xs text-destructive">
                2–30 characters: letters, numbers, underscores, dashes.
              </span>
            )}
            {isShort && (
              <span className="block text-xs text-muted-foreground">
                Short usernames (2 chars) are limited to the first 50 users.
              </span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">{tr("auth.email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="input-base"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">{tr("auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="input-base"
            />
          </label>

          {error && (
            <p className="border border-destructive px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={!valid || busy || !supabaseConfigured}
            className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? tr("auth.creating") : tr("auth.create.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tr("auth.haveAccount")}{" "}
          <Link to="/login" className="text-foreground underline-offset-2 hover:underline">
            {tr("auth.signin.submit")}
          </Link>
        </p>
      </div>
    </main>
  );
}
