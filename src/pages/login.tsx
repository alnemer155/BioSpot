import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.login({ email, password });
      setUser(user);
      navigate("/dash");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24">
      <div className="w-full max-w-sm animate-fade-up">
        <Link to="/" className="mb-10 block text-center text-sm font-semibold tracking-tight text-foreground">
          BioSpot
        </Link>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Welcome back. Enter your email or username.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Email or username</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              className="input-base"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Password</span>
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
            <p className="border border-destructive px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email || !password || busy}
            className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          No account yet?{" "}
          <Link to="/register" className="text-foreground underline-offset-2 hover:underline">
            Create your BioSpot
          </Link>
        </p>
      </div>
    </main>
  );
}
