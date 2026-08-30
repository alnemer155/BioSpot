import { BioPage } from "@/components/bio-page";
import { useLocation, Link } from "react-router-dom";
import { t, type Lang } from "@/lib/i18n";

const LANG_RE = /^\/(ar|ja|fr|ru)(?:\/~)?\/@([a-z0-9_]{3,20})\/?$/i;
const PLAIN_RE = /^\/@([a-z0-9_]{3,20})\/?$/i;

export default function UserBio() {
  const { pathname } = useLocation();

  let lang: Lang = "en";
  let username = "";
  const m = pathname.match(LANG_RE);
  if (m) {
    lang = m[1].toLowerCase() as Lang;
    username = m[2];
  } else {
    const p = pathname.match(PLAIN_RE);
    if (p) username = p[1];
  }

  if (!username) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <p className="text-sm text-muted-foreground animate-fade-up">{t("notExist", "en")}</p>
        <Link
          to="/"
          className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors animate-fade-up"
        >
          {t("back", "en")}
        </Link>
      </main>
    );
  }

  return <BioPage username={username} lang={lang} />;
}
