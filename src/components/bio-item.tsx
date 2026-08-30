import type { BioItem } from "@/lib/types";

export function BioItemRow({
  item,
  index,
  onTrackClick,
}: {
  item: BioItem;
  index: number;
  onTrackClick?: () => void;
}) {
  const delayClass = `animate-fade-in-delay-${Math.min(index + 1, 4)}`;

  if (item.type === "image" && item.image_url) {
    return (
      <div className={delayClass}>
        <img
          src={item.image_url}
          alt={item.label || ""}
          className="w-full border border-border object-cover"
        />
      </div>
    );
  }

  if (item.type === "text") {
    return (
      <div className={`border border-border bg-card px-5 py-4 ${delayClass}`}>
        {item.label && (
          <p className="text-sm font-medium tracking-tight text-foreground">{item.label}</p>
        )}
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.url || "#"}
      target={item.url?.startsWith("http") ? "_blank" : undefined}
      rel={item.url?.startsWith("http") ? "noopener noreferrer" : undefined}
      onClick={onTrackClick}
      className={`group flex w-full items-center justify-between border border-border bg-card px-5 py-4 transition-colors duration-150 hover:border-foreground hover:bg-accent ${delayClass}`}
    >
      <span className="flex flex-col">
        {item.label && (
          <span className="text-sm font-medium tracking-tight text-foreground">
            {item.label}
          </span>
        )}
        {item.description && (
          <span className="mt-0.5 text-xs text-muted-foreground">{item.description}</span>
        )}
      </span>
      <span className="ml-3 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 7h8M7 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </svg>
      </span>
    </a>
  );
}
