import type { BioItem } from "@/lib/types";
import { FileDown } from "lucide-react";
import { Icon } from "@/components/ui/icon";

export function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/youtube\.com\/(?:shorts|embed|live)\/([\w-]{11})/);
  return m ? m[1] : null;
}

export function xPostId(url: string): string | null {
  const m = url.match(/(?:x|twitter)\.com\/\w+\/status\/(\d+)/);
  return m ? m[1] : null;
}

export function ItemBody({ item }: { item: BioItem }) {
  if (item.type === "youtube" && item.url && youtubeId(item.url)) {
    return (
      <div className="w-full border border-border">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId(item.url)}`}
          title={item.label || "YouTube video"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="aspect-video w-full"
        />
      </div>
    );
  }

  if (item.type === "x" && item.url && xPostId(item.url)) {
    return (
      <div className="w-full border border-border">
        <iframe
          src={`https://platform.twitter.com/embed/Tweet.html?id=${xPostId(item.url)}&theme=dark`}
          title={item.label || "X post"}
          loading="lazy"
          className="h-[28rem] w-full"
        />
      </div>
    );
  }

  if (item.type === "image" && item.image_url) {
    return (
      <img
        src={item.image_url}
        alt={item.label || ""}
        className="w-full border border-border object-cover"
      />
    );
  }

  if (item.type === "file" && item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex w-full items-center gap-3 border border-border bg-card px-5 py-4 transition-colors duration-150 hover:border-foreground hover:bg-accent"
      >
        <span className="border border-border px-2 py-1 text-xs text-muted-foreground">
          {String(item.meta?.type || "FILE").split("/")[1]?.toUpperCase().slice(0, 4) || "FILE"}
        </span>
        <span className="flex flex-1 flex-col">
          {item.label && (
            <span className="text-sm font-medium tracking-tight text-foreground">{item.label}</span>
          )}
          <span className="text-xs text-muted-foreground">Download</span>
        </span>
        <Icon as={FileDown} className="text-muted-foreground transition-transform duration-150 group-hover:translate-y-0.5 group-hover:text-foreground" />
      </a>
    );
  }

  return null;
}
