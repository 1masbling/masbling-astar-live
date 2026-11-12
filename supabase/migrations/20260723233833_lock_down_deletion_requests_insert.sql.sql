-- Remove public insert access: only the service role (via edge function) can insert.
-- The anon key can no longer write directly to this table.

DROP POLICY IF EXISTS "insert_deletion_requests" ON data_deletion_requests;

-- service_role bypasses RLS entirely, so no explicit INSERT policy is needed.
-- Only staff (authenticated) can read/update/delete, which is already in place.