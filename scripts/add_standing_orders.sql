-- Migration: add standing orders, acknowledgments, and order completions to schedules table
-- Run once in Supabase SQL editor

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS standing_orders   JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS acknowledgments   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS order_completions JSONB DEFAULT '{}'::jsonb;
