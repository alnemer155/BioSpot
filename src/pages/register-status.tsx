import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { AccountRequestStatus } from "@/lib/types";

const STATUS_CONFIG: Record<AccountRequestStatus, { label: string; color: string; description: string }> = {
  pending: { label: "Pending", color: "text-yellow-600 dark:text-yellow-400", description: "Your request is queued for review." },
  ai_review: { label: "AI Review", color: "text-blue-600 dark:text-blue-400", description: "Auth-2.0 is analyzing your request with AI." },
  approved: { label: "Approved", color: "text-green-600 dark:text-green-400", description: "Your account has been approved. You can now sign in." },
  manual_review: { label: "Manual Review", color: "text-orange-600 dark:text-orange-400", description: "Your request requires manual review by our team." },
  rejected: { label: "Rejected", color: "text-red-600 dark:text-red-400", description: "Your request was not approved." },
};

export default function RegisterStatus() {
  const { requestId } = useParams<{ requestId: string }>();
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground">{error || "Request not found."}</p>
        <Link to="/" className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors">
          Back to LinkTroo
        </Link>
      </main>
    );
  }

  const cfg = STATUS_CONFIG[data.status as AccountRequestStatus] || STATUS_CONFIG.pending;

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24">
      <div className="w-full max-w-md animate-fade-up space-y-6">
        <div className="flex items-center justify-center">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">LinkTroo</Link>
        </div>

        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Request ID:</span>{" "}
              <code className="font-mono text-foreground">{data.id}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Username:</span> @{data.username}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-medium">Submitted:</span>{" "}
              {new Date(data.created_at).toLocaleString()}
            </p>
          </div>

          <div className="border border-border p-3">
            <p className="text-xs text-muted-foreground">{cfg.description}</p>
            {data.reviewer_notes && (
              <p className="text-xs text-foreground mt-2">Note: {data.reviewer_notes}</p>
            )}
          </div>

          {data.status === "approved" && (
            <Link
              to="/login"
              className="block w-full border border-foreground bg-foreground py-2.5 text-center text-sm font-medium text-background hover:opacity-90 transition-opacity"
            >
              Sign In Now
            </Link>
          )}

          {data.status === "pending" || data.status === "ai_review" ? (
            <div className="border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Most requests are reviewed within <span className="text-foreground">15 minutes to 3 hours</span>. Email notifications are not currently available.
              </p>
            </div>
          ) : null}
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          Back to LinkTroo
        </Link>
      </div>
    </main>
  );
}
