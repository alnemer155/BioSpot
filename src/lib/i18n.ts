export type Lang = "en" | "ar" | "ja" | "fr" | "ru";

export const LANGS: { code: Lang; label: string; rtl?: boolean }[] = [
  { code: "en", label: "EN" },
  { code: "ar", label: "العربية", rtl: true },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
];

const STRINGS = {
  noContent: {
    en: "No content yet.",
    ar: "لا يوجد محتوى بعد.",
    ja: "コンテンツはまだありません。",
    fr: "Pas encore de contenu.",
    ru: "Контента пока нет.",
  },
  createOwn: {
    en: "Create your own BioSpot — free for everyone",
    ar: "أنشئ صفحتك على BioSpot — مجاناً للجميع",
    ja: "自分のBioSpotを無料で作ろう",
    fr: "Créez votre BioSpot — gratuit pour tous",
    ru: "Создайте свой BioSpot — бесплатно для всех",
  },
  notExist: {
    en: "This page does not exist.",
    ar: "هذه الصفحة غير موجودة.",
    ja: "このページは存在しません。",
    fr: "Cette page n'existe pas.",
    ru: "Эта страница не существует.",
  },
  back: {
    en: "Back to BioSpot",
    ar: "العودة إلى BioSpot",
    ja: "BioSpotに戻る",
    fr: "Retour à BioSpot",
    ru: "Вернуться на BioSpot",
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang] || STRINGS[key].en;
}

export function isRtl(lang: Lang): boolean {
  return lang === "ar";
}
