/*
# Lock down SELECT policies: require authentication for all sensitive data

## Overview
This migration fixes a critical data exposure issue: all 15 sensitive tables had
SELECT policies scoped to `TO anon, authenticated`, meaning anyone with the public
anon key (embedded in the app's client-side code) could read ALL business data —
customer names, phone numbers, home addresses, invoice amounts, payment details,
technician names — without signing in.

## Changes
For each of the 15 sensitive tables, the SELECT policy is changed from
`TO anon, authenticated` to `TO authenticated` only. This means:
- Unauthenticated visitors (anon key) can NO LONGER read any sensitive data.
- Authenticated staff (sign-in required) can read all data as before.
- The `services` table SELECT policy is LEFT AS `TO anon, authenticated` because
  the public booking page needs to display the list of available services.

## Tables affected (15 tables × 1 SELECT policy = 15 policies replaced)
1. jobs            6. csr_tickets         11. estimate_line_items
2. invoices        7. job_photos          12. time_entries
3. checklists      8. customers           13. review_requests
4. schedules       9. technicians         14. notifications
5. campaigns       10. estimates          15. payments

## Security
- services: SELECT stays TO anon, authenticated (booking page needs it)
- All other tables: SELECT changed to TO authenticated only
- Write policies (INSERT/UPDATE/DELETE) were already authenticated-only from
  the prior migration and remain unchanged
*/

-- jobs
DROP POLICY IF EXISTS "anon_select_jobs" ON jobs;
CREATE POLICY "auth_select_jobs" ON jobs FOR SELECT TO authenticated USING (true);

-- invoices
DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT TO authenticated USING (true);

-- checklists
DROP POLICY IF EXISTS "anon_select_checklists" ON checklists;
CREATE POLICY "auth_select_checklists" ON checklists FOR SELECT TO authenticated USING (true);

-- schedules
DROP POLICY IF EXISTS "anon_select_schedules" ON schedules;
CREATE POLICY "auth_select_schedules" ON schedules FOR SELECT TO authenticated USING (true);

-- campaigns
DROP POLICY IF EXISTS "anon_select_campaigns" ON campaigns;
CREATE POLICY "auth_select_campaigns" ON campaigns FOR SELECT TO authenticated USING (true);

-- csr_tickets
DROP POLICY IF EXISTS "anon_select_csr_tickets" ON csr_tickets;
CREATE POLICY "auth_select_csr_tickets" ON csr_tickets FOR SELECT TO authenticated USING (true);

-- job_photos
DROP POLICY IF EXISTS "anon_select_job_photos" ON job_photos;
CREATE POLICY "auth_select_job_photos" ON job_photos FOR SELECT TO authenticated USING (true);

-- customers
DROP POLICY IF EXISTS "anon_select_customers" ON customers;
CREATE POLICY "auth_select_customers" ON customers FOR SELECT TO authenticated USING (true);

-- technicians
DROP POLICY IF EXISTS "anon_select_technicians" ON technicians;
CREATE POLICY "auth_select_technicians" ON technicians FOR SELECT TO authenticated USING (true);

-- estimates
DROP POLICY IF EXISTS "anon_select_estimates" ON estimates;
CREATE POLICY "auth_select_estimates" ON estimates FOR SELECT TO authenticated USING (true);

-- estimate_line_items
DROP POLICY IF EXISTS "anon_select_estimate_line_items" ON estimate_line_items;
CREATE POLICY "auth_select_estimate_line_items" ON estimate_line_items FOR SELECT TO authenticated USING (true);

-- time_entries
DROP POLICY IF EXISTS "anon_select_time_entries" ON time_entries;
CREATE POLICY "auth_select_time_entries" ON time_entries FOR SELECT TO authenticated USING (true);

-- review_requests
DROP POLICY IF EXISTS "anon_select_review_requests" ON review_requests;
CREATE POLICY "auth_select_review_requests" ON review_requests FOR SELECT TO authenticated USING (true);

-- notifications
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "auth_select_notifications" ON notifications FOR SELECT TO authenticated USING (true);

-- payments
DROP POLICY IF EXISTS "anon_select_payments" ON payments;
CREATE POLICY "auth_select_payments" ON payments FOR SELECT TO authenticated USING (true);