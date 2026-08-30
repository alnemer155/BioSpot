import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/lib/auth";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const uname = username.toLowerCase();
  const valid = USERNAME_RE.test(uname) && email && password.length >= 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: uname } },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        return;
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
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24">
      <div className="w-full max-w-sm animate-fade-up">
        <Link to="/" className="mb-10 block text-center text-sm font-semibold tracking-tight text-foreground">
          BioSpot
        </Link>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Create your BioSpot
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          One page for everything you are. Free for everyone.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Username</span>
            <div className="flex items-stretch border border-border bg-background transition-colors focus-within:border-foreground">
              <span className="flex items-center whitespace-nowrap border-r border-border px-3 text-xs text-muted-foreground">
                bio.jaafar.app/@
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="yourname"
                autoComplete="username"
                className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
            {uname && !USERNAME_RE.test(uname) && (
              <span className="block text-xs text-destructive">
                3–20 characters: letters, numbers, underscores only.
              </span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Email</span>
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
            <span className="text-xs text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="input-base"
            />
          </label>

          {error && (
            <p className="border border-destructive px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="border border-border px-3 py-2 text-xs text-muted-foreground">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || busy}
            className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
