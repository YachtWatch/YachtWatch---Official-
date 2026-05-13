-- Add timezone column to vessels
-- Run in Supabase SQL Editor
ALTER TABLE vessels ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
