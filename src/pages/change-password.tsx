import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { tr, rtl } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const valid = password.length >= 8 && password === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(password);
      await refresh();
      navigate("/dash");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</span>
          <ThemeToggle />
          <LanguagePicker />
        </div>

        <div className="border border-border p-6 space-y-4">
          <h1 className="text-sm font-medium text-foreground">{tr("auth2.changepw.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {tr("auth2.changepw.sub")}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">{tr("auth2.changepw.new")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr("auth2.changepw.new.placeholder")}
                autoComplete="new-password"
                className="input-base"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">{tr("auth2.changepw.confirm")}</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={tr("auth2.changepw.confirm.placeholder")}
                autoComplete="new-password"
                className="input-base"
              />
              {confirm && password !== confirm && (
                <span className="block text-xs text-destructive">{tr("auth2.changepw.mismatch")}</span>
              )}
            </label>

            {error && (
              <p className="border border-destructive px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={!valid || busy}
              className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {busy ? tr("auth2.changepw.updating") : tr("auth2.changepw.submit")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
