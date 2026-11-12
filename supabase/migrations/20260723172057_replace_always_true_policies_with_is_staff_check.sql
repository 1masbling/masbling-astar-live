/*
# Fix RLS policies: replace always-true checks with real staff verification

## Overview
This migration fixes 48 RLS policy violations across 16 tables. All INSERT, UPDATE,
and DELETE policies used `WITH CHECK (true)` / `USING (true)`, meaning ANY signed-in
user could modify or delete ANY row in ANY table — even rows belonging to other
businesses or created by other staff.

## Approach
This is a shared-data business management app (single-tenant, staff-only access):
- All signed-in staff share the same business data (customers, jobs, invoices, etc.)
- There is no per-user ownership of individual rows
- The correct access model is: "any verified staff member can read/write all data,
  but unauthenticated users and non-staff authenticated users cannot"

The fix introduces a `public.is_staff()` helper function that checks whether the
current authenticated user has `{"role":"staff"}` in their JWT app_metadata
(raw_app_meta_data). This metadata is set:
1. On existing admin accounts (done via SQL before this migration)
2. On new staff accounts created through the create-staff edge function (updated
   in this migration batch to include app_metadata role)

## Changes
1. Creates `public.is_staff()` — a SECURITY DEFINER SQL function that returns true
   if `auth.uid()` is not null AND the user's `raw_app_meta_data->>'role' = 'staff'`.
   Execution is revoked from anon/authenticated to prevent direct invocation.

2. Replaces all 48 write policies (INSERT/UPDATE/DELETE × 16 tables) to use
   `is_staff()` instead of `true`:
   - INSERT: `WITH CHECK (public.is_staff())`
   - UPDATE: `USING (public.is_staff()) WITH CHECK (public.is_staff())`
   - DELETE: `USING (public.is_staff())`

## Tables affected (16 tables × 3 policies = 48 policies)
1. services       7. campaigns          13. review_requests
2. jobs           8. csr_tickets        14. notifications
3. invoices       9. job_photos         15. time_entries
4. checklists     10. estimates         16. payments
5. schedules      11. estimate_line_items
6. customers      12. technicians

## Security
- Only authenticated users with the "staff" role in their JWT can write/delete data
- Unauthenticated users: cannot read (already locked down) or write anything
- Authenticated non-staff users: cannot read or write any business data
- The `services` table SELECT remains TO anon, authenticated (booking page needs it)
- The is_staff() function itself is protected: anon/authenticated cannot call it
*/

-- ── Helper function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff',
      false
    );
$$;

-- Revoke direct execution from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM anon, authenticated;

-- ── services ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── jobs ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── invoices ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── checklists ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_checklists" ON checklists;
CREATE POLICY "auth_insert_checklists" ON checklists FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_checklists" ON checklists;
CREATE POLICY "auth_update_checklists" ON checklists FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_checklists" ON checklists;
CREATE POLICY "auth_delete_checklists" ON checklists FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── schedules ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_schedules" ON schedules;
CREATE POLICY "auth_insert_schedules" ON schedules FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_schedules" ON schedules;
CREATE POLICY "auth_update_schedules" ON schedules FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_schedules" ON schedules;
CREATE POLICY "auth_delete_schedules" ON schedules FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── campaigns ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_campaigns" ON campaigns;
CREATE POLICY "auth_insert_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_campaigns" ON campaigns;
CREATE POLICY "auth_update_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_campaigns" ON campaigns;
CREATE POLICY "auth_delete_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── csr_tickets ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_insert_csr_tickets" ON csr_tickets FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_update_csr_tickets" ON csr_tickets FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_delete_csr_tickets" ON csr_tickets FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── job_photos ───────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_job_photos" ON job_photos;
CREATE POLICY "auth_insert_job_photos" ON job_photos FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_job_photos" ON job_photos;
CREATE POLICY "auth_update_job_photos" ON job_photos FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_job_photos" ON job_photos;
CREATE POLICY "auth_delete_job_photos" ON job_photos FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── customers ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── technicians ──────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_technicians" ON technicians;
CREATE POLICY "auth_insert_technicians" ON technicians FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_technicians" ON technicians;
CREATE POLICY "auth_update_technicians" ON technicians FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_technicians" ON technicians;
CREATE POLICY "auth_delete_technicians" ON technicians FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── estimates ────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimates" ON estimates;
CREATE POLICY "auth_insert_estimates" ON estimates FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_estimates" ON estimates;
CREATE POLICY "auth_update_estimates" ON estimates FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_estimates" ON estimates;
CREATE POLICY "auth_delete_estimates" ON estimates FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── estimate_line_items ──────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_insert_estimate_line_items" ON estimate_line_items FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_update_estimate_line_items" ON estimate_line_items FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_delete_estimate_line_items" ON estimate_line_items FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── time_entries ─────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_time_entries" ON time_entries;
CREATE POLICY "auth_insert_time_entries" ON time_entries FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_time_entries" ON time_entries;
CREATE POLICY "auth_update_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_time_entries" ON time_entries;
CREATE POLICY "auth_delete_time_entries" ON time_entries FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── review_requests ──────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_review_requests" ON review_requests;
CREATE POLICY "auth_insert_review_requests" ON review_requests FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_review_requests" ON review_requests;
CREATE POLICY "auth_update_review_requests" ON review_requests FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_review_requests" ON review_requests;
CREATE POLICY "auth_delete_review_requests" ON review_requests FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── notifications ────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE
  TO authenticated USING (public.is_staff());

-- ── payments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE
  TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "auth_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE
  TO authenticated USING (public.is_staff());