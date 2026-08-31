export type BioItemType =
  | "text"
  | "link"
  | "text_link"
  | "image"
  | "youtube"
  | "x"
  | "file";

export interface Profile {
  id?: string;
  user_id?: string;
  slug?: string;
  is_default?: boolean;
  name: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  font?: string | null;
  translations?: Record<string, { name: string; title: string | null; bio: string | null }> | null;
  style?: { bg?: string; fg?: string } | null;
  updated_at?: string;
}

export interface BioItem {
  id: string;
  type: BioItemType;
  label: string | null;
  url: string | null;
  description: string | null;
  image_url: string | null;
  meta?: Record<string, unknown> | null;
  sort_order: number;
  visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BioData {
  profile: Profile;
  items: BioItem[];
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  slug?: string;
  page_id?: string;
}
