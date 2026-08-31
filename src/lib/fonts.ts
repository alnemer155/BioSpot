export type FontDef = {
  label: string;
  family: string;
};

export const FONTS: Record<string, FontDef> = {
  inter: { label: "Inter (Default)", family: '"Inter", system-ui, sans-serif' },
  "ibm-arabic": { label: "IBM Arabic", family: '"IBM Plex Sans Arabic", sans-serif' },
  playfair: { label: "Playfair Display", family: '"Playfair Display", serif' },
  "noto-serif-jp": { label: "Noto Serif JP", family: '"Noto Serif JP", serif' },
  rubik: { label: "Rubik", family: '"Rubik", sans-serif' },
  baloo: { label: "Baloo Bhaijaan 2", family: '"Baloo Bhaijaan 2", cursive' },
};

export function fontFamily(key?: string | null): string {
  return (key && FONTS[key]?.family) || FONTS.inter.family;
}
