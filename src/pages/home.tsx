import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker, ThemeToggle } from "@/components/controls";
import { fontFamily } from "@/lib/fonts";

export default function Home() {
  const { user } = useAuth();
  const { tr, rtl } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
            LinkTroo
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguagePicker />
            {user ? (
              <Link
                to="/dash"
                className="flex items-center gap-1.5 border border-foreground bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
                </svg>
                {tr("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {tr("nav.signin")}
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 border border-foreground bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
                  </svg>
                  {tr("nav.cta")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5">
        <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div dir={rtl ? "rtl" : "ltr"}>
            <p className="animate-fade-up text-xs uppercase tracking-wider text-muted-foreground">
              {tr("hero.kicker")}
            </p>
            <h1 className="mt-4 animate-fade-in-delay-1 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {tr("hero.title1")}
              <br />
              {tr("hero.title2")}
            </h1>
            <p className="mt-5 max-w-md animate-fade-in-delay-2 text-sm leading-relaxed text-muted-foreground">
              {tr("hero.sub")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-delay-3">
              <Link
                to={user ? "/dash" : "/register"}
                className="border border-foreground bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {user ? tr("nav.dashboard") : tr("hero.cta")}
              </Link>
              <Link
                to="/login"
                className="border border-border px-6 py-3 text-sm text-foreground transition-colors hover:bg-accent"
              >
                {tr("hero.signin")}
              </Link>
            </div>
            <p className="mt-4 animate-fade-in-delay-4 text-xs text-muted-foreground/60">
              {tr("hero.note")}
            </p>
          </div>

          {/* Sample bio card */}
          <div className="animate-fade-in-delay-2" dir="ltr">
            <div className="border border-border bg-background p-8" style={{ fontFamily: fontFamily("rubik") }}>
              <div className="mx-auto max-w-xs">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center border border-border bg-card text-xl font-semibold text-muted-foreground">
                    A
                  </div>
                  <p className="text-base font-semibold tracking-tight text-foreground">
                    Your Name
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Creator &amp; Builder</p>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    All of my links, in one spot.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between border border-border bg-card px-4 py-3 transition-colors hover:border-foreground">
                    <span className="text-xs font-medium text-foreground">My website</span>
                    <span className="text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                      </svg>
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3">
                    <p className="text-xs font-medium text-foreground">Latest video</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Watch on YouTube</p>
                  </div>
                  <div className="border border-border bg-card px-4 py-3">
                    <p className="text-xs font-medium text-foreground">Media Kit (PDF)</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Download</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 border-t border-border py-14 sm:grid-cols-3" dir={rtl ? "rtl" : "ltr"}>
          <div className="border border-border bg-card p-5 animate-fade-up">
            <h3 className="text-sm font-medium tracking-tight text-foreground">{tr("feat1.title")}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tr("feat1.desc")}</p>
          </div>
          <div className="border border-border bg-card p-5 animate-fade-in-delay-1">
            <h3 className="text-sm font-medium tracking-tight text-foreground">{tr("feat2.title")}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tr("feat2.desc")}</p>
          </div>
          <div className="border border-border bg-card p-5 animate-fade-in-delay-2">
            <h3 className="text-sm font-medium tracking-tight text-foreground">{tr("feat3.title")}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{tr("feat3.desc")}</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6">
          <span className="text-xs text-muted-foreground">{tr("footer.left")}</span>
          <span className="text-xs text-muted-foreground/60">linktroo.cc</span>
        </div>
      </footer>
    </div>
  );
}
