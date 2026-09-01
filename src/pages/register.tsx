import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

const USERNAME_RE = /^[a-z0-9_-]{2,30}$/;

export default function Register() {
  const navigate = useNavigate();
  const { tr, rtl } = useI18n();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [useCaseDetails, setUseCaseDetails] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAuth2, setAgreedAuth2] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ requestId: string; tempPassword: string } | null>(null);

  const uname = username.toLowerCase();
  const valid = USERNAME_RE.test(uname) && email && displayName.trim() && useCase && agreedTerms && agreedAuth2 && agreedPrivacy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitRequest({
        username: uname,
        email,
        display_name: displayName,
        use_case: useCase,
        use_case_details: useCase === "other" ? useCaseDetails : undefined,
        agreed_to_terms: agreedTerms,
        agreed_to_auth2: agreedAuth2,
        agreed_to_privacy: agreedPrivacy,
      });
      setResult({ requestId: res.requestId, tempPassword: res.tempPassword });
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (result && step === 4) {
    return (
      <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24" dir={rtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 flex items-center justify-center gap-2">
            <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</Link>
          </div>
          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <h1 className="text-sm font-medium text-foreground">{tr("auth2.result.title")}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{tr("auth2.result.sub")}</p>
            <div className="border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{tr("auth2.result.request_id")}</span>{" "}
                <code className="font-mono text-foreground">{result.requestId}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{tr("auth2.result.username")}</span> @{uname}
              </p>
              <div className="border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">{tr("auth2.result.temp_pw")}</p>
                <p className="font-mono text-sm text-foreground break-all select-all">{result.tempPassword}</p>
                <p className="text-xs text-muted-foreground mt-2">{tr("auth2.result.temp_pw.note")}</p>
              </div>
            </div>
            <div className="border border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                {tr("auth2.result.review_time")} <span className="text-foreground">{tr("auth2.result.review_time.2")}</span>.
              </p>
              <p className="text-xs text-muted-foreground">{tr("auth2.result.email_note")}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate(`/register/status/${result.requestId}`)} className="flex-1 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors">
                {tr("auth2.result.check_status")}
              </button>
              <button onClick={() => navigate("/login")} className="flex-1 border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:opacity-90 transition-opacity">
                {tr("auth2.result.go_login")}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-10 flex items-center justify-center gap-2">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</Link>
          <ThemeToggle />
          <LanguagePicker />
        </div>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">{tr("auth2.title")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{tr("auth2.sub")}</p>

        <div className="mt-6 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-0.5 flex-1 transition-colors ${step >= s ? "bg-foreground" : "bg-border"}`} />
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">{tr("auth2.username")}</span>
                <div className="flex items-stretch border border-border bg-background transition-colors focus-within:border-foreground">
                  <span className="flex items-center whitespace-nowrap border-r border-border px-3 text-xs text-muted-foreground" dir="ltr">linktroo.cc/@</span>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} placeholder={tr("auth2.username.placeholder")} autoComplete="username" className="w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none" />
                </div>
                {uname && uname.length >= 2 && !USERNAME_RE.test(uname) && (
                  <span className="block text-xs text-destructive">{tr("auth2.username.error")}</span>
                )}
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">{tr("auth2.email")}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="input-base" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">{tr("auth2.display_name")}</span>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={tr("auth2.display_name.placeholder")} className="input-base" />
              </label>
              <button type="button" disabled={!uname || !USERNAME_RE.test(uname) || !email || !displayName.trim()} onClick={() => setStep(2)} className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">
                {tr("auth2.continue")}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-muted-foreground">{tr("auth2.step2.title")}</p>
              <div className="space-y-2">
                {(["creator", "personal", "for_someone_else", "business", "other"] as const).map((uc) => (
                  <label key={uc} className={`flex items-center gap-3 border p-3 text-sm cursor-pointer transition-colors ${useCase === uc ? "border-foreground bg-accent" : "border-border hover:border-foreground/50"}`}>
                    <input type="radio" name="use_case" value={uc} checked={useCase === uc} onChange={(e) => setUseCase(e.target.value)} className="accent-foreground" />
                    <span className="text-foreground">{tr(`auth2.usecase.${uc}`)}</span>
                  </label>
                ))}
              </div>
              {useCase === "other" && (
                <label className="block space-y-1.5 animate-fade-in">
                  <span className="text-xs text-muted-foreground">{tr("auth2.step2.other")}</span>
                  <textarea value={useCaseDetails} onChange={(e) => setUseCaseDetails(e.target.value)} placeholder={tr("auth2.step2.other.placeholder")} rows={3} className="input-base resize-none" />
                </label>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-border py-2.5 text-sm text-foreground hover:bg-accent transition-colors">{tr("auth2.back")}</button>
                <button type="button" disabled={!useCase || (useCase === "other" && useCaseDetails.trim().length < 3)} onClick={() => setStep(3)} className="flex-1 border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">{tr("auth2.continue")}</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-muted-foreground">{tr("auth2.step3.title")}</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">{tr("auth2.step3.terms")} <a href="/legal#terms" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">{tr("auth2.step3.terms_link")}</a>. *</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedAuth2} onChange={(e) => setAgreedAuth2(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">{tr("auth2.step3.auth2")} <a href="/legal#auth" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">{tr("auth2.step3.auth2_link")}</a>. *</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">{tr("auth2.step3.privacy")} <a href="/legal#privacy" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">{tr("auth2.step3.privacy_link")}</a>. *</span>
              </label>
              <div className="border border-border p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">{tr("auth2.step3.review")}</p>
              </div>
              {error && <p className="border border-destructive px-3 py-2 text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 border border-border py-2.5 text-sm text-foreground hover:bg-accent transition-colors">{tr("auth2.back")}</button>
                <button type="submit" disabled={!valid || busy} className="flex-1 border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30">
                  {busy ? tr("auth2.submitting") : tr("auth2.submit")}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {tr("auth2.haveAccount")}{" "}
          <Link to="/login" className="text-foreground underline-offset-2 hover:underline">{tr("auth2.login.submit")}</Link>
        </p>
      </div>
    </main>
  );
}
