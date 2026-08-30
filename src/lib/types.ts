export type BioItemType = "text" | "link" | "text_link" | "image";

export interface Profile {
  user_id?: string;
  name: string;
  title?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  font?: string | null;
  translations?: Record<string, { name: string; title: string | null; bio: string | null }> | null;
  updated_at?: string;
}

export interface BioItem {
  id: string;
  type: BioItemType;
  label: string | null;
  url: string | null;
  description: string | null;
  image_url: string | null;
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
  username: string;
  email: string;
  created_at?: string;
}
