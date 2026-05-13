-- =============================================================
-- YachtWatch Push Notifications Setup
-- Run this in the Supabase SQL editor.
-- For Step 4 (watch reminders), replace YOUR_SERVICE_ROLE_KEY
-- with the key from: Dashboard → Settings → API → service_role
-- =============================================================

-- 1. Add push_token column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Enable pg_net extension (already enabled on Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- =============================================================
-- TRIGGER 1: New join request → notify the vessel captain
-- =============================================================
CREATE OR REPLACE FUNCTION notify_captain_new_join_request()
RETURNS trigger AS $$
DECLARE
  v_token TEXT;
  v_service_key TEXT;
BEGIN
  v_service_key := current_setting('app.settings.service_role_key', true);

  SELECT push_token INTO v_token
  FROM profiles
  WHERE vessel_id = NEW.vessel_id
    AND role = 'captain'
    AND push_token IS NOT NULL
  LIMIT 1;

  IF v_token IS NOT NULL AND v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://oyukwinukknfgebibsqc.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'token', v_token,
        'title', 'New Crew Request',
        'body', 'A crew member has requested to join your vessel.'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_join_request ON join_requests;
CREATE TRIGGER on_new_join_request
  AFTER INSERT ON join_requests
  FOR EACH ROW EXECUTE FUNCTION notify_captain_new_join_request();

-- =============================================================
-- TRIGGER 2: Join request approved → notify the crew member
-- =============================================================
CREATE OR REPLACE FUNCTION notify_crew_request_approved()
RETURNS trigger AS $$
DECLARE
  v_token TEXT;
  v_service_key TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    v_service_key := current_setting('app.settings.service_role_key', true);

    SELECT push_token INTO v_token
    FROM profiles
    WHERE id = NEW.user_id
      AND push_token IS NOT NULL;

    IF v_token IS NOT NULL AND v_service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://oyukwinukknfgebibsqc.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
          'token', v_token,
          'title', 'Request Approved!',
          'body', 'You have been approved to join the vessel.'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_join_request_approved ON join_requests;
CREATE TRIGGER on_join_request_approved
  AFTER UPDATE ON join_requests
  FOR EACH ROW EXECUTE FUNCTION notify_crew_request_approved();

-- =============================================================
-- TRIGGER 3: Schedule created or updated → notify all vessel crew
-- =============================================================
CREATE OR REPLACE FUNCTION notify_crew_schedule_change()
RETURNS trigger AS $$
DECLARE
  v_token TEXT;
  v_title TEXT;
  v_body TEXT;
  v_service_key TEXT;
BEGIN
  v_service_key := current_setting('app.settings.service_role_key', true);

  IF TG_OP = 'INSERT' THEN
    v_title := 'New Watch Schedule';
    v_body  := 'A new watch schedule has been published for your vessel.';
  ELSE
    v_title := 'Schedule Updated';
    v_body  := 'Your vessel watch schedule has been updated.';
  END IF;

  FOR v_token IN
    SELECT push_token
    FROM profiles
    WHERE vessel_id = NEW.vessel_id
      AND push_token IS NOT NULL
  LOOP
    PERFORM net.http_post(
      url := 'https://oyukwinukknfgebibsqc.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'token', v_token,
        'title', v_title,
        'body', v_body
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_schedule_change ON schedules;
CREATE TRIGGER on_schedule_change
  AFTER INSERT OR UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION notify_crew_schedule_change();

-- =============================================================
-- STEP 4: Watch reminders via pg_cron
--
-- HOW TO RUN:
--   1. Go to Supabase Dashboard → Settings → API
--   2. Copy the "service_role" secret key
--   3. Replace YOUR_SERVICE_ROLE_KEY below with it
--   4. Paste the whole block into the SQL editor and run
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Remove any existing job before (re)creating
SELECT cron.unschedule('dispatch-watch-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-watch-reminders');

-- Fire every minute to check who needs a watch reminder right now.
-- Replace YOUR_SERVICE_ROLE_KEY with the key from:
--   Supabase Dashboard → Settings → API → service_role (secret)
SELECT cron.schedule(
  'dispatch-watch-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://oyukwinukknfgebibsqc.supabase.co/functions/v1/dispatch-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
