import { BioPage, SlugPage } from "@/components/bio-page";
import DemoPage from "@/pages/demo-page";
import { useLocation, Link } from "react-router-dom";
import { useI18n, t, LANGS, type Lang } from "@/lib/i18n";

const LANG_CODES = LANGS.map((l) => l.code) as string[];

const USER_RE = /^\/@([a-z0-9_-]{3,30})\/?$/i;
const USER_LANG_RE = new RegExp(`^\\/(${LANG_CODES.join("|")})(?:\\/~)?\\/([a-z0-9_-]{3,30})\\/?$`, "i");
const SLUG_RE = /^(?:\/([a-z]{2}))?\/~\/([a-z0-9_-]{2,30})\/?$/i;

export default function PublicRouter() {
  const { pathname } = useLocation();
  const { lang: uiLang } = useI18n();

  // /@username or /ar/@username (also /ar/~/@username)
  const plain = pathname.match(USER_RE);
  const withLang = pathname.match(USER_LANG_RE);
  if (plain) return <BioPage username={plain[1].toLowerCase()} lang={uiLang} />;
  if (withLang) {
    const lang = withLang[1].toLowerCase() as Lang;
    const username = withLang[2].toLowerCase();
    return <BioPage username={username} lang={lang} />;
  }

  // /~/slug, /ar/~/slug — public pages by slug (demo → static demo page)
  const slugM = pathname.match(SLUG_RE);
  if (slugM) {
    const lang = (slugM[1]?.toLowerCase() as Lang) || uiLang;
    const slug = slugM[2].toLowerCase();
    if (slug === "demo") {
      return lang === "ar" ? <DemoPage lang="ar" /> : <DemoPage lang="en" />;
    }
    return <SlugPage slug={slug} lang={lang} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="text-sm text-muted-foreground animate-fade-up">{t("bio.notExist", uiLang)}</p>
      <Link
        to="/"
        className="mt-4 border border-border px-4 py-2 text-xs text-foreground hover:bg-accent transition-colors animate-fade-up"
      >
        {t("bio.back", uiLang)}
      </Link>
    </main>
  );
}
