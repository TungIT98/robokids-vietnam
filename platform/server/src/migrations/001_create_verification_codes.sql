-- Migration: Create verification_codes table
-- Replaces in-memory Map for email verification codes with Supabase-backed store
-- Note: Using supabaseAdmin (service role) for all operations - RLS bypassed

-- MANUAL STEP REQUIRED: Run this SQL in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/uciwcnjdomvahtbcvfyg/sql/new

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);

-- No RLS needed - all operations use supabaseAdmin (service role) which bypasses RLS