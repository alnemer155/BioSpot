import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { BioData } from "@/lib/types";
import { BioItemRow } from "@/components/bio-item";
import { LoadingIndicator } from "@/components/loading-indicator";
import { fontFamily } from "@/lib/fonts";
import { LANGS, useI18n, isRtl, type Lang } from "@/lib/i18n";

export function BioPage({
  username,
  lang,
}: {
  username: string;
  lang: Lang;
}) {
  const { tr } = useI18n();
  const [data, setData] = useState<BioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .getPublicBio(username)
      .then((d) => {
        setData(d);
        api.track("username", username, "view", { lang });
      })
      .catch((e) => setError(e.message || "Failed to load"));
  }, [username, lang]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="mx-auto max-w-md p-8 text-center animate-fade-up">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link
            to="/"
            className="mt-4 inline-block border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors"
          >
            {tr("bio.createOwn")}
          </Link>
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
  const trData = lang !== "en" ? profile.translations?.[lang] : undefined;
  const name = trData?.name || profile.name;
  const title = trData ? trData.title : profile.title;
  const bio = trData ? trData.bio : profile.bio;
  const rtl = isRtl(lang);
  const hasTranslations = Boolean(profile.translations);
  const style = (profile.style || {}) as { bg?: string; fg?: string };

  return (
    <main
      className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24"
      dir={rtl ? "rtl" : "ltr"}
      style={{
        fontFamily: fontFamily(profile.font),
        ...(style.bg ? { backgroundColor: style.bg } : {}),
        ...(style.fg ? { color: style.fg } : {}),
      }}
    >
      <div className="mx-auto w-full max-w-md">
        {hasTranslations && (
          <div className="mb-10 flex flex-wrap justify-center gap-2 animate-fade-in">
            {LANGS.map((l) => (
              <Link
                key={l.code}
                to={l.code === "en" ? `/@${username}` : `/${l.code}/@${username}`}
                className={`border px-3 py-1.5 text-xs transition-colors ${
                  l.code === lang
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span aria-hidden="true">{l.flag}</span> {l.short}
              </Link>
            ))}
          </div>
        )}

        <header className="flex flex-col items-center text-center animate-fade-up">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="mb-6 h-20 w-20 border border-border object-cover"
            />
          ) : (
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border bg-card text-2xl font-semibold text-muted-foreground">
              {(name || username).charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
          {title && <p className="mt-1 text-sm text-muted-foreground">{title}</p>}
          {bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{bio}</p>}
          <p className="mt-3 text-xs text-muted-foreground/60">linktroo.cc/@{username}</p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          {displayItems.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">{tr("bio.noContent")}</p>
          ) : (
            displayItems.map((item, i) => (
              <BioItemRow
                key={item.id}
                item={item}
                index={i}
                onTrackClick={() => api.track("username", username, "click", { itemId: item.id, lang })}
              />
            ))
          )}
        </div>

        <footer className="mt-16 animate-fade-in">
          <Link
            to="/"
            className="block border border-border px-5 py-3 text-center text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {tr("bio.createOwn")}
          </Link>
        </footer>
      </div>
    </main>
  );
}

// Public page by slug — linktroo.cc/~/slug
export function SlugPage({ slug, lang }: { slug: string; lang: Lang }) {
  const { tr } = useI18n();
  const [data, setData] = useState<BioData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api
      .getPublicSlug(slug)
      .then((d) => {
        setData(d);
        api.track("slug", slug, "view", { lang });
      })
      .catch((e) => setError(e.message || "Failed to load"));
  }, [slug, lang]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="max-w-md p-8 text-center animate-fade-up">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link to="/" className="mt-4 inline-block border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors">
            {tr("bio.back")}
          </Link>
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
  const trData = lang !== "en" ? profile.translations?.[lang] : undefined;
  const name = trData?.name || profile.name;
  const rtl = isRtl(lang);
  const hasTranslations = Boolean(profile.translations);

  return (
    <main
      className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24"
      dir={rtl ? "rtl" : "ltr"}
      style={{ fontFamily: fontFamily(profile.font) }}
    >
      <div className="mx-auto w-full max-w-md">
        {hasTranslations && (
          <div className="mb-10 flex flex-wrap justify-center gap-2 animate-fade-in">
            {LANGS.map((l) => (
              <Link
                key={l.code}
                to={l.code === "en" ? `/~/${slug}` : `/${l.code}/~/${slug}`}
                className={`border px-3 py-1.5 text-xs transition-colors ${
                  l.code === lang
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span aria-hidden="true">{l.flag}</span> {l.short}
              </Link>
            ))}
          </div>
        )}

        <header className="flex flex-col items-center text-center animate-fade-up">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={name} className="mb-6 h-20 w-20 border border-border object-cover" />
          ) : (
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border bg-card text-2xl font-semibold text-muted-foreground">
              {(name || slug).charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
          {profile.title && <p className="mt-1 text-sm text-muted-foreground">{profile.title}</p>}
          {profile.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
          <p className="mt-3 text-xs text-muted-foreground/60">linktroo.cc/~/{slug}</p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          {items.filter((i) => i.visible).length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">{tr("bio.noContent")}</p>
          ) : (
            items
              .filter((i) => i.visible)
              .map((item, i) => (
                <BioItemRow
                  key={item.id}
                  item={item}
                  index={i}
                  onTrackClick={() => api.track("slug", slug, "click", { itemId: item.id, lang })}
                />
              ))
          )}
        </div>

        <footer className="mt-16 animate-fade-in">
          <Link
            to="/"
            className="block border border-border px-5 py-3 text-center text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {tr("bio.createOwn")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
