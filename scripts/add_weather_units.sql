-- Add weather unit preferences to profiles
-- Run in Supabase SQL editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wind_unit text NOT NULL DEFAULT 'knots'
    CHECK (wind_unit IN ('knots', 'mph', 'kmh')),
  ADD COLUMN IF NOT EXISTS wave_unit text NOT NULL DEFAULT 'meters'
    CHECK (wave_unit IN ('meters', 'feet'));
