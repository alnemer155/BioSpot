import { useState, useRef, useEffect } from "react";
import { LANGS, useI18n, useTheme, type Lang } from "@/lib/i18n";

export function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}

export function LanguagePicker({ align = "left" }: { align?: "left" | "right" }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Language"
        className="flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <GlobeIcon />
        <span aria-hidden="true">{current.flag}</span>
        <span>{current.short}</span>
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1 w-36 border border-border bg-card shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-accent ${
                l.code === lang ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span aria-hidden="true">{l.flag}</span>
              <span>{l.short}</span>
              {l.code === lang && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemeToggle() {
  const [light, toggle] = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      {light ? "☾" : "☀"}
    </button>
  );
}
