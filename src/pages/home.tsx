import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
            BioSpot
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dash"
                className="border border-foreground bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="border border-foreground bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
                >
                  Get your BioSpot
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5">
        <section className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="animate-fade-up text-xs uppercase tracking-wider text-muted-foreground">
              One link for everything you are
            </p>
            <h1 className="mt-4 animate-fade-in-delay-1 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              Your entire world,
              <br />
              in one BioSpot.
            </h1>
            <p className="mt-5 max-w-md animate-fade-in-delay-2 text-sm leading-relaxed text-muted-foreground">
              BioSpot gives everyone a single, beautiful page for your links, texts and
              images. Claim your handle, share one URL, and manage everything from a
              simple dashboard. Free for all.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-delay-3">
              <Link
                to={user ? "/dash" : "/register"}
                className="border border-foreground bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {user ? "Open dashboard" : "Claim your BioSpot"}
              </Link>
              <Link
                to="/login"
                className="border border-border px-6 py-3 text-sm text-foreground transition-colors hover:bg-accent"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 animate-fade-in-delay-4 text-xs text-muted-foreground/60">
              bio.jaafar.app/@you — your handle, your page.
            </p>
          </div>

          {/* Sample bio card */}
          <div className="animate-fade-in-delay-2">
            <div className="border border-border bg-background p-8">
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
                        <path
                          d="M3 7h8M7 3l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="square"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="flex items-center justify-between border border-border bg-card px-4 py-3 transition-colors hover:border-foreground">
                    <span className="text-xs font-medium text-foreground">Latest project</span>
                    <span className="text-muted-foreground">
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M3 7h8M7 3l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="square"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="border border-border bg-card px-4 py-3">
                    <p className="text-xs font-medium text-foreground">Contact me</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      hello@example.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 border-t border-border py-14 sm:grid-cols-3">
          <div className="border border-border bg-card p-5 animate-fade-up">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Your own handle
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Pick your username and get a permanent page at bio.jaafar.app/@you.
            </p>
          </div>
          <div className="border border-border bg-card p-5 animate-fade-in-delay-1">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              Links, text &amp; images
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Add anything you want to share, reorder it, and toggle visibility at any
              time.
            </p>
          </div>
          <div className="border border-border bg-card p-5 animate-fade-in-delay-2">
            <h3 className="text-sm font-medium tracking-tight text-foreground">
              A real dashboard
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Edit everything from /dash with a live preview — changes go live as you
              type.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6">
          <span className="text-xs text-muted-foreground">BioSpot — Bio for everyone.</span>
          <span className="text-xs text-muted-foreground/60">bio.jaafar.app</span>
        </div>
      </footer>
    </div>
  );
}
