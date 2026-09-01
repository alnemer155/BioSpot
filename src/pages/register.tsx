import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";

const USE_CASES = [
  { value: "creator", label: "Creator / Content Creator" },
  { value: "personal", label: "Personal / Individual" },
  { value: "for_someone_else", label: "For Someone Else" },
  { value: "business", label: "Business / Freelance" },
  { value: "other", label: "Other" },
];

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
              <h1 className="text-sm font-medium text-foreground">Request Submitted</h1>
            </div>

            <p className="text-xs text-muted-foreground">
              Your account request has been submitted and is now under security review by Auth-2.0.
            </p>

            <div className="border border-border p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Request ID:</span>{" "}
                <code className="font-mono text-foreground">{result.requestId}</code>
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Username:</span> @{uname}
              </p>

              <div className="border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Your Temporary Password
                </p>
                <p className="font-mono text-sm text-foreground break-all select-all">
                  {result.tempPassword}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Save this password. It will NOT be shown again. You will be required to change it on first login.
                </p>
              </div>
            </div>

            <div className="border border-border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Most account requests are reviewed within <span className="text-foreground">15 minutes to 3 hours</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                Email notifications are not currently available. Check your request status using your Request ID.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/register/status/${result.requestId}`)}
                className="flex-1 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors"
              >
                Check Status
              </button>
              <button
                onClick={() => navigate("/login")}
                className="flex-1 border border-foreground bg-foreground px-4 py-2 text-xs text-background hover:opacity-90 transition-opacity"
              >
                Go to Login
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

        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Create Your Account
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Submit a registration request. All requests go through Auth-2.0 security review.
        </p>

        {/* Progress */}
        <div className="mt-6 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-0.5 flex-1 transition-colors ${step >= s ? "bg-foreground" : "bg-border"}`} />
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">Username *</span>
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
                {uname && uname.length >= 2 && !USERNAME_RE.test(uname) && (
                  <span className="block text-xs text-destructive">
                    2-30 characters: letters, numbers, underscores, dashes.
                  </span>
                )}
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-muted-foreground">Email Address *</span>
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
                <span className="text-xs text-muted-foreground">Display Name *</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="input-base"
                />
              </label>

              <button
                type="button"
                disabled={!uname || !USERNAME_RE.test(uname) || !email || !displayName.trim()}
                onClick={() => setStep(2)}
                className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Use Case */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-muted-foreground">How will you use LinkTroo?</p>
              <div className="space-y-2">
                {USE_CASES.map((uc) => (
                  <label
                    key={uc.value}
                    className={`flex items-center gap-3 border p-3 text-sm cursor-pointer transition-colors ${
                      useCase === uc.value ? "border-foreground bg-accent" : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="use_case"
                      value={uc.value}
                      checked={useCase === uc.value}
                      onChange={(e) => setUseCase(e.target.value)}
                      className="accent-foreground"
                    />
                    <span className="text-foreground">{uc.label}</span>
                  </label>
                ))}
              </div>

              {useCase === "other" && (
                <label className="block space-y-1.5 animate-fade-in">
                  <span className="text-xs text-muted-foreground">Please explain *</span>
                  <textarea
                    value={useCaseDetails}
                    onChange={(e) => setUseCaseDetails(e.target.value)}
                    placeholder="How do you plan to use LinkTroo?"
                    rows={3}
                    className="input-base resize-none"
                  />
                </label>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-border py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                  Back
                </button>
                <button
                  type="button"
                  disabled={!useCase || (useCase === "other" && useCaseDetails.trim().length < 3)}
                  onClick={() => setStep(3)}
                  className="flex-1 border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Agreements + Submit */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-muted-foreground">Review and agree to the required policies.</p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">
                  I agree to the{" "}
                  <a href="/legal#terms" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">
                    Terms of Service
                  </a>
                  . *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedAuth2} onChange={(e) => setAgreedAuth2(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">
                  I agree to the{" "}
                  <a href="/legal#auth" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">
                    Auth-2.0 Policy
                  </a>
                  . *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} className="mt-0.5 accent-foreground" />
                <span className="text-xs text-foreground">
                  I agree to the{" "}
                  <a href="/legal#privacy" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-muted-foreground">
                    Privacy Policy
                  </a>
                  . *
                </span>
              </label>

              <div className="border border-border p-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Your request will be analyzed by Auth-2.0 Security Review with AI assistance. Most requests are reviewed within 15 minutes to 3 hours.
                </p>
              </div>

              {error && (
                <p className="border border-destructive px-3 py-2 text-xs text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(2)} className="flex-1 border border-border py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!valid || busy}
                  className="flex-1 border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {busy ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline-offset-2 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
