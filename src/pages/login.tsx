import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { tr, rtl } = useI18n();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setBusy(true);
    setError(null);
    try {
      const email = isEmail(identifier) ? identifier : null;

      if (!email) {
        // Username login: look up email first via a simple heuristic
        // We try signing in with the identifier as-is first (some users might use email)
        // If that fails, we tell users to use their email
        // For proper username→email lookup, we need a server endpoint
        setError("Please use your email address to sign in. Username login will be available soon.");
        setBusy(false);
        return;
      }

      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) throw new Error(signInError.message || "Sign in failed");

      await refresh();

      // Check if password change is required
      const me = await api.me();
      if (me.user.must_change_password) {
        navigate("/change-password");
        return;
      }

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
          Sign In
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Welcome back to LinkTroo.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Email</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
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
            disabled={!identifier || !password || busy}
            className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-foreground underline-offset-2 hover:underline">
            Create Account
          </Link>
        </p>
      </div>
    </main>
  );
}
