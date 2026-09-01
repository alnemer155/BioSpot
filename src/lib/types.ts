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
  must_change_password?: boolean;
  admin_role?: "admin" | "reviewer" | null;
}

export type AccountRequestStatus = "pending" | "ai_review" | "approved" | "manual_review" | "rejected";

export interface AccountRequest {
  id: string;
  username: string;
  email: string;
  display_name: string;
  use_case: "creator" | "personal" | "for_someone_else" | "business" | "other";
  use_case_details: string | null;
  agreed_to_terms: boolean;
  agreed_to_auth2: boolean;
  agreed_to_privacy: boolean;
  status: AccountRequestStatus;
  ai_score: number | null;
  ai_analysis: Record<string, unknown>;
  ai_recommendation: string | null;
  risk_level: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountRequestReview {
  id: string;
  request_id: string;
  reviewer: string;
  action: "approved" | "rejected" | "manual_review" | "escalated";
  notes: string | null;
  ai_score_snapshot: number | null;
  created_at: string;
}
