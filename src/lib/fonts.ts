export interface FontDef {
  label: string;
  family: string;
}

export const FONTS: Record<string, FontDef> = {
  inter: { label: "Inter (Default)", family: '"Inter", system-ui, sans-serif' },
  "ibm-plex-arabic": { label: "IBM Plex Sans Arabic — AR/EN", family: '"IBM Plex Sans Arabic", sans-serif' },
  playfair: { label: "Playfair Display", family: '"Playfair Display", serif' },
  "noto-serif-jp": { label: "Noto Serif Japanese", family: '"Noto Serif JP", serif' },
  rubik: { label: "Rubik — AR/EN", family: '"Rubik", sans-serif' },
  baloo: { label: "Baloo Bhaijaan 2 — AR", family: '"Baloo Bhaijaan 2", cursive' },
};

export function fontFamily(key?: string | null): string {
  return (key && FONTS[key]?.family) || FONTS.inter.family;
}
