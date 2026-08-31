import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Guarded client — never crash the app when env vars are missing at build time
// (a hard crash here was the cause of the "black screen" deploy).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
