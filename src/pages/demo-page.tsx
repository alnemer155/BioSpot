import { Link } from "react-router-dom";
import { BioItemRow } from "@/components/bio-item";
import { fontFamily } from "@/lib/fonts";
import type { BioData } from "@/lib/types";

// linktroo.cc/~/demo — a public demo page with dummy data (no account needed).
const DEMO: BioData = {
  profile: {
    id: "demo",
    slug: "demo",
    name: "Sara Al-Amin",
    title: "Product Designer & Content Creator",
    bio: "This is a demo LinkTroo page. I design products, teach UI on YouTube, and share everything I make — links, videos and files, all in one place.",
    avatar_url: null,
    font: "rubik",
    translations: {
      ar: { name: "سارع الأمين", title: "مصممة منتجات وصانعة محتوى", bio: "هذه صفحة تجريبية على LinkTroo. أصمم المنتجات وأعلّم التصميم على يوتيوب وأشارك كل ما أصنعه — روابط وفيديوهات وملفات في مكان واحد." },
    },
  },
  items: [
    { id: "demo-1", type: "link", label: "My Portfolio", url: "https://example.com", description: "Selected design work", image_url: null, sort_order: 1, visible: true },
    { id: "demo-2", type: "youtube", label: "My latest design breakdown", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: null, image_url: null, sort_order: 2, visible: true },
    { id: "demo-3", type: "text", label: "Design Newsletter", url: null, description: "One practical design tip, every Sunday. 12,000+ readers.", image_url: null, sort_order: 3, visible: true },
    { id: "demo-4", type: "link", label: "Follow me on X", url: "https://x.com/linktroo", description: "@linktroo", image_url: null, sort_order: 4, visible: true },
    { id: "demo-5", type: "file", label: "Design System Checklist (PDF)", url: "https://example.com/checklist.pdf", description: null, image_url: null, meta: { type: "application/pdf" }, sort_order: 5, visible: true },
    { id: "demo-6", type: "text_link", label: "Book a 1:1 session", url: "https://example.com/booking", description: "30 minutes — portfolio review", image_url: null, sort_order: 6, visible: true },
  ],
};

export default function DemoPage({ lang = "en" }: { lang?: "en" | "ar" }) {
  const { profile, items } = DEMO;
  const trData = lang === "ar" ? profile.translations?.ar : undefined;
  const name = trData?.name || profile.name;
  const title = trData?.title || profile.title;
  const bio = trData?.bio || profile.bio;
  const rtl = lang === "ar";

  return (
    <main
      className="flex min-h-screen flex-col items-center px-5 py-16 sm:py-24"
      dir={rtl ? "rtl" : "ltr"}
      style={{ fontFamily: fontFamily(profile.font) }}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 border border-border bg-card px-4 py-2 text-center text-xs text-muted-foreground animate-fade-in">
          Demo page — linktroo.cc/~/demo
        </div>

        <header className="flex flex-col items-center text-center animate-fade-up">
          <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border bg-card text-2xl font-semibold text-muted-foreground">
            S
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{title}</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{bio}</p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          {items.map((item, i) => (
            <BioItemRow key={item.id} item={item} index={i} />
          ))}
        </div>

        <footer className="mt-16 animate-fade-in">
          <Link
            to="/"
            className="block border border-foreground bg-foreground px-5 py-3 text-center text-xs font-medium text-background transition-opacity hover:opacity-90"
          >
            Create your own LinkTroo — free
          </Link>
        </footer>
      </div>
    </main>
  );
}
