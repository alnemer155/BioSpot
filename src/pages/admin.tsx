import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AccountRequest, AccountRequestStatus } from "@/lib/types";
import { ThemeToggle, LanguagePicker } from "@/components/controls";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-600 dark:text-yellow-400",
  ai_review: "text-blue-600 dark:text-blue-400",
  approved: "text-green-600 dark:text-green-400",
  manual_review: "text-orange-600 dark:text-orange-400",
  rejected: "text-red-600 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  ai_review: "AI Review",
  approved: "Approved",
  manual_review: "Manual Review",
  rejected: "Rejected",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

const SECURITY_QUESTIONS = [
  { key: "age", questionAr: "عمر المطور؟", questionEn: "Developer's age?", answer: "18" },
  { key: "name", questionAr: "اسم المطور؟", questionEn: "Developer's name?", answer: "عبدالله" },
  { key: "email", questionAr: "ايميل المطور؟", questionEn: "Developer's email?", answer: "a.jaafar1430@gmail.com" },
  { key: "color", questionAr: "لون المفضلة؟", questionEn: "Favorite color?", answer: "الازرق" },
];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tr, rtl } = useI18n();
  const [requests, setRequests] = useState<AccountRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Security questions state
  const [securityPassed, setSecurityPassed] = useState(false);
  const [securityAnswers, setSecurityAnswers] = useState<Record<string, string>>({});
  const [securityError, setSecurityError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListRequests({ status: filter || undefined, page, limit: 20 });
      setRequests(res.requests);
      setTotal(res.total);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [filter, page, navigate]);

  useEffect(() => {
    if (!authLoading && (!user || !user.admin_role)) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.admin_role && securityPassed) load();
  }, [user, load, securityPassed]);

  const handleSecuritySubmit = () => {
    const allCorrect = SECURITY_QUESTIONS.every(
      (q) => securityAnswers[q.key]?.trim() === q.answer
    );
    if (allCorrect) {
      setSecurityPassed(true);
      setSecurityError(null);
    } else {
      setSecurityError("Incorrect answers. Access denied.");
    }
  };

  if (authLoading || !user?.admin_role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </main>
    );
  }

  // Security questions gate
  if (!securityPassed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5" dir={rtl ? "rtl" : "ltr"}>
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-6 flex items-center justify-center gap-2">
            <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</Link>
            <ThemeToggle />
            <LanguagePicker />
          </div>

          <div className="border border-border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              <h1 className="text-sm font-medium text-foreground">Developer Verification</h1>
            </div>
            <p className="text-xs text-muted-foreground">Answer all security questions to access the admin panel.</p>

            <div className="space-y-3">
              {SECURITY_QUESTIONS.map((q) => (
                <label key={q.key} className="block space-y-1.5">
                  <span className="text-xs text-foreground">{q.questionAr}</span>
                  <input
                    type="text"
                    value={securityAnswers[q.key] || ""}
                    onChange={(e) => setSecurityAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder={q.questionEn}
                    className="input-base"
                  />
                </label>
              ))}
            </div>

            {securityError && (
              <p className="border border-destructive px-3 py-2 text-xs text-destructive">{securityError}</p>
            )}

            <button
              onClick={handleSecuritySubmit}
              className="w-full border border-foreground bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Verify
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-semibold text-foreground">LinkTroo</Link>
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dash" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
          <ThemeToggle />
          <LanguagePicker />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-6">
        <h1 className="text-lg font-semibold text-foreground">Auth-2.0 Requests</h1>
        <p className="text-xs text-muted-foreground mt-1">{total} total requests</p>

        <div className="mt-4 flex gap-2 flex-wrap">
          {["", "pending", "ai_review", "manual_review", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs border transition-colors ${
                filter === s ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/50"
              }`}
            >
              {s ? STATUS_LABELS[s] : "All"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">No requests found.</div>
          ) : (
            requests.map((r) => (
              <Link
                key={r.id}
                to={`/admin/${r.id}`}
                className="block border border-border p-4 hover:border-foreground/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">@{r.username}</span>
                      <span className={`text-xs ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                      {r.risk_level && (
                        <span className={`text-xs ${RISK_COLORS[r.risk_level]}`}>{r.risk_level}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.email} · {r.display_name}</p>
                    <p className="text-xs text-muted-foreground">Use case: {r.use_case} · {new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {r.ai_score !== null && (
                      <p className="text-xs text-muted-foreground">Score: {Math.round(r.ai_score)}</p>
                    )}
                    {r.ai_recommendation && (
                      <p className="text-xs text-muted-foreground">AI: {r.ai_recommendation}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-border disabled:opacity-30 hover:bg-accent transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-border disabled:opacity-30 hover:bg-accent transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
