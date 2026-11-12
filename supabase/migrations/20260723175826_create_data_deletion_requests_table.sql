/*
# Create data_deletion_requests table

## Overview
Adds a new table to store customer requests for account and data deletion,
as required by privacy regulations (PIPEDA). The table supports a public
submission flow (no sign-in required) and a staff-only management interface.

## New Table: data_deletion_requests
- id (uuid, primary key)
- name (text, not null) — requester's full name
- email (text, not null) — requester's email for confirmation
- phone (text, nullable) — requester's phone on file
- account_identifier (text, nullable) — customer ID, email, or other identifying info
- reason (text, nullable) — optional reason for deletion request
- status (text, not null, default 'pending') — pending / in_progress / completed / declined
- submitted_at (timestamptz, default now()) — when the request was submitted
- resolved_at (timestamptz, nullable) — when staff resolved the request
- staff_notes (text, nullable) — internal notes from staff handling the request
- created_at (timestamptz, default now())

## Security (RLS)
- SELECT: TO authenticated only (staff can see requests; public cannot list them)
- INSERT: TO anon, authenticated (anyone can submit a deletion request without signing in)
- UPDATE: TO authenticated WITH CHECK (auth.jwt() ->> 'role' = 'staff') (only staff can update status)
- DELETE: TO authenticated USING (auth.jwt() ->> 'role' = 'staff') (only staff can delete)
*/

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  account_identifier text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  staff_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_deletion_requests" ON data_deletion_requests;
CREATE POLICY "select_deletion_requests" ON data_deletion_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_deletion_requests" ON data_deletion_requests;
CREATE POLICY "insert_deletion_requests" ON data_deletion_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_deletion_requests" ON data_deletion_requests;
CREATE POLICY "update_deletion_requests" ON data_deletion_requests FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "delete_deletion_requests" ON data_deletion_requests;
CREATE POLICY "delete_deletion_requests" ON data_deletion_requests FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_email ON data_deletion_requests(email);