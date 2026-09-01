import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { AccountRequest, AccountRequestReview } from "@/lib/types";
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

export default function AdminReview() {
  const { requestId } = useParams<{ requestId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tr, rtl } = useI18n();
  const [data, setData] = useState<{ request: AccountRequest; reviews: AccountRequestReview[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !user.admin_role)) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!requestId || !user?.admin_role) return;
    setLoading(true);
    api.adminGetRequest(requestId)
      .then(setData)
      .catch(() => navigate("/admin"))
      .finally(() => setLoading(false));
  }, [requestId, user, navigate]);

  const handleAction = async (action: "approve" | "reject" | "escalate") => {
    if (!requestId) return;
    setActionBusy(action);
    try {
      if (action === "approve") await api.adminApprove(requestId, notes || undefined);
      else if (action === "reject") await api.adminReject(requestId, notes || undefined);
      else await api.adminEscalate(requestId, notes || undefined);
      const updated = await api.adminGetRequest(requestId);
      setData(updated);
      setNotes("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionBusy(null);
    }
  };

  if (authLoading || !user?.admin_role || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </main>
    );
  }

  if (!data) return null;
  const { request: r, reviews } = data;

  return (
    <main className="min-h-screen" dir={rtl ? "rtl" : "ltr"}>
      <header className="border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-sm font-semibold text-foreground">LinkTroo</Link>
          <span className="text-xs text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Back to List</Link>
          <ThemeToggle />
          <LanguagePicker />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-foreground">@{r.username}</h1>
            <span className={`text-xs font-medium ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Request ID: {r.id}</p>
        </div>

        <div className="border border-border p-4 space-y-3">
          <h2 className="text-xs font-medium text-foreground">Account Details</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="text-foreground">{r.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Display Name:</span>{" "}
              <span className="text-foreground">{r.display_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Use Case:</span>{" "}
              <span className="text-foreground">{r.use_case}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Submitted:</span>{" "}
              <span className="text-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          </div>
          {r.use_case_details && (
            <p className="text-xs text-muted-foreground mt-2">
              <span className="text-foreground">Details:</span> {r.use_case_details}
            </p>
          )}
        </div>

        <div className="border border-border p-4 space-y-3">
          <h2 className="text-xs font-medium text-foreground">Auth-2.0 Analysis</h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Score:</span>{" "}
              <span className="text-foreground font-medium">{r.ai_score !== null ? Math.round(r.ai_score) : "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Risk:</span>{" "}
              <span className="text-foreground font-medium">{r.risk_level || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Recommendation:</span>{" "}
              <span className="text-foreground font-medium">{r.ai_recommendation || "—"}</span>
            </div>
          </div>
          {r.ai_analysis && Object.keys(r.ai_analysis).length > 0 && (
            <div className="mt-2 p-3 bg-accent/50 text-xs text-muted-foreground font-mono whitespace-pre-wrap">
              {JSON.stringify(r.ai_analysis, null, 2)}
            </div>
          )}
        </div>

        {r.reviewer_notes && (
          <div className="border border-border p-4 space-y-2">
            <h2 className="text-xs font-medium text-foreground">Reviewer Notes</h2>
            <p className="text-xs text-muted-foreground">{r.reviewer_notes}</p>
          </div>
        )}

        {r.status !== "approved" && r.status !== "rejected" && (
          <div className="border border-border p-4 space-y-3">
            <h2 className="text-xs font-medium text-foreground">Actions</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)..."
              rows={2}
              className="input-base resize-none text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("approve")}
                disabled={!!actionBusy}
                className="flex-1 border border-green-600 bg-green-600 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {actionBusy === "approve" ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={!!actionBusy}
                className="flex-1 border border-red-600 bg-red-600 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {actionBusy === "reject" ? "Rejecting..." : "Reject"}
              </button>
              <button
                onClick={() => handleAction("escalate")}
                disabled={!!actionBusy}
                className="flex-1 border border-orange-500 bg-orange-500 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {actionBusy === "escalate" ? "Escalating..." : "Manual Review"}
              </button>
            </div>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="border border-border p-4 space-y-3">
            <h2 className="text-xs font-medium text-foreground">Review History</h2>
            <div className="space-y-2">
              {reviews.map((rev) => (
                <div key={rev.id} className="border border-border p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{rev.action}</span>
                    <span className="text-muted-foreground">{new Date(rev.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-muted-foreground mt-1">By: {rev.reviewer}</p>
                  {rev.notes && <p className="text-muted-foreground mt-1">Notes: {rev.notes}</p>}
                  {rev.ai_score_snapshot !== null && (
                    <p className="text-muted-foreground mt-1">AI Score at time: {Math.round(rev.ai_score_snapshot)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
