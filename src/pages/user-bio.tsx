import { BioPage } from "@/components/bio-page";
import { useLocation } from "react-router-dom";

export default function UserBio() {
  const location = useLocation();
  const path = location.pathname;

  // Only paths of the form /@username render a bio page.
  if (!path.startsWith("/@") || path.length < 3) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground animate-fade-up">
          This page does not exist.
        </p>
        <a
          href="/"
          className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors animate-fade-up"
        >
          Back to BioSpot
        </a>
      </main>
    );
  }

  const username = path.slice(2).replace(/\/+$/, "").toLowerCase();
  return <BioPage username={username} />;
}
