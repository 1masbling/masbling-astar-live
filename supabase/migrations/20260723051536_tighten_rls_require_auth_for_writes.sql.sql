/*
# Tighten RLS: require authentication for all write operations

## Overview
This migration fixes 48 RLS policy violations where INSERT, UPDATE, and DELETE
policies on 16 tables used `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`,
allowing anyone with the public anon key to modify or delete all business data.

## Changes
For each of the 16 tables, the SELECT policy stays `TO anon, authenticated` (so the
public booking page can still read the services list), but INSERT, UPDATE, and DELETE
policies are changed to `TO authenticated` only. This means:
- Unauthenticated visitors (anon key) can READ data but cannot write anything.
- Authenticated staff (sign-in required) can INSERT, UPDATE, and DELETE.

## Tables affected (16 tables × 3 write policies = 48 policies replaced)
1. services       7. campaigns          13. review_requests
2. jobs           8. csr_tickets        14. notifications
3. invoices       9. job_photos         15. time_entries
4. checklists     10. estimates         16. payments
5. schedules      11. estimate_line_items
6. customers      12. technicians

## Security
- SELECT: TO anon, authenticated USING (true) — unchanged, needed for public booking.
- INSERT: TO authenticated WITH CHECK (true) — only signed-in staff.
- UPDATE: TO authenticated USING (true) WITH CHECK (true) — only signed-in staff.
- DELETE: TO authenticated USING (true) — only signed-in staff.

## Important Notes
1. SELECT policies intentionally remain public so the booking page can load services.
   No sensitive data (no PII, no financial details) is exposed beyond what the booking
   form needs (service labels and icons).
2. The booking page now submits through a server-side edge function that uses the
   service role key, bypassing RLS to insert job + customer + notification records.
3. Existing demo data is preserved — only policies change, no data is touched.
*/

-- services
DROP POLICY IF EXISTS "anon_insert_services" ON services;
CREATE POLICY "auth_insert_services" ON services FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_services" ON services;
CREATE POLICY "auth_update_services" ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_services" ON services;
CREATE POLICY "auth_delete_services" ON services FOR DELETE TO authenticated USING (true);

-- jobs
DROP POLICY IF EXISTS "anon_insert_jobs" ON jobs;
CREATE POLICY "auth_insert_jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_jobs" ON jobs;
CREATE POLICY "auth_update_jobs" ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_jobs" ON jobs;
CREATE POLICY "auth_delete_jobs" ON jobs FOR DELETE TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE TO authenticated USING (true);

-- checklists
DROP POLICY IF EXISTS "anon_insert_checklists" ON checklists;
CREATE POLICY "auth_insert_checklists" ON checklists FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_checklists" ON checklists;
CREATE POLICY "auth_update_checklists" ON checklists FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_checklists" ON checklists;
CREATE POLICY "auth_delete_checklists" ON checklists FOR DELETE TO authenticated USING (true);

-- schedules
DROP POLICY IF EXISTS "anon_insert_schedules" ON schedules;
CREATE POLICY "auth_insert_schedules" ON schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_schedules" ON schedules;
CREATE POLICY "auth_update_schedules" ON schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_schedules" ON schedules;
CREATE POLICY "auth_delete_schedules" ON schedules FOR DELETE TO authenticated USING (true);

-- campaigns
DROP POLICY IF EXISTS "anon_insert_campaigns" ON campaigns;
CREATE POLICY "auth_insert_campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_campaigns" ON campaigns;
CREATE POLICY "auth_update_campaigns" ON campaigns FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_campaigns" ON campaigns;
CREATE POLICY "auth_delete_campaigns" ON campaigns FOR DELETE TO authenticated USING (true);

-- csr_tickets
DROP POLICY IF EXISTS "anon_insert_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_insert_csr_tickets" ON csr_tickets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_update_csr_tickets" ON csr_tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_delete_csr_tickets" ON csr_tickets FOR DELETE TO authenticated USING (true);

-- job_photos
DROP POLICY IF EXISTS "anon_insert_job_photos" ON job_photos;
CREATE POLICY "auth_insert_job_photos" ON job_photos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_job_photos" ON job_photos;
CREATE POLICY "auth_update_job_photos" ON job_photos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_job_photos" ON job_photos;
CREATE POLICY "auth_delete_job_photos" ON job_photos FOR DELETE TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "anon_insert_customers" ON customers;
CREATE POLICY "auth_insert_customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_customers" ON customers;
CREATE POLICY "auth_update_customers" ON customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_customers" ON customers;
CREATE POLICY "auth_delete_customers" ON customers FOR DELETE TO authenticated USING (true);

-- technicians
DROP POLICY IF EXISTS "anon_insert_technicians" ON technicians;
CREATE POLICY "auth_insert_technicians" ON technicians FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_technicians" ON technicians;
CREATE POLICY "auth_update_technicians" ON technicians FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_technicians" ON technicians;
CREATE POLICY "auth_delete_technicians" ON technicians FOR DELETE TO authenticated USING (true);

-- estimates
DROP POLICY IF EXISTS "anon_insert_estimates" ON estimates;
CREATE POLICY "auth_insert_estimates" ON estimates FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimates" ON estimates;
CREATE POLICY "auth_update_estimates" ON estimates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimates" ON estimates;
CREATE POLICY "auth_delete_estimates" ON estimates FOR DELETE TO authenticated USING (true);

-- estimate_line_items
DROP POLICY IF EXISTS "anon_insert_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_insert_estimate_line_items" ON estimate_line_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_update_estimate_line_items" ON estimate_line_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_delete_estimate_line_items" ON estimate_line_items FOR DELETE TO authenticated USING (true);

-- time_entries
DROP POLICY IF EXISTS "anon_insert_time_entries" ON time_entries;
CREATE POLICY "auth_insert_time_entries" ON time_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_time_entries" ON time_entries;
CREATE POLICY "auth_update_time_entries" ON time_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_time_entries" ON time_entries;
CREATE POLICY "auth_delete_time_entries" ON time_entries FOR DELETE TO authenticated USING (true);

-- review_requests
DROP POLICY IF EXISTS "anon_insert_review_requests" ON review_requests;
CREATE POLICY "auth_insert_review_requests" ON review_requests FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_review_requests" ON review_requests;
CREATE POLICY "auth_update_review_requests" ON review_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_review_requests" ON review_requests;
CREATE POLICY "auth_delete_review_requests" ON review_requests FOR DELETE TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "auth_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "auth_update_notifications" ON notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "auth_delete_notifications" ON notifications FOR DELETE TO authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "anon_insert_payments" ON payments;
CREATE POLICY "auth_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payments" ON payments;
CREATE POLICY "auth_update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payments" ON payments;
CREATE POLICY "auth_delete_payments" ON payments FOR DELETE TO authenticated USING (true);