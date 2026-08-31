import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseConfigured } from "@/utils/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { tr, rtl } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signin failed");
      if (data.session?.access_token) {
        localStorage.setItem("linktroo-session", JSON.stringify(data.session));
      }
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
          {tr("auth.signin.title")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{tr("auth.signin.sub")}</p>

        {!supabaseConfigured && (
          <p className="mt-6 border border-destructive px-3 py-2 text-xs text-destructive">
            Supabase is not configured. Set VITE_SUPABASE_URL and
            VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild.
          </p>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
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
              autoComplete="current-password"
              className="input-base"
            />
          </label>

          {error && (
            <p className="border border-destructive px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={!email || !password || busy || !supabaseConfigured}
            className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? tr("auth.signingin") : tr("auth.signin.submit")}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tr("auth.noAccount")}{" "}
          <Link to="/register" className="text-foreground underline-offset-2 hover:underline">
            {tr("auth.create.submit")}
          </Link>
        </p>
      </div>
    </main>
  );
}
