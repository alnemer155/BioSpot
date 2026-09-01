import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AccountRequestStatus } from "@/lib/types";

export default function RegisterStatus() {
  const { requestId } = useParams<{ requestId: string }>();
  const { tr, rtl } = useI18n();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    api.getRequestStatus(requestId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [requestId]);

  const STATUS_KEY: Record<string, string> = {
    pending: "auth2.status.pending",
    ai_review: "auth2.status.ai_review",
    approved: "auth2.status.approved",
    manual_review: "auth2.status.manual_review",
    rejected: "auth2.status.rejected",
  };
  const STATUS_DESC: Record<string, string> = {
    pending: "auth2.status.pending.desc",
    ai_review: "auth2.status.ai_review.desc",
    approved: "auth2.status.approved.desc",
    manual_review: "auth2.status.manual_review.desc",
    rejected: "auth2.status.rejected.desc",
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: "text-yellow-600 dark:text-yellow-400",
    ai_review: "text-blue-600 dark:text-blue-400",
    approved: "text-green-600 dark:text-green-400",
    manual_review: "text-orange-600 dark:text-orange-400",
    rejected: "text-red-600 dark:text-red-400",
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center" dir={rtl ? "rtl" : "ltr"}>
        <p className="text-sm text-muted-foreground">{error || tr("auth2.status.not_found")}</p>
        <Link to="/" className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors">
          {tr("auth2.status.back")}
        </Link>
      </main>
    );
  }

  const st = (data.status as AccountRequestStatus) || "pending";
  const label = tr(STATUS_KEY[st] || "auth2.status.pending");
  const desc = tr(STATUS_DESC[st] || "auth2.status.pending.desc");
  const color = STATUS_COLOR[st] || "text-yellow-600 dark:text-yellow-400";

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md animate-fade-up space-y-6">
        <div className="flex items-center justify-center">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</Link>
        </div>

        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${color}`}>{label}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{tr("auth2.status.request_id")}</span>{" "}
              <code className="font-mono text-foreground">{data.id}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{tr("auth2.status.username")}</span> @{data.username}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">{tr("auth2.status.submitted")}</span>{" "}
              {new Date(data.created_at).toLocaleString()}
            </p>
          </div>

          <div className="border border-border p-3">
            <p className="text-xs text-muted-foreground">{desc}</p>
            {data.reviewer_notes && (
              <p className="text-xs text-foreground mt-2">{tr("auth2.status.note")} {data.reviewer_notes}</p>
            )}
          </div>

          {data.status === "approved" && (
            <Link
              to="/login"
              className="block w-full border border-foreground bg-foreground py-2.5 text-center text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              {tr("auth2.status.sign_in")}
            </Link>
          )}

          {data.status === "pending" || data.status === "ai_review" ? (
            <div className="border border-border p-3">
              <p className="text-xs text-muted-foreground">
                {tr("auth2.status.review_time")} <span className="text-foreground">{tr("auth2.status.review_time.2")}</span>. {tr("auth2.status.email_note")}
              </p>
            </div>
          ) : null}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          {tr("auth2.status.back")}
        </Link>
      </div>
    </main>
  );
}
