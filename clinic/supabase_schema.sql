-- ================================================================
-- Sai Manohar Clinic — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name          TEXT        NOT NULL,
  phone                TEXT        NOT NULL,
  patient_email        TEXT,
  child_name           TEXT        NOT NULL,
  child_age            TEXT        NOT NULL,
  vaccine              TEXT        DEFAULT 'Not specified',
  preferred_date       DATE        NOT NULL,
  preferred_time       TEXT,
  appointment_datetime TIMESTAMPTZ,
  notes                TEXT,
  google_event_id      TEXT,
  reminder_sent        BOOLEAN     DEFAULT false,
  status               TEXT        DEFAULT 'pending',  -- pending | confirmed | cancelled
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Efficient index for reminder cron queries
CREATE INDEX IF NOT EXISTS idx_appt_reminder
  ON appointments (appointment_datetime, reminder_sent, status)
  WHERE reminder_sent = false AND status = 'pending';

-- Row Level Security (best practice for Supabase)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- The server-side API uses the service role key which bypasses RLS automatically.
-- This policy is a safe default — it allows nothing from the public API.
CREATE POLICY "No public access" ON appointments FOR ALL USING (false);
