import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BioData, BioItem } from "@/lib/types";
import { BioItemRow } from "@/components/bio-item";
import { LoadingIndicator } from "@/components/loading-indicator";

export function BioPage({ username }: { username: string }) {
  const [data, setData] = useState<BioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPublicBio(username)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load"));
  }, [username]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="mx-auto max-w-md p-8 text-center animate-fade-up">
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/"
            className="mt-4 inline-block border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors"
          >
            Create your own BioSpot
          </a>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingIndicator />
      </main>
    );
  }

  const { profile, items } = data;
  const displayItems = items.filter((i) => i.visible);

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24">
      <div className="mx-auto w-full max-w-md">
        <header className="flex flex-col items-center text-center animate-fade-up">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="mb-6 h-20 w-20 border border-border object-cover"
            />
          ) : (
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border bg-card text-2xl font-semibold text-muted-foreground">
              {(profile.name || username).charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {profile.name}
          </h1>
          {profile.title && (
            <p className="mt-1 text-sm text-muted-foreground">{profile.title}</p>
          )}
          {profile.bio && (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground/60">
            bio.jaafar.app/@{username}
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          {displayItems.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">No content yet.</p>
          ) : (
            displayItems.map((item: BioItem, i: number) => (
              <BioItemRow key={item.id} item={item} index={i} />
            ))
          )}
        </div>

        <footer className="mt-16 animate-fade-in">
          <a
            href="/"
            className="block border border-border px-5 py-3 text-center text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            Create your own BioSpot — free for everyone
          </a>
        </footer>
      </div>
    </main>
  );
}
