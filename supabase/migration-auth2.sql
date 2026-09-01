-- Auth-2.0: Account request system
-- Run this migration in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS account_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    use_case TEXT NOT NULL CHECK (use_case IN ('creator','personal','for_someone_else','business','other')),
    use_case_details TEXT,
    agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
    agreed_to_auth2 BOOLEAN NOT NULL DEFAULT false,
    agreed_to_privacy BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ai_review','approved','manual_review','rejected')),
    ai_score FLOAT,
    ai_analysis JSONB DEFAULT '{}',
    ai_recommendation TEXT,
    risk_level TEXT CHECK (risk_level IN ('low','medium','high','critical')),
    temp_password TEXT,
    reviewed_by TEXT,
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_username ON account_requests (username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_email ON account_requests (email);
CREATE INDEX IF NOT EXISTS idx_ar_status ON account_requests (status);

CREATE TABLE IF NOT EXISTS account_request_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES account_requests(id) ON DELETE CASCADE,
    reviewer TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('approved','rejected','manual_review','escalated')),
    notes TEXT,
    ai_score_snapshot FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arr_request ON account_request_reviews (request_id);

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'reviewer' CHECK (role IN ('admin','reviewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS force_password_change (
    user_id TEXT PRIMARY KEY,
    must_change BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
