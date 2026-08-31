export type Lang = "en" | "ar" | "de" | "ja" | "fr" | "ru";

export const LANGS: { code: Lang; short: string; flag: string; rtl?: boolean }[] = [
  { code: "en", short: "EN", flag: "🇬🇧" },
  { code: "ar", short: "AR", flag: "🇸🇦", rtl: true },
  { code: "de", short: "DE", flag: "🇩🇪" },
  { code: "ja", short: "JA", flag: "🇯🇵" },
  { code: "fr", short: "FR", flag: "🇫🇷" },
  { code: "ru", short: "RU", flag: "🇷🇺" },
];

type Dict = Record<string, string>;

const EN: Dict = {
  "nav.signin": "Sign in",
  "nav.cta": "Get your LinkTroo",
  "nav.dashboard": "Dashboard",
  "hero.kicker": "One link for everything you are",
  "hero.title1": "Your entire world,",
  "hero.title2": "in one LinkTroo.",
  "hero.sub":
    "LinkTroo gives everyone a single, beautiful page for your links, texts, videos and files. Claim your handle, share one URL, and manage everything from a simple dashboard. Free for all.",
  "hero.cta": "Claim your LinkTroo",
  "hero.signin": "Sign in",
  "hero.note": "linktroo.cc/@you — your handle, your page.",
  "feat1.title": "Your own handle",
  "feat1.desc": "Pick your username and get a permanent page at linktroo.cc/@you.",
  "feat2.title": "Links, videos & files",
  "feat2.desc": "Add anything you want to share — links, text, YouTube, X posts, uploads.",
  "feat3.title": "A real dashboard",
  "feat3.desc": "Edit everything from /dash with a live preview, stats and AI Agent.",
  "footer.left": "LinkTroo — one page for everyone.",
  "auth.create.title": "Create your LinkTroo",
  "auth.create.sub": "One page for everything you are. Free for everyone.",
  "auth.username": "Username",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.create.submit": "Create account",
  "auth.creating": "Creating…",
  "auth.signin.title": "Sign in",
  "auth.signin.sub": "Welcome back.",
  "auth.signin.submit": "Sign in",
  "auth.signingin": "Signing in…",
  "auth.noAccount": "No account yet?",
  "auth.haveAccount": "Already have an account?",
  "auth.confirmEmail": "Check your email to confirm your account, then sign in.",
  "bio.noContent": "No content yet.",
  "bio.createOwn": "Create your own LinkTroo — free for everyone",
  "bio.notExist": "This page does not exist.",
  "bio.back": "Back to LinkTroo",
};

const AR: Dict = {
  "nav.signin": "تسجيل الدخول",
  "nav.cta": "أنشئ صفحتك",
  "nav.dashboard": "لوحة التحكم",
  "hero.kicker": "رابط واحد لكل ما يميزك",
  "hero.title1": "عالمك بالكامل،",
  "hero.title2": "في صفحة LinkTroo واحدة.",
  "hero.sub":
    "LinkTroo يمنحك صفحة واحدة أنيقة لروابطك ونصوصك وفيديوهاتك وملفاتك. احجز معرّفك، شارك رابطاً واحداً، وأدر كل شيء من لوحة تحكم بسيطة. مجاناً للجميع.",
  "hero.cta": "احجز صفحتك الآن",
  "hero.signin": "تسجيل الدخول",
  "hero.note": "linktroo.cc/@you — معرّفك، صفحتك.",
  "feat1.title": "معرّفك الخاص",
  "feat1.desc": "اختر اسم المستخدم واحصل على صفحة دائمة على linktroo.cc/@you.",
  "feat2.title": "روابط وفيديوهات وملفات",
  "feat2.desc": "أضف أي شيء تريد مشاركته — روابط، نصوص، يوتيوب، منشورات إكس، وملفات.",
  "feat3.title": "لوحة تحكم حقيقية",
  "feat3.desc": "عدّل كل شيء من /dash مع معاينة حية وإحصائيات ووكيل ذكاء اصطناعي.",
  "footer.left": "LinkTroo — صفحة واحدة للجميع.",
  "auth.create.title": "أنشئ صفحتك على LinkTroo",
  "auth.create.sub": "صفحة واحدة لكل ما يميزك. مجاناً للجميع.",
  "auth.username": "اسم المستخدم",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.create.submit": "إنشاء حساب",
  "auth.creating": "جارٍ الإنشاء…",
  "auth.signin.title": "تسجيل الدخول",
  "auth.signin.sub": "أهلاً بعودتك.",
  "auth.signin.submit": "دخول",
  "auth.signingin": "جارٍ الدخول…",
  "auth.noAccount": "ليس لديك حساب؟",
  "auth.haveAccount": "لديك حساب بالفعل؟",
  "auth.confirmEmail": "تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول.",
  "bio.noContent": "لا يوجد محتوى بعد.",
  "bio.createOwn": "أنشئ صفحتك على LinkTroo — مجاناً للجميع",
  "bio.notExist": "هذه الصفحة غير موجودة.",
  "bio.back": "العودة إلى LinkTroo",
};

const DE: Dict = {
  "nav.signin": "Anmelden",
  "nav.cta": "Dein LinkTroo holen",
  "nav.dashboard": "Dashboard",
  "hero.kicker": "Ein Link für alles, was du bist",
  "hero.title1": "Deine ganze Welt,",
  "hero.title2": "in einem LinkTroo.",
  "hero.sub":
    "LinkTroo gibt dir eine einzige, schöne Seite für deine Links, Texte, Videos und Dateien. Sichere dir deinen Handle, teile eine URL und verwalte alles in einem einfachen Dashboard. Kostenlos für alle.",
  "hero.cta": "LinkTroo sichern",
  "hero.signin": "Anmelden",
  "hero.note": "linktroo.cc/@you — dein Handle, deine Seite.",
  "feat1.title": "Dein eigener Handle",
  "feat1.desc": "Wähle einen Nutzernamen und bekomm eine permanente Seite auf linktroo.cc/@you.",
  "feat2.title": "Links, Videos & Dateien",
  "feat2.desc": "Teile alles — Links, Texte, YouTube, X-Posts und Uploads.",
  "feat3.title": "Ein echtes Dashboard",
  "feat3.desc": "Bearbeite alles in /dash mit Live-Vorschau, Statistiken und KI-Agent.",
  "footer.left": "LinkTroo — eine Seite für alle.",
  "auth.create.title": "Erstelle dein LinkTroo",
  "auth.create.sub": "Eine Seite für alles. Kostenlos für alle.",
  "auth.username": "Benutzername",
  "auth.email": "E-Mail",
  "auth.password": "Passwort",
  "auth.create.submit": "Konto erstellen",
  "auth.creating": "Wird erstellt…",
  "auth.signin.title": "Anmelden",
  "auth.signin.sub": "Willkommen zurück.",
  "auth.signin.submit": "Anmelden",
  "auth.signingin": "Anmeldung…",
  "auth.noAccount": "Noch kein Konto?",
  "auth.haveAccount": "Bereits ein Konto?",
  "auth.confirmEmail": "Bestätige deine E-Mail und melde dich dann an.",
  "bio.noContent": "Noch kein Inhalt.",
  "bio.createOwn": "Erstelle dein eigenes LinkTroo — kostenlos für alle",
  "bio.notExist": "Diese Seite existiert nicht.",
  "bio.back": "Zurück zu LinkTroo",
};

const JA: Dict = {
  "nav.signin": "ログイン",
  "nav.cta": "LinkTrooを作る",
  "nav.dashboard": "ダッシュボード",
  "hero.kicker": "あなたのすべてを、ひとつのリンクに",
  "hero.title1": "あなたの世界を、",
  "hero.title2": "ひとつのLinkTrooに。",
  "hero.sub":
    "LinkTrooはリンク、テキスト、動画、ファイルをまとめた美しいページを全員に提供します。ハンドルを取得し、URLを1つ共有して、シンプルなダッシュボードで管理。誰でも無料。",
  "hero.cta": "LinkTrooを取得",
  "hero.signin": "ログイン",
  "hero.note": "linktroo.cc/@you — あなたのページ。",
  "feat1.title": "あなただけのハンドル",
  "feat1.desc": "ユーザー名を選べば linktroo.cc/@you の恒久ページを獲得。",
  "feat2.title": "リンク・動画・ファイル",
  "feat2.desc": "リンク、テキスト、YouTube、X投稿、ファイルを何でも追加。",
  "feat3.title": "本格ダッシュボード",
  "feat3.desc": "/dash でライブプレビュー・統計・AIエージェント付きで編集。",
  "footer.left": "LinkTroo — 全員のための1ページ。",
  "auth.create.title": "LinkTrooを作成",
  "auth.create.sub": "すべてを1ページに。誰でも無料。",
  "auth.username": "ユーザー名",
  "auth.email": "メール",
  "auth.password": "パスワード",
  "auth.create.submit": "アカウント作成",
  "auth.creating": "作成中…",
  "auth.signin.title": "ログイン",
  "auth.signin.sub": "おかえりなさい。",
  "auth.signin.submit": "ログイン",
  "auth.signingin": "ログイン中…",
  "auth.noAccount": "アカウントをお持ちでない？",
  "auth.haveAccount": "すでにアカウントをお持ちですか？",
  "auth.confirmEmail": "メールを確認してアカウントを有効化し、ログインしてください。",
  "bio.noContent": "コンテンツはまだありません。",
  "bio.createOwn": "あなたのLinkTrooを無料で作ろう",
  "bio.notExist": "このページは存在しません。",
  "bio.back": "LinkTrooに戻る",
};

const FR: Dict = {
  "nav.signin": "Connexion",
  "nav.cta": "Créer mon LinkTroo",
  "nav.dashboard": "Tableau de bord",
  "hero.kicker": "Un seul lien pour tout ce que vous êtes",
  "hero.title1": "Tout votre monde,",
  "hero.title2": "dans un seul LinkTroo.",
  "hero.sub":
    "LinkTroo offre à chacun une page unique et élégante pour vos liens, textes, vidéos et fichiers. Réservez votre identifiant, partagez une seule URL et gérez tout depuis un tableau de bord simple. Gratuit pour tous.",
  "hero.cta": "Réserver mon LinkTroo",
  "hero.signin": "Connexion",
  "hero.note": "linktroo.cc/@you — votre identifiant, votre page.",
  "feat1.title": "Votre propre identifiant",
  "feat1.desc": "Choisissez un nom et obtenez une page permanente sur linktroo.cc/@you.",
  "feat2.title": "Liens, vidéos & fichiers",
  "feat2.desc": "Partagez tout — liens, textes, YouTube, posts X et fichiers.",
  "feat3.title": "Un vrai tableau de bord",
  "feat3.desc": "Modifiez tout depuis /dash avec aperçu live, statistiques et Agent IA.",
  "footer.left": "LinkTroo — une page pour tous.",
  "auth.create.title": "Créez votre LinkTroo",
  "auth.create.sub": "Une page pour tout ce que vous êtes. Gratuit pour tous.",
  "auth.username": "Nom d'utilisateur",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.create.submit": "Créer un compte",
  "auth.creating": "Création…",
  "auth.signin.title": "Connexion",
  "auth.signin.sub": "Content de vous revoir.",
  "auth.signin.submit": "Se connecter",
  "auth.signingin": "Connexion…",
  "auth.noAccount": "Pas encore de compte ?",
  "auth.haveAccount": "Vous avez déjà un compte ?",
  "auth.confirmEmail": "Confirmez votre e-mail puis connectez-vous.",
  "bio.noContent": "Pas encore de contenu.",
  "bio.createOwn": "Créez votre LinkTroo — gratuit pour tous",
  "bio.notExist": "Cette page n'existe pas.",
  "bio.back": "Retour à LinkTroo",
};

const RU: Dict = {
  "nav.signin": "Войти",
  "nav.cta": "Создать LinkTroo",
  "nav.dashboard": "Панель",
  "hero.kicker": "Одна ссылка для всего, что вы есть",
  "hero.title1": "Весь ваш мир —",
  "hero.title2": "в одном LinkTroo.",
  "hero.sub":
    "LinkTroo даёт каждому одну красивую страницу для ссылок, текстов, видео и файлов. Займите свой хэндл, поделитесь одним URL и управляйте всем из простой панели. Бесплатно для всех.",
  "hero.cta": "Занять свой LinkTroo",
  "hero.signin": "Войти",
  "hero.note": "linktroo.cc/@you — ваш хэндл, ваша страница.",
  "feat1.title": "Свой хэндл",
  "feat1.desc": "Выберите имя и получите постоянную страницу на linktroo.cc/@you.",
  "feat2.title": "Ссылки, видео и файлы",
  "feat2.desc": "Добавляйте всё — ссылки, тексты, YouTube, посты X и загрузки.",
  "feat3.title": "Настоящая панель",
  "feat3.desc": "Редактируйте всё в /dash с живым просмотром, статистикой и ИИ-агентом.",
  "footer.left": "LinkTroo — одна страница для всех.",
  "auth.create.title": "Создайте свой LinkTroo",
  "auth.create.sub": "Одна страница для всего. Бесплатно для всех.",
  "auth.username": "Имя пользователя",
  "auth.email": "Эл. почта",
  "auth.password": "Пароль",
  "auth.create.submit": "Создать аккаунт",
  "auth.creating": "Создание…",
  "auth.signin.title": "Вход",
  "auth.signin.sub": "С возвращением.",
  "auth.signin.submit": "Войти",
  "auth.signingin": "Вход…",
  "auth.noAccount": "Ещё нет аккаунта?",
  "auth.haveAccount": "Уже есть аккаунт?",
  "auth.confirmEmail": "Подтвердите эл. почту и войдите.",
  "bio.noContent": "Пока нет контента.",
  "bio.createOwn": "Создайте свой LinkTroo — бесплатно для всех",
  "bio.notExist": "Эта страница не существует.",
  "bio.back": "Назад на LinkTroo",
};

const DICTS: Record<Lang, Dict> = { en: EN, ar: AR, de: DE, ja: JA, fr: FR, ru: RU };

export function t(key: string, lang: Lang): string {
  return DICTS[lang]?.[key] || EN[key] || key;
}

export function isRtl(lang: Lang): boolean {
  return lang === "ar";
}

// ---------- UI language context ----------
import { createContext as _c, useContext as _u, useState as _s, useCallback as _cb, useEffect as _e, type ReactNode as _R } from "react";
import { createElement as _el } from "react";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (key: string) => string;
  rtl: boolean;
}

const I18nContext = _c<I18nCtx>({ lang: "en", setLang: () => {}, tr: (k) => t(k, "en"), rtl: false });

export function I18nProvider({ children }: { children: _R }) {
  const [lang, setLangState] = _s<Lang>(() => {
    try {
      const saved = localStorage.getItem("linktroo-lang") as Lang | null;
      if (saved && DICTS[saved]) return saved;
      const nav = navigator.language.slice(0, 2) as Lang;
      if (DICTS[nav]) return nav;
    } catch {}
    return "en";
  });

  const setLang = _cb((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("linktroo-lang", l);
    } catch {}
  }, []);

  const rtl = isRtl(lang);
  _e(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.style.setProperty(
      "--app-font",
      rtl ? '"IBM Plex Sans Arabic", sans-serif' : '"Inter", system-ui, sans-serif'
    );
  }, [lang, rtl]);

  return _el(I18nContext.Provider, { value: { lang, setLang, tr: (k: string) => t(k, lang), rtl } }, children);
}

export function useI18n() {
  return _u(I18nContext);
}

// ---------- Theme (dark / light) ----------
export function useTheme(): [boolean, () => void] {
  const [light, setLightState] = _s<boolean>(() => {
    try {
      return localStorage.getItem("linktroo-theme") === "light";
    } catch {
      return false;
    }
  });
  const setLight = _cb((v: boolean) => {
    setLightState(v);
    try {
      localStorage.setItem("linktroo-theme", v ? "light" : "dark");
    } catch {}
  }, []);
  _e(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);
  return [light, () => setLight(!light)];
}
