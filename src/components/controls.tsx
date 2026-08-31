import { useState, useRef, useEffect } from "react";
import { Globe, Moon, Sun, Check } from "lucide-react";
import { LANGS, useI18n, useTheme } from "@/lib/i18n";
import { Icon } from "@/components/ui/icon";

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
        <Icon as={Globe} size="sm" />
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
              {l.code === lang && <Icon as={Check} size="sm" className="ml-auto" />}
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
      className="border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      <Icon as={light ? Moon : Sun} size="sm" />
    </button>
  );
}
